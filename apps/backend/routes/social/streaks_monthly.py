"""RACHAS caption/image/publish/mark routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.calendar_mx import is_streaks_monthly_due, parse_month_key
from social.poster import (
    POST_TYPE_STREAKS_MONTHLY,
    generate_streaks_monthly_png_for_month,
    get_streaks_monthly_captions,
    mark_typed_posted,
    post_streaks_monthly,
)


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
        log.exception("Failed to generate STREAKS_MONTHLY image for %s: %s", month, e)
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
