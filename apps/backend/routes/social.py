"""Social media routes: temp IG media + typed post publish/download."""

from __future__ import annotations

from flask import Blueprint, Response, abort, jsonify, request

from common import log, require_cron_auth
from social.media_store import get_media
from social.poster import (
    POST_TYPE_RECORD,
    POST_TYPE_RESULTADOS,
    POST_TYPE_SUMMARY_UNLOCK,
    POST_TYPE_UPCOMING,
    build_resultados_caption,
    build_summary_unlock_caption,
    generate_competition_resultados_png,
    generate_record_png_for_subject,
    generate_summary_unlock_png_for_year,
    generate_upcoming_png_for_competition,
    get_competition_resultados_captions,
    get_record_captions,
    get_summary_unlock_captions,
    get_upcoming_captions,
    is_summary_year_published,
    mark_competition_posted,
    mark_typed_posted,
    parse_summary_unlock_year,
    post_competition_resultados,
    post_record,
    post_summary_unlock,
    post_upcoming_competition,
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

    png, comp = generated
    caption = build_resultados_caption(
        competition_name=comp["name"],
        competition_id=comp["id"],
    )
    filename = f"resultados-{competition_id}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Resultados-Caption": caption.replace("\n", "\\n"),
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
    captions = get_upcoming_captions(competition_id) or {}
    caption = captions.get("facebook") or ""
    filename = f"proxima-{competition_id}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Upcoming-Caption": caption.replace("\n", "\\n"),
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

    caption = build_summary_unlock_caption(year=parsed)
    filename = f"resumen-{parsed}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Summary-Unlock-Caption": caption.replace("\n", "\\n"),
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
