"""Shared helpers for 1080x1080 Cubing México social graphics."""

from __future__ import annotations

import io
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
LOGO_PATH = ASSETS_DIR / "logo.png"
FONT_PATH = ASSETS_DIR / "fonts" / "Montserrat-Bold.ttf"

SIZE = 1080
GREEN = (0, 104, 71, 255)
RED = (206, 17, 38, 255)
BLACK = (0, 0, 0, 255)
WHITE = (255, 255, 255, 255)
CREAM = (245, 240, 230, 255)

NAME_MAX_WIDTH = SIZE - 96
NAME_MAX_SIZE = 72
NAME_MIN_SIZE = 32
NAME_MIN_SINGLE_LINE = 64


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if FONT_PATH.exists():
        return ImageFont.truetype(str(FONT_PATH), size)
    return ImageFont.load_default()


def text_width(text: str, font: ImageFont.ImageFont) -> int:
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0]


def text_height(text: str, font: ImageFont.ImageFont) -> int:
    bbox = font.getbbox(text)
    return bbox[3] - bbox[1]


def center_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    y: int,
    fill: tuple[int, int, int, int],
) -> None:
    """Draw text horizontally centered at y (top of ink via middle-top anchor)."""
    draw.text((SIZE // 2, y), text, font=font, fill=fill, anchor="mt")


def draw_centered_badge(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    *,
    cy: int,
    fill: tuple[int, int, int, int],
    text_fill: tuple[int, int, int, int],
    pad_x: int = 36,
    pad_y: int = 18,
    radius: int = 16,
) -> tuple[int, int, int, int]:
    """Draw a rounded badge whose box and label share the same center (cx, cy).

    Returns the badge bounding box (x0, y0, x1, y1).
    """
    left, top, right, bottom = font.getbbox(text)
    ink_w = right - left
    ink_h = bottom - top
    box_w = ink_w + pad_x * 2
    box_h = ink_h + pad_y * 2
    cx = SIZE // 2
    x0 = cx - box_w // 2
    y0 = cy - box_h // 2
    x1 = x0 + box_w
    y1 = y0 + box_h
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)
    draw.text((cx, cy), text, font=font, fill=text_fill, anchor="mm")
    return x0, y0, x1, y1



def format_place_line(city_name: str | None, state_name: str | None = None) -> str:
    """Build a city/state line without duplicating state when city already includes it.

    WCA city_name is often \"Salamanca, Guanajuato\"; state_name is \"Guanajuato\".
    """
    city = (city_name or "").strip()
    state = (state_name or "").strip()
    if not city and not state:
        return ""
    if not state:
        return city
    if not city:
        return state

    if city.lower().endswith(f", {state.lower()}"):
        return city
    if "," in city:
        after_comma = city.rsplit(",", 1)[-1].strip()
        if after_comma.lower() == state.lower():
            return city

    return f"{city} · {state}"


def prefer_two_lines(text: str) -> bool:
    """Mid/long titles read better on two lines even when a shrink would fit one."""
    if any(sep in text for sep in (" - ", " – ", " — ")):
        return True
    words = text.split()
    return len(words) >= 4 or len(text) >= 28


def dash_split(text: str) -> list[str] | None:
    for sep in (" - ", " – ", " — "):
        if sep in text:
            left, right = text.split(sep, 1)
            left, right = left.strip(), right.strip()
            if left and right:
                return [left, right]
    return None


def best_two_line_wrap(
    text: str, font: ImageFont.ImageFont, max_width: int
) -> list[str] | None:
    dash_lines = dash_split(text)
    if dash_lines:
        w1 = text_width(dash_lines[0], font)
        w2 = text_width(dash_lines[1], font)
        if w1 <= max_width and w2 <= max_width:
            return dash_lines

    words = text.split()
    if len(words) < 2:
        return None

    best: tuple[int, list[str]] | None = None
    for i in range(1, len(words)):
        line1 = " ".join(words[:i])
        line2 = " ".join(words[i:])
        w1 = text_width(line1, font)
        w2 = text_width(line2, font)
        if w1 <= max_width and w2 <= max_width:
            score = abs(w1 - w2) + abs(len(line1) - len(line2))
            if best is None or score < best[0]:
                best = (score, [line1, line2])
    return best[1] if best else None


def layout_wrapped_name(
    text: str,
    *,
    max_width: int = NAME_MAX_WIDTH,
    max_size: int = NAME_MAX_SIZE,
    min_size: int = NAME_MIN_SIZE,
    min_single_line: int = NAME_MIN_SINGLE_LINE,
) -> tuple[ImageFont.ImageFont, list[str]]:
    """Pick the largest readable font; wrap to two lines when needed."""
    prefer_wrap = prefer_two_lines(text)

    if not prefer_wrap:
        size = max_size
        while size >= min_single_line:
            font = load_font(size)
            if text_width(text, font) <= max_width:
                return font, [text]
            size -= 2

    size = max_size
    while size >= min_size:
        font = load_font(size)
        lines = best_two_line_wrap(text, font, max_width)
        if lines:
            return font, lines
        size -= 2

    size = max_size
    while size >= min_size:
        font = load_font(size)
        if text_width(text, font) <= max_width:
            return font, [text]
        size -= 2

    return load_font(min_size), [text]


def paste_logo(
    canvas: Image.Image,
    *,
    max_size: tuple[int, int] = (340, 340),
    y: int = 150,
    logo_url: str | None = None,
) -> int:
    """Paste centered logo; return bottom y of logo (or y if missing).

    When ``logo_url`` is set, fetch that image (timeout/size guarded). On any
    failure, fall back to the Cubing México brand mark at ``LOGO_PATH``.
    """
    logo: Image.Image | None = None
    url = (logo_url or "").strip()
    if url:
        try:
            response = requests.get(url, timeout=8)
            response.raise_for_status()
            if len(response.content) <= 8 * 1024 * 1024:
                logo = Image.open(io.BytesIO(response.content)).convert("RGBA")
        except Exception:
            logo = None

    if logo is None:
        if not LOGO_PATH.exists():
            return y
        logo = Image.open(LOGO_PATH).convert("RGBA")

    logo.thumbnail(max_size, Image.Resampling.LANCZOS)
    lx = (SIZE - logo.width) // 2
    canvas.paste(logo, (lx, y), logo if logo.mode == "RGBA" else None)
    return y + logo.height


def png_bytes_to_jpeg(png_bytes: bytes, *, quality: int = 92) -> bytes:
    """Convert PNG bytes to baseline JPEG for Instagram Content Publishing."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def format_result_time(event_id: str, value: int, *, kind: str = "single") -> str:
    """Format a WCA result value (centiseconds / FMC / MBF) for display."""
    if value == 0:
        return "—"
    if value == -1:
        return "DNF"
    if value == -2:
        return "DNS"

    if event_id == "333mbf":
        value_str = str(value).zfill(9)
        dd = int(value_str[0:2])
        ttttt = int(value_str[2:7])
        mm = int(value_str[7:9])
        difference = 99 - dd
        missed = mm
        solved = difference + missed
        attempted = solved + missed
        minutes = ttttt // 60
        seconds = ttttt % 60
        return f"{solved}/{attempted} {minutes}:{seconds:02d}"

    if event_id == "333fm":
        if kind == "average":
            return f"{value / 100:.2f}"
        return str(value)

    seconds = value / 100
    if seconds < 60:
        return f"{seconds:.2f}"
    minutes = int(seconds // 60)
    remaining = seconds % 60
    return f"{minutes}:{remaining:05.2f}"
