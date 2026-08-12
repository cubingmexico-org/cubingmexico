"""Social media routes: temp IG media + typed post publish/download."""

from __future__ import annotations

from flask import Blueprint, Response, abort, jsonify, request

from common import log, require_cron_auth
from social.calendar_mx import (
    is_streaks_monthly_due,
    is_weekly_digest_due,
    parse_iso_week_key,
    parse_month_key,
)
from social.media_store import get_media
from social.poster import (
    POST_TYPE_RECORD,
    POST_TYPE_RESULTADOS,
    POST_TYPE_STREAKS_MONTHLY,
    POST_TYPE_SUMMARY_UNLOCK,
    POST_TYPE_UPCOMING,
    POST_TYPE_WEEKLY_DIGEST,
    generate_competition_resultados_png,
    generate_record_png_for_subject,
    generate_streaks_monthly_png_for_month,
    generate_summary_unlock_png_for_year,
    generate_upcoming_png_for_competition,
    generate_weekly_digest_png_for_week,
    get_competition_resultados_captions,
    get_record_captions,
    get_streaks_monthly_captions,
    get_summary_unlock_captions,
    get_upcoming_captions,
    get_weekly_digest_captions,
    is_summary_year_published,
    mark_competition_posted,
    mark_typed_posted,
    parse_summary_unlock_year,
    post_competition_resultados,
    post_record,
    post_streaks_monthly,
    post_summary_unlock,
    post_upcoming_competition,
    post_weekly_digest,
)

social_bp = Blueprint("social", __name__)


@social_bp.route("/social/media/<token>.jpg", methods=["GET"])
@social_bp.route("/social/media/<token>.jpeg", methods=["GET"])
@social_bp.route("/social/media/<token>.png", methods=["GET"])  # legacy extension
def serve_temp_media(token: str):
    media = get_media(token)
    if not media:
        abort(404)
    data, content_type = media
    ext = "jpg" if "jpeg" in (content_type or "") else "png"
    return Response(
        data,
        mimetype=content_type,
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f"inline; filename=social.{ext}",
        },
    )


# --- RESULTADOS (back-compat paths) --------------------------------------------


@social_bp.route("/social/resultados/<competition_id>/caption", methods=["GET"])
@require_cron_auth
def resultados_caption(competition_id: str):
    """Return Facebook/Instagram caption text for RESULTADOS posts."""
    try:
        captions = get_competition_resultados_captions(competition_id)
    except Exception as e:
        log.exception("Failed to build RESULTADOS caption for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if captions is None:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Competition not found or not in Mexico",
                }
            ),
            404,
        )

    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "competition_id": competition_id,
            "post_type": POST_TYPE_RESULTADOS,
            "subject_key": competition_id,
        }
    )


@social_bp.route("/social/resultados/<competition_id>/image.png", methods=["GET"])
@require_cron_auth
def resultados_image(competition_id: str):
    """Generate and return the RESULTADOS PNG for a Mexican competition."""
    try:
        generated = generate_competition_resultados_png(competition_id)
    except Exception as e:
        log.exception("Failed to generate RESULTADOS image for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if not generated:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Competition not found or not in Mexico",
                }
            ),
            404,
        )

    png, _comp = generated
    filename = f"resultados-{competition_id}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@social_bp.route("/social/resultados/<competition_id>/publish", methods=["POST"])
@require_cron_auth
def publish_resultados(competition_id: str):
    """Manually publish RESULTADOS to Facebook/Instagram (missing platforms only)."""
    try:
        result = post_competition_resultados(competition_id)
    except Exception as e:
        log.exception("Manual RESULTADOS publish failed for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "competition_not_found_or_not_mexico" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/resultados/<competition_id>/mark", methods=["POST"])
@require_cron_auth
def mark_resultados_posted(competition_id: str):
    """Record that RESULTADOS were published manually (no Meta API call)."""
    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_competition_posted(competition_id, platforms)
    except Exception as e:
        log.exception("Mark RESULTADOS posted failed for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "competition_not_found_or_not_mexico" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    return jsonify({"success": True, **result})


# --- RÉCORDS -------------------------------------------------------------------


@social_bp.route("/social/records/<path:subject_key>/caption", methods=["GET"])
@require_cron_auth
def record_caption(subject_key: str):
    try:
        captions = get_record_captions(subject_key)
    except Exception as e:
        log.exception("Failed to build RECORD caption for %s: %s", subject_key, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if captions is None:
        return jsonify({"success": False, "message": "Record not found"}), 404

    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "post_type": POST_TYPE_RECORD,
            "subject_key": subject_key,
        }
    )


@social_bp.route("/social/records/<path:subject_key>/image.png", methods=["GET"])
@require_cron_auth
def record_image(subject_key: str):
    try:
        generated = generate_record_png_for_subject(subject_key)
    except Exception as e:
        log.exception("Failed to generate RECORD image for %s: %s", subject_key, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if not generated:
        return jsonify({"success": False, "message": "Record not found"}), 404

    png, marker = generated
    safe_name = subject_key.replace(":", "-").replace("/", "-")
    filename = f"record-{safe_name}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@social_bp.route("/social/records/<path:subject_key>/publish", methods=["POST"])
@require_cron_auth
def publish_record(subject_key: str):
    try:
        result = post_record(subject_key)
    except Exception as e:
        log.exception("Manual RECORD publish failed for %s: %s", subject_key, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "record_not_found" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/records/<path:subject_key>/mark", methods=["POST"])
@require_cron_auth
def mark_record_posted(subject_key: str):
    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_typed_posted(POST_TYPE_RECORD, subject_key, platforms)
    except Exception as e:
        log.exception("Mark RECORD posted failed for %s: %s", subject_key, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "record_not_found" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    return jsonify({"success": True, **result})


# --- PRÓXIMAS ------------------------------------------------------------------


@social_bp.route("/social/upcoming/<competition_id>/caption", methods=["GET"])
@require_cron_auth
def upcoming_caption(competition_id: str):
    try:
        captions = get_upcoming_captions(competition_id)
    except Exception as e:
        log.exception("Failed to build UPCOMING caption for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if captions is None:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Competition not found or not in Mexico",
                }
            ),
            404,
        )

    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "competition_id": competition_id,
            "post_type": POST_TYPE_UPCOMING,
            "subject_key": competition_id,
        }
    )


@social_bp.route("/social/upcoming/<competition_id>/image.png", methods=["GET"])
@require_cron_auth
def upcoming_image(competition_id: str):
    try:
        generated = generate_upcoming_png_for_competition(competition_id)
    except Exception as e:
        log.exception("Failed to generate UPCOMING image for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if not generated:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Competition not found or not in Mexico",
                }
            ),
            404,
        )

    png, _comp = generated
    filename = f"proxima-{competition_id}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@social_bp.route("/social/upcoming/<competition_id>/publish", methods=["POST"])
@require_cron_auth
def publish_upcoming(competition_id: str):
    try:
        result = post_upcoming_competition(competition_id)
    except Exception as e:
        log.exception("Manual UPCOMING publish failed for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "competition_not_found_or_not_mexico" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/upcoming/<competition_id>/mark", methods=["POST"])
@require_cron_auth
def mark_upcoming_posted(competition_id: str):
    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_typed_posted(POST_TYPE_UPCOMING, competition_id, platforms)
    except Exception as e:
        log.exception("Mark UPCOMING posted failed for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "competition_not_found_or_not_mexico" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    return jsonify({"success": True, **result})


# --- RESUMEN ANUAL unlock -------------------------------------------------------


@social_bp.route("/social/summary-unlock/<year>/caption", methods=["GET"])
@require_cron_auth
def summary_unlock_caption(year: str):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400
    if not is_summary_year_published(parsed):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Summary year not unlocked yet",
                }
            ),
            404,
        )

    captions = get_summary_unlock_captions(parsed)
    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "post_type": POST_TYPE_SUMMARY_UNLOCK,
            "subject_key": str(parsed),
            "year": parsed,
        }
    )


@social_bp.route("/social/summary-unlock/<year>/image.png", methods=["GET"])
@require_cron_auth
def summary_unlock_image(year: str):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400
    if not is_summary_year_published(parsed):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Summary year not unlocked yet",
                }
            ),
            404,
        )

    try:
        png = generate_summary_unlock_png_for_year(parsed)
    except Exception as e:
        log.exception("Failed to generate SUMMARY_UNLOCK image for %s: %s", year, e)
        return jsonify({"success": False, "message": str(e)}), 500

    filename = f"resumen-{parsed}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@social_bp.route("/social/summary-unlock/<year>/publish", methods=["POST"])
@require_cron_auth
def publish_summary_unlock(year: str):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400

    try:
        result = post_summary_unlock(parsed)
    except Exception as e:
        log.exception("Manual SUMMARY_UNLOCK publish failed for %s: %s", year, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "summary_year_not_unlocked" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "invalid_year" in result.get("errors", []):
        return jsonify({"success": False, **result}), 400

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/summary-unlock/<year>/mark", methods=["POST"])
@require_cron_auth
def mark_summary_unlock_posted(year: str):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400

    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_typed_posted(
            POST_TYPE_SUMMARY_UNLOCK, str(parsed), platforms
        )
    except Exception as e:
        log.exception("Mark SUMMARY_UNLOCK posted failed for %s: %s", year, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "summary_year_not_unlocked" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "invalid_year" in result.get("errors", []):
        return jsonify({"success": False, **result}), 400

    return jsonify({"success": True, **result})


# --- SEMANA (weekly digest) -----------------------------------------------------


@social_bp.route("/social/weekly-digest/<week>/caption", methods=["GET"])
@require_cron_auth
def weekly_digest_caption(week: str):
    if parse_iso_week_key(week) is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400
    if not is_weekly_digest_due(week):
        return (
            jsonify({"success": False, "message": "Weekly digest not due yet"}),
            404,
        )

    captions = get_weekly_digest_captions(week)
    if captions is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400

    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "post_type": POST_TYPE_WEEKLY_DIGEST,
            "subject_key": week,
            "week": week,
        }
    )


@social_bp.route("/social/weekly-digest/<week>/image.png", methods=["GET"])
@require_cron_auth
def weekly_digest_image(week: str):
    if parse_iso_week_key(week) is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400
    if not is_weekly_digest_due(week):
        return (
            jsonify({"success": False, "message": "Weekly digest not due yet"}),
            404,
        )

    try:
        generated = generate_weekly_digest_png_for_week(week)
    except Exception as e:
        log.exception("Failed to generate WEEKLY_DIGEST image for %s: %s", week, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if generated is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400

    png, _payload = generated
    filename = f"semana-{week}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@social_bp.route("/social/weekly-digest/<week>/publish", methods=["POST"])
@require_cron_auth
def publish_weekly_digest(week: str):
    if parse_iso_week_key(week) is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400

    try:
        result = post_weekly_digest(week)
    except Exception as e:
        log.exception("Manual WEEKLY_DIGEST publish failed for %s: %s", week, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "weekly_digest_not_due" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "invalid_week" in result.get("errors", []):
        return jsonify({"success": False, **result}), 400
    if "weekly_digest_empty" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/weekly-digest/<week>/mark", methods=["POST"])
@require_cron_auth
def mark_weekly_digest_posted(week: str):
    if parse_iso_week_key(week) is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400

    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_typed_posted(POST_TYPE_WEEKLY_DIGEST, week, platforms)
    except Exception as e:
        log.exception("Mark WEEKLY_DIGEST posted failed for %s: %s", week, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "weekly_digest_not_due" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "invalid_week" in result.get("errors", []):
        return jsonify({"success": False, **result}), 400

    return jsonify({"success": True, **result})


# --- RACHAS (monthly streaks) ---------------------------------------------------


@social_bp.route("/social/streaks-monthly/<month>/caption", methods=["GET"])
@require_cron_auth
def streaks_monthly_caption(month: str):
    if parse_month_key(month) is None:
        return jsonify({"success": False, "message": "Invalid month"}), 400
    if not is_streaks_monthly_due(month):
        return (
            jsonify({"success": False, "message": "Monthly streaks not due yet"}),
            404,
        )

    captions = get_streaks_monthly_captions(month)
    if captions is None:
        return jsonify({"success": False, "message": "Invalid month"}), 400

    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "post_type": POST_TYPE_STREAKS_MONTHLY,
            "subject_key": month,
            "month": month,
        }
    )


@social_bp.route("/social/streaks-monthly/<month>/image.png", methods=["GET"])
@require_cron_auth
def streaks_monthly_image(month: str):
    if parse_month_key(month) is None:
        return jsonify({"success": False, "message": "Invalid month"}), 400
    if not is_streaks_monthly_due(month):
        return (
            jsonify({"success": False, "message": "Monthly streaks not due yet"}),
            404,
        )

    try:
        generated = generate_streaks_monthly_png_for_month(month)
    except Exception as e:
        log.exception(
            "Failed to generate STREAKS_MONTHLY image for %s: %s", month, e
        )
        return jsonify({"success": False, "message": str(e)}), 500

    if generated is None:
        return jsonify({"success": False, "message": "Invalid month"}), 400

    png, _payload = generated
    filename = f"rachas-{month}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@social_bp.route("/social/streaks-monthly/<month>/publish", methods=["POST"])
@require_cron_auth
def publish_streaks_monthly(month: str):
    if parse_month_key(month) is None:
        return jsonify({"success": False, "message": "Invalid month"}), 400

    try:
        result = post_streaks_monthly(month)
    except Exception as e:
        log.exception("Manual STREAKS_MONTHLY publish failed for %s: %s", month, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "streaks_monthly_not_due" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "invalid_month" in result.get("errors", []):
        return jsonify({"success": False, **result}), 400
    if "streaks_monthly_empty" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/streaks-monthly/<month>/mark", methods=["POST"])
@require_cron_auth
def mark_streaks_monthly_posted(month: str):
    if parse_month_key(month) is None:
        return jsonify({"success": False, "message": "Invalid month"}), 400

    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_typed_posted(POST_TYPE_STREAKS_MONTHLY, month, platforms)
    except Exception as e:
        log.exception("Mark STREAKS_MONTHLY posted failed for %s: %s", month, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "streaks_monthly_not_due" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "invalid_month" in result.get("errors", []):
        return jsonify({"success": False, **result}), 400

    return jsonify({"success": True, **result})
