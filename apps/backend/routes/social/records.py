"""RÉCORDS caption/image/publish/mark routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.poster import (
    POST_TYPE_RECORD,
    generate_record_png_for_subject,
    get_record_captions,
    mark_typed_posted,
    post_record,
)


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
