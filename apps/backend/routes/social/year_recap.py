"""AÑO caption/slides/publish/mark routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.poster import (
    POST_TYPE_YEAR_RECAP,
    generate_year_recap_slides_for_year,
    get_year_recap_captions,
    mark_typed_posted,
    parse_summary_unlock_year,
    plan_year_recap_slides_for_year,
    post_year_recap,
)


@social_bp.route("/social/year-recap/<year>/caption", methods=["GET"])
@require_cron_auth
def year_recap_caption(year: str):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400

    captions = get_year_recap_captions(parsed)
    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "post_type": POST_TYPE_YEAR_RECAP,
            "subject_key": str(parsed),
            "year": parsed,
        }
    )


@social_bp.route("/social/year-recap/<year>/slides", methods=["GET"])
@require_cron_auth
def year_recap_slides(year: str):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400

    slides, payload = plan_year_recap_slides_for_year(parsed)
    if payload.get("is_empty") or not slides:
        return jsonify({"success": False, "message": "Year recap empty"}), 404

    return jsonify(
        {
            "success": True,
            "post_type": POST_TYPE_YEAR_RECAP,
            "subject_key": str(parsed),
            "year": parsed,
            "count": len(slides),
            "slides": [{"index": i, "id": s["id"], "title": s["title"]} for i, s in enumerate(slides)],
        }
    )


@social_bp.route(
    "/social/year-recap/<year>/slides/<int:index>/image.png",
    methods=["GET"],
)
@require_cron_auth
def year_recap_slide_image(year: str, index: int):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400
    if index < 0:
        return jsonify({"success": False, "message": "Invalid slide index"}), 400

    try:
        slides, payload = generate_year_recap_slides_for_year(parsed)
    except Exception as e:
        log.exception("Failed to generate YEAR_RECAP slides for %s: %s", parsed, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if payload.get("is_empty") or not slides:
        return jsonify({"success": False, "message": "Year recap empty"}), 404
    if index >= len(slides):
        return jsonify({"success": False, "message": "Slide index out of range"}), 404

    slide = slides[index]
    filename = f"ano-{parsed}-{slide['id']}.png"
    return Response(
        slide["png"],
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Slide-Id": slide["id"],
            "X-Slide-Title": slide["title"],
            "X-Slide-Index": str(index),
            "X-Slide-Count": str(len(slides)),
        },
    )


@social_bp.route("/social/year-recap/<year>/publish", methods=["POST"])
@require_cron_auth
def publish_year_recap(year: str):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400

    try:
        result = post_year_recap(parsed)
    except Exception as e:
        log.exception("Manual YEAR_RECAP publish failed for %s: %s", parsed, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "year_recap_not_due" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "year_recap_empty" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/year-recap/<year>/mark", methods=["POST"])
@require_cron_auth
def mark_year_recap_posted(year: str):
    parsed = parse_summary_unlock_year(year)
    if parsed is None:
        return jsonify({"success": False, "message": "Invalid year"}), 400

    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_typed_posted(POST_TYPE_YEAR_RECAP, str(parsed), platforms)
    except Exception as e:
        log.exception("Mark YEAR_RECAP posted failed for %s: %s", parsed, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "year_recap_not_due" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404
    if "invalid_year" in result.get("errors", []):
        return jsonify({"success": False, **result}), 400

    return jsonify({"success": True, **result})
