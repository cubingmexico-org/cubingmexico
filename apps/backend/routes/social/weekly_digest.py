"""SEMANA caption/image/slides/publish/mark routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.calendar_mx import is_weekly_digest_due, parse_iso_week_key
from social.poster import (
    POST_TYPE_WEEKLY_DIGEST,
    generate_weekly_digest_png_for_week,
    generate_weekly_digest_slides_for_week,
    get_weekly_digest_captions,
    mark_typed_posted,
    plan_weekly_digest_slides_for_week,
    post_weekly_digest,
)


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


@social_bp.route("/social/weekly-digest/<week>/slides", methods=["GET"])
@require_cron_auth
def weekly_digest_slides(week: str):
    if parse_iso_week_key(week) is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400
    if not is_weekly_digest_due(week):
        return (
            jsonify({"success": False, "message": "Weekly digest not due yet"}),
            404,
        )

    planned = plan_weekly_digest_slides_for_week(week)
    if planned is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400

    slides, payload = planned
    if payload.get("is_empty") or not slides:
        return (
            jsonify({"success": False, "message": "Weekly digest empty"}),
            404,
        )

    return jsonify(
        {
            "success": True,
            "post_type": POST_TYPE_WEEKLY_DIGEST,
            "subject_key": week,
            "week": week,
            "count": len(slides),
            "slides": [{"index": i, "id": s["id"], "title": s["title"]} for i, s in enumerate(slides)],
        }
    )


@social_bp.route(
    "/social/weekly-digest/<week>/slides/<int:index>/image.png",
    methods=["GET"],
)
@require_cron_auth
def weekly_digest_slide_image(week: str, index: int):
    if parse_iso_week_key(week) is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400
    if not is_weekly_digest_due(week):
        return (
            jsonify({"success": False, "message": "Weekly digest not due yet"}),
            404,
        )
    if index < 0:
        return jsonify({"success": False, "message": "Invalid slide index"}), 400

    try:
        generated = generate_weekly_digest_slides_for_week(week)
    except Exception as e:
        log.exception("Failed to generate WEEKLY_DIGEST slides for %s: %s", week, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if generated is None:
        return jsonify({"success": False, "message": "Invalid week"}), 400

    slides, payload = generated
    if payload.get("is_empty") or not slides:
        return (
            jsonify({"success": False, "message": "Weekly digest empty"}),
            404,
        )
    if index >= len(slides):
        return jsonify({"success": False, "message": "Slide index out of range"}), 404

    slide = slides[index]
    filename = f"semana-{week}-{slide['id']}.png"
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
