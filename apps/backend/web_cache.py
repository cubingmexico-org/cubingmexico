"""Revalidates the web app's cache tags after data jobs; the backend can't reach the Next cache directly."""

import requests

from common import CRON_SECRET, WEB_URL, log

# Must match REVALIDATABLE_TAGS in apps/web/app/api/revalidate/route.ts.
UPDATE_ALL_TAGS = ["cc-results", "data-source-dates"]


def revalidate_web_tags(tags: list[str]) -> None:
    """Best effort: a failure is logged, never raised, since the data job itself succeeded."""
    if not WEB_URL:
        log.info("WEB_URL not set; skipping web cache revalidation")
        return
    try:
        response = requests.post(
            f"{WEB_URL}/api/revalidate",
            json={"tags": tags},
            headers={"Authorization": f"Bearer {CRON_SECRET}"},
            timeout=30,
        )
        response.raise_for_status()
        log.info("Revalidated web cache tags %s", tags)
    except requests.RequestException as e:
        log.warning("Could not revalidate web cache tags %s: %s", tags, e)
