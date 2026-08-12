"""Social media routes: temp IG media + admin RESULTADOS publish/download."""

from __future__ import annotations

import psycopg2.extras
from flask import Blueprint, Response, abort, jsonify, request

from common import get_connection, log, require_cron_auth
from social.media_store import get_media
from social.poster import (
    build_resultados_caption,
    generate_competition_resultados_png,
    get_competition_resultados_caption,
    mark_competition_posted,
    post_competition_resultados,
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
            "Content-Disposition": f"inline; filename=resultados.{ext}",
        },
    )


@social_bp.route("/social/resultados/<competition_id>/caption", methods=["GET"])
@require_cron_auth
def resultados_caption(competition_id: str):
    """Return the caption text used when publishing RESULTADOS."""
    try:
        caption = get_competition_resultados_caption(competition_id)
    except Exception as e:
        log.exception("Failed to build RESULTADOS caption for %s: %s", competition_id, e)
        return jsonify({"success": False, "message": str(e)}), 500

    if caption is None:
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
            "caption": caption,
            "competition_id": competition_id,
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
            # Latin-1 safe header for clients that want the matching post text.
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
