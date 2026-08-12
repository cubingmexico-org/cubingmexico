"""Meta Graph API client for Facebook Page + Instagram publishing."""

from __future__ import annotations

import time

import requests

from common import log

GRAPH_API_VERSION = "v21.0"
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class MetaApiError(RuntimeError):
    def __init__(self, message: str, *, response: requests.Response | None = None):
        super().__init__(message)
        self.response = response


def _raise_for_meta(resp: requests.Response, action: str) -> dict:
    try:
        payload = resp.json()
    except ValueError:
        payload = {"raw": resp.text}

    if resp.status_code >= 400 or "error" in payload:
        err = payload.get("error") if isinstance(payload, dict) else payload
        raise MetaApiError(f"Meta {action} failed: {err}", response=resp)
    return payload


def post_facebook_photo(
    *,
    page_id: str,
    access_token: str,
    image_bytes: bytes,
    caption: str,
    timeout: int = 60,
) -> str:
    """Upload a photo to a Facebook Page. Returns the photo/post id."""
    url = f"{GRAPH_BASE}/{page_id}/photos"
    files = {"source": ("resultados.png", image_bytes, "image/png")}
    data = {
        "caption": caption,
        "access_token": access_token,
        "published": "true",
    }
    resp = requests.post(url, data=data, files=files, timeout=timeout)
    payload = _raise_for_meta(resp, "facebook photo upload")
    post_id = payload.get("post_id") or payload.get("id")
    if not post_id:
        raise MetaApiError(f"Meta facebook photo upload returned no id: {payload}")
    return str(post_id)


def _wait_for_ig_container(
    *,
    creation_id: str,
    access_token: str,
    timeout_seconds: int = 90,
) -> None:
    """Poll IG container until FINISHED (or raise on ERROR / timeout)."""
    url = f"{GRAPH_BASE}/{creation_id}"
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        resp = requests.get(
            url,
            params={"fields": "status_code,status", "access_token": access_token},
            timeout=30,
        )
        payload = _raise_for_meta(resp, "instagram container status")
        status = (payload.get("status_code") or "").upper()
        if status == "FINISHED":
            return
        if status == "ERROR":
            raise MetaApiError(f"Instagram container error: {payload}")
        time.sleep(2)
    raise MetaApiError(f"Instagram container {creation_id} did not finish in time")


def post_instagram_image(
    *,
    ig_user_id: str,
    access_token: str,
    image_url: str,
    caption: str,
    timeout: int = 60,
) -> str:
    """Create + publish an Instagram feed image. Returns the media id."""
    create_url = f"{GRAPH_BASE}/{ig_user_id}/media"
    create_resp = requests.post(
        create_url,
        data={
            "image_url": image_url,
            "caption": caption,
            "access_token": access_token,
        },
        timeout=timeout,
    )
    create_payload = _raise_for_meta(create_resp, "instagram media create")
    creation_id = create_payload.get("id")
    if not creation_id:
        raise MetaApiError(f"Meta instagram media create returned no id: {create_payload}")

    _wait_for_ig_container(creation_id=creation_id, access_token=access_token)

    publish_url = f"{GRAPH_BASE}/{ig_user_id}/media_publish"
    publish_resp = requests.post(
        publish_url,
        data={
            "creation_id": creation_id,
            "access_token": access_token,
        },
        timeout=timeout,
    )
    publish_payload = _raise_for_meta(publish_resp, "instagram media publish")
    media_id = publish_payload.get("id")
    if not media_id:
        raise MetaApiError(f"Meta instagram media publish returned no id: {publish_payload}")
    log.info("Published Instagram media %s for container %s", media_id, creation_id)
    return str(media_id)
