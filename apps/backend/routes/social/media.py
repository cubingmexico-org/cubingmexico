"""Temporary media served to Instagram (image_url fetches)."""

from __future__ import annotations

from flask import Response, abort

from routes.social.blueprint import social_bp
from social.media_store import get_media


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
            "Content-Disposition": f"inline; filename=social.{ext}",
        },
    )
