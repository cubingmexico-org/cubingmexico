"""NÉMESIS caption/image/publish/mark/seed routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.poster import (
    POST_TYPE_NEMESIS,
    generate_nemesis_png_for_subject,
    get_nemesis_captions,
    mark_typed_posted,
    post_nemesis,
    seed_nemesis_posted,
)


@social_bp.route("/social/nemesis/<wca_id>/caption", methods=["GET"])
@require_cron_auth
def nemesis_caption(wca_id: str):
    try:
        captions = get_nemesis_captions(wca_id)
    except Exception as e:
        log.exception("Failed to build NÉMESIS caption for %s: %s", wca_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if captions is None:
        return jsonify({"success": False, "message": "Nemesis-free competitor not found"}), 404

    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "post_type": POST_TYPE_NEMESIS,
            "subject_key": wca_id,
        }
    )


@social_bp.route("/social/nemesis/<wca_id>/image.png", methods=["GET"])
@require_cron_auth
def nemesis_image(wca_id: str):
    try:
        generated = generate_nemesis_png_for_subject(wca_id)
    except Exception as e:
        log.exception("Failed to generate NÉMESIS image for %s: %s", wca_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if not generated:
        return jsonify({"success": False, "message": "Nemesis-free competitor not found"}), 404

    png, _details = generated
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="nemesis-{wca_id}.png"',
        },
    )


@social_bp.route("/social/nemesis/<wca_id>/publish", methods=["POST"])
@require_cron_auth
def publish_nemesis(wca_id: str):
    try:
        result = post_nemesis(wca_id)
    except Exception as e:
        log.exception("Manual NÉMESIS publish failed for %s: %s", wca_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "nemesis_free_not_found" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/nemesis/<wca_id>/mark", methods=["POST"])
@require_cron_auth
def mark_nemesis_posted(wca_id: str):
    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_typed_posted(POST_TYPE_NEMESIS, wca_id, platforms)
    except Exception as e:
        log.exception("Mark NÉMESIS posted failed for %s: %s", wca_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "nemesis_free_not_found" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    return jsonify({"success": True, **result})


@social_bp.route("/social/nemesis/seed", methods=["POST"])
@require_cron_auth
def seed_nemesis():
    """One-time: mark all current nemesis-free competitors as posted."""
    try:
        result = seed_nemesis_posted()
    except Exception as e:
        log.exception("NÉMESIS seed failed: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500

    return jsonify({"success": True, **result})
