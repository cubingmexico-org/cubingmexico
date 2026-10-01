"""RESUMEN ANUAL unlock caption/image/publish/mark routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.poster import (
    POST_TYPE_SUMMARY_UNLOCK,
    generate_summary_unlock_png_for_year,
    get_summary_unlock_captions,
    is_summary_year_published,
    mark_typed_posted,
    parse_summary_unlock_year,
    post_summary_unlock,
)


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
        result = mark_typed_posted(POST_TYPE_SUMMARY_UNLOCK, str(parsed), platforms)
    except Exception as e:
        log.exception("Mark SUMMARY_UNLOCK posted failed for %s: %s", year, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "summary_year_not_unlocked" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "invalid_year" in result.get("errors", []):
        return jsonify({"success": False, **result}), 400

    return jsonify({"success": True, **result})
