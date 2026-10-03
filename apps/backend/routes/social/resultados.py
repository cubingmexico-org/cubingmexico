"""RESULTADOS caption/image/publish/mark routes."""

from __future__ import annotations

from flask import Response, jsonify, request

from common import log, require_cron_auth
from routes.social.blueprint import social_bp
from social.poster import (
    POST_TYPE_RESULTADOS,
    generate_competition_resultados_png,
    get_competition_resultados_captions,
    mark_competition_posted,
    post_competition_resultados,
)


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
