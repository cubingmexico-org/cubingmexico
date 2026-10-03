"""MOLLERZ caption/image/publish/mark/seed routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.poster import (
    POST_TYPE_MOLLERZ,
    generate_mollerz_png_for_subject,
    get_mollerz_captions,
    mark_typed_posted,
    post_mollerz,
    seed_mollerz_posted,
)


@social_bp.route("/social/mollerz/<path:subject_key>/caption", methods=["GET"])
@require_cron_auth
def mollerz_caption(subject_key: str):
    try:
        captions = get_mollerz_captions(subject_key)
    except Exception as e:
        log.exception("Failed to build MOLLERZ caption for %s: %s", subject_key, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if captions is None:
        return jsonify({"success": False, "message": "Mollerz member not found"}), 404

    return jsonify(
        {
            "success": True,
            "caption": captions["facebook"],
            "facebook_caption": captions["facebook"],
            "instagram_caption": captions["instagram"],
            "post_type": POST_TYPE_MOLLERZ,
            "subject_key": subject_key,
        }
    )


@social_bp.route("/social/mollerz/<path:subject_key>/image.png", methods=["GET"])
@require_cron_auth
def mollerz_image(subject_key: str):
    try:
        generated = generate_mollerz_png_for_subject(subject_key)
    except Exception as e:
        log.exception("Failed to generate MOLLERZ image for %s: %s", subject_key, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if not generated:
        return jsonify({"success": False, "message": "Mollerz member not found"}), 404

    png, _details = generated
    safe_name = subject_key.replace(":", "-").replace("/", "-")
    filename = f"mollerz-{safe_name}.png"
    return Response(
        png,
        mimetype="image/png",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@social_bp.route("/social/mollerz/<path:subject_key>/publish", methods=["POST"])
@require_cron_auth
def publish_mollerz(subject_key: str):
    try:
        result = post_mollerz(subject_key)
    except Exception as e:
        log.exception("Manual MOLLERZ publish failed for %s: %s", subject_key, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "mollerz_member_not_found" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    success = not result.get("errors")
    return jsonify({"success": success, **result}), (200 if success else 502)


@social_bp.route("/social/mollerz/<path:subject_key>/mark", methods=["POST"])
@require_cron_auth
def mark_mollerz_posted(subject_key: str):
    platforms = None
    if request.is_json and isinstance(request.json, dict):
        platforms = request.json.get("platforms")

    try:
        result = mark_typed_posted(POST_TYPE_MOLLERZ, subject_key, platforms)
    except Exception as e:
        log.exception("Mark MOLLERZ posted failed for %s: %s", subject_key, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if "mollerz_member_not_found" in result.get("errors", []):
        return jsonify({"success": False, **result}), 404

    return jsonify({"success": True, **result})


@social_bp.route("/social/mollerz/seed", methods=["POST"])
@require_cron_auth
def seed_mollerz():
    """One-time: mark all current members' tiers as posted so only future changes post."""
    try:
        result = seed_mollerz_posted()
    except Exception as e:
        log.exception("MOLLERZ seed failed: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500

    return jsonify({"success": True, **result})
