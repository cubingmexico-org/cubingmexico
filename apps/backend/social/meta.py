"""Meta Graph API client for Facebook Page + Instagram publishing."""

from __future__ import annotations

import json
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


def upload_facebook_unpublished_photo(
    *,
    page_id: str,
    access_token: str,
    image_bytes: bytes,
    timeout: int = 60,
) -> str:
    """Upload a photo unpublished for use in a multi-photo feed post."""
    url = f"{GRAPH_BASE}/{page_id}/photos"
    files = {"source": ("slide.png", image_bytes, "image/png")}
    data = {
        "access_token": access_token,
        "published": "false",
    }
    resp = requests.post(url, data=data, files=files, timeout=timeout)
    payload = _raise_for_meta(resp, "facebook unpublished photo upload")
    photo_id = payload.get("id")
    if not photo_id:
        raise MetaApiError(
            f"Meta facebook unpublished photo upload returned no id: {payload}"
        )
    return str(photo_id)


def post_facebook_multi_photo(
    *,
    page_id: str,
    access_token: str,
    image_bytes_list: list[bytes],
    caption: str,
    timeout: int = 60,
) -> str:
    """Upload N unpublished photos and publish them as one Page feed post."""
    if not image_bytes_list:
        raise MetaApiError("Facebook multi-photo requires at least one image")
    if len(image_bytes_list) == 1:
        return post_facebook_photo(
            page_id=page_id,
            access_token=access_token,
            image_bytes=image_bytes_list[0],
            caption=caption,
            timeout=timeout,
        )

    media_ids = [
        upload_facebook_unpublished_photo(
            page_id=page_id,
            access_token=access_token,
            image_bytes=image_bytes,
            timeout=timeout,
        )
        for image_bytes in image_bytes_list
    ]

    url = f"{GRAPH_BASE}/{page_id}/feed"
    attached = [{"media_fbid": mid} for mid in media_ids]
    data = {
        "message": caption,
        "attached_media": json.dumps(attached),
        "access_token": access_token,
    }
    resp = requests.post(url, data=data, timeout=timeout)
    payload = _raise_for_meta(resp, "facebook multi-photo feed")
    post_id = payload.get("id")
    if not post_id:
        raise MetaApiError(f"Meta facebook multi-photo feed returned no id: {payload}")
    log.info(
        "Published Facebook multi-photo post %s (%s images)",
        post_id,
        len(media_ids),
    )
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


def post_instagram_carousel(
    *,
    ig_user_id: str,
    access_token: str,
    image_urls: list[str],
    caption: str,
    timeout: int = 60,
) -> str:
    """Create + publish an Instagram carousel. Returns the parent media id."""
    if not image_urls:
        raise MetaApiError("Instagram carousel requires at least one image_url")
    if len(image_urls) == 1:
        return post_instagram_image(
            ig_user_id=ig_user_id,
            access_token=access_token,
            image_url=image_urls[0],
            caption=caption,
            timeout=timeout,
        )

    create_url = f"{GRAPH_BASE}/{ig_user_id}/media"
    child_ids: list[str] = []
    for image_url in image_urls:
        create_resp = requests.post(
            create_url,
            data={
                "image_url": image_url,
                "is_carousel_item": "true",
                "access_token": access_token,
            },
            timeout=timeout,
        )
        create_payload = _raise_for_meta(create_resp, "instagram carousel item create")
        child_id = create_payload.get("id")
        if not child_id:
            raise MetaApiError(
                f"Meta instagram carousel item create returned no id: {create_payload}"
            )
        child_ids.append(str(child_id))
        _wait_for_ig_container(creation_id=str(child_id), access_token=access_token)

    parent_resp = requests.post(
        create_url,
        data={
            "media_type": "CAROUSEL",
            "children": ",".join(child_ids),
            "caption": caption,
            "access_token": access_token,
        },
        timeout=timeout,
    )
    parent_payload = _raise_for_meta(parent_resp, "instagram carousel create")
    parent_id = parent_payload.get("id")
    if not parent_id:
        raise MetaApiError(
            f"Meta instagram carousel create returned no id: {parent_payload}"
        )

    _wait_for_ig_container(creation_id=str(parent_id), access_token=access_token)

    publish_url = f"{GRAPH_BASE}/{ig_user_id}/media_publish"
    publish_resp = requests.post(
        publish_url,
        data={
            "creation_id": parent_id,
            "access_token": access_token,
        },
        timeout=timeout,
    )
    publish_payload = _raise_for_meta(publish_resp, "instagram carousel publish")
    media_id = publish_payload.get("id")
    if not media_id:
        raise MetaApiError(
            f"Meta instagram carousel publish returned no id: {publish_payload}"
        )
    log.info(
        "Published Instagram carousel %s (%s children, parent %s)",
        media_id,
        len(child_ids),
        parent_id,
    )
    return str(media_id)
