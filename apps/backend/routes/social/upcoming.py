"""PRÓXIMAS caption/image/publish/mark routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.poster import (
    POST_TYPE_UPCOMING,
    generate_upcoming_png_for_competition,
    get_upcoming_captions,
    mark_typed_posted,
    post_upcoming_competition,
)


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
