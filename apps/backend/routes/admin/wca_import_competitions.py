"""WCA export import: competitions, their Mexican organizers and delegates, and championships."""

# pandas-stubs types boolean masks and Series arithmetic more strictly than the runtime behavior used here.
# pyright: reportArgumentType=warning, reportGeneralTypeIssues=warning

import io
import re
from datetime import datetime

import pandas as pd
import psycopg2

from common import get_connection, log
from utils import extract_first_image_url, get_state_from_coordinates

WCA_STAFF_PATTERN = re.compile(r"\{([^}]+)\}\{mailto:([^}]+)\}")


def parse_wca_staff(raw):
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return []
    return [(match.group(1), match.group(2)) for match in WCA_STAFF_PATTERN.finditer(str(raw))]


def sync_mexican_competition_staff(cur, competition_id, organizers_raw, delegates_raw, organizer_ids, delegate_ids):
    """Upsert staff from the WCA export and drop competition links no longer listed."""
    desired_organizer_ids = []
    for organizer_name, organizer_email in parse_wca_staff(organizers_raw):
        desired_organizer_ids.append(organizer_email)
        if organizer_email not in organizer_ids:
            cur.execute(
                "SELECT wca_id FROM persons WHERE name = %s",
                (organizer_name,),
            )
            person_res = cur.fetchone()
            person_id = person_res.wca_id if person_res else None
            cur.execute(
                """
                INSERT INTO organizers (id, person_id, status)
                VALUES (%(id)s, %(person_id)s, 'active')
                ON CONFLICT DO NOTHING
                """,
                {"id": organizer_email, "person_id": person_id},
            )
            organizer_ids.add(organizer_email)
        cur.execute(
            """
            INSERT INTO competition_organizers (competition_id, organizer_id)
            VALUES (%(competition_id)s, %(organizer_id)s)
            ON CONFLICT DO NOTHING
            """,
            {
                "competition_id": competition_id,
                "organizer_id": organizer_email,
            },
        )

    if desired_organizer_ids:
        cur.execute(
            """
            DELETE FROM competition_organizers
            WHERE competition_id = %(competition_id)s
              AND organizer_id <> ALL(%(organizer_ids)s)
            """,
            {
                "competition_id": competition_id,
                "organizer_ids": desired_organizer_ids,
            },
        )
    else:
        cur.execute(
            "DELETE FROM competition_organizers WHERE competition_id = %s",
            (competition_id,),
        )

    desired_delegate_ids = []
    for delegate_name, delegate_email in parse_wca_staff(delegates_raw):
        desired_delegate_ids.append(delegate_email)
        if delegate_email not in delegate_ids:
            cur.execute(
                "SELECT wca_id FROM persons WHERE name = %s",
                (delegate_name,),
            )
            person_res = cur.fetchone()
            person_id = person_res.wca_id if person_res else None
            if person_id:
                cur.execute(
                    """
                    INSERT INTO delegates (id, person_id, status)
                    VALUES (%(id)s, %(person_id)s, 'active')
                    ON CONFLICT DO NOTHING
                    """,
                    {"id": delegate_email, "person_id": person_id},
                )
                delegate_ids.add(delegate_email)
        if delegate_email in delegate_ids:
            cur.execute(
                """
                INSERT INTO competition_delegates (competition_id, delegate_id)
                VALUES (%(competition_id)s, %(delegate_id)s)
                ON CONFLICT DO NOTHING
                """,
                {
                    "competition_id": competition_id,
                    "delegate_id": delegate_email,
                },
            )

    if desired_delegate_ids:
        cur.execute(
            """
            DELETE FROM competition_delegates
            WHERE competition_id = %(competition_id)s
              AND delegate_id <> ALL(%(delegate_ids)s)
            """,
            {
                "competition_id": competition_id,
                "delegate_ids": desired_delegate_ids,
            },
        )
    else:
        cur.execute(
            "DELETE FROM competition_delegates WHERE competition_id = %s",
            (competition_id,),
        )


def import_competitions(z, file_name):
    """Insert new competitions (and Mexican events/staff), then announce new MX comps."""
    log.info("Processing file: %s", file_name)
    file_content = z.read(file_name).decode("utf-8")
    cleaned_content = file_content.replace('"', "")
    df = pd.read_csv(io.StringIO(cleaned_content), delimiter="\t", na_values=["NULL"])
    competitions = df.to_dict(orient="records")
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            cur.execute("SELECT id, name FROM states")
            states = cur.fetchall()

            cur.execute("SELECT id FROM delegates")
            delegate_ids = {row.id for row in cur.fetchall()}

            cur.execute("SELECT id FROM organizers")
            organizer_ids = {row.id for row in cur.fetchall()}

            cur.execute("SELECT id FROM competitions")
            existing = cur.fetchall()
            existing_ids = {row.id for row in existing}
            newly_inserted_mx_ids: list[str] = []

            for row in competitions:
                if row["id"] in existing_ids:
                    continue
                state_id = None
                if row["country_id"] == "Mexico":
                    newly_inserted_mx_ids.append(row["id"])
                    state_name = get_state_from_coordinates(
                        row["latitude_microdegrees"] / 1000000,
                        row["longitude_microdegrees"] / 1000000,
                    )
                    if state_name:
                        for s in states:
                            if s.name == state_name:
                                state_id = s.id
                                break
                start_date = datetime(row["year"], row["month"], row["day"])
                end_date = datetime(row["year"], row["end_month"], row["end_day"])
                logo = extract_first_image_url(row.get("information"))
                cur.execute(
                    """
                    INSERT INTO competitions
                    (id, name, city_name, country_id, information, start_date, end_date, cancelled,
                     venue, venue_address, venue_details, external_website, cell_name,
                     latitude_microdegrees, longitude_microdegrees, state_id, logo)
                    VALUES (%(id)s, %(name)s, %(city_name)s, %(country_id)s, %(information)s,
                            %(start_date)s, %(end_date)s, %(cancelled)s, %(venue)s,
                            %(venue_address)s, %(venue_details)s, %(external_website)s,
                            %(cell_name)s, %(latitude_microdegrees)s, %(longitude_microdegrees)s,
                            %(state_id)s, %(logo)s)
                    ON CONFLICT DO NOTHING
                    """,
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "city_name": row["city_name"],
                        "country_id": row["country_id"],
                        "information": row["information"],
                        "start_date": start_date,
                        "end_date": end_date,
                        "cancelled": bool(row["cancelled"]),
                        "venue": row["venue"],
                        "venue_address": row["venue_address"],
                        "venue_details": row["venue_details"],
                        "external_website": row["external_website"],
                        "cell_name": row["cell_name"],
                        "latitude_microdegrees": row["latitude_microdegrees"],
                        "longitude_microdegrees": row["longitude_microdegrees"],
                        "state_id": state_id,
                        "logo": logo,
                    },
                )
                if row["country_id"] == "Mexico":
                    for event_spec in str(row["event_specs"]).split():
                        cur.execute(
                            """
                            INSERT INTO competition_events (competition_id, event_id)
                            VALUES (%(competition_id)s, %(event_id)s)
                            ON CONFLICT DO NOTHING
                            """,
                            {
                                "competition_id": row["id"],
                                "event_id": event_spec,
                            },
                        )

                    sync_mexican_competition_staff(
                        cur,
                        row["id"],
                        row.get("organizers"),
                        row.get("delegates"),
                        organizer_ids,
                        delegate_ids,
                    )

    if newly_inserted_mx_ids:
        try:
            from social.poster import post_new_upcoming_competitions

            post_new_upcoming_competitions(newly_inserted_mx_ids)
        except Exception as e:
            log.exception(
                "Social PRÓXIMAS posting failed (competitions import succeeded): %s",
                e,
            )


def import_championships(z, file_name):
    log.info("Processing file: %s", file_name)
    file_content = z.read(file_name).decode("utf-8")
    cleaned_content = file_content.replace('"', "")
    df = pd.read_csv(io.StringIO(cleaned_content), delimiter="\t", skip_blank_lines=True, na_values=["NULL"])
    championships = df.to_dict(orient="records")
    with get_connection() as conn:
        with conn.cursor() as cur:
            for row in championships:
                cur.execute(
                    """
                    INSERT INTO championships (id, competition_id, championship_type)
                    VALUES (%(id)s, %(competition_id)s, %(championship_type)s)
                    ON CONFLICT DO NOTHING
                    """,
                    {
                        "id": row["id"],
                        "competition_id": row["competition_id"],
                        "championship_type": row["championship_type"],
                    },
                )
