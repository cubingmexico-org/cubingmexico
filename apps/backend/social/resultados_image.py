"""Generate 1080x1080 RESULTADOS social graphics."""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
LOGO_PATH = ASSETS_DIR / "logo.png"
FONT_PATH = ASSETS_DIR / "fonts" / "Montserrat-Bold.ttf"

SIZE = 1080
GREEN = (0, 104, 71, 255)
RED = (206, 17, 38, 255)
BLACK = (0, 0, 0, 255)
WHITE = (255, 255, 255, 255)
TRIANGLE = 360

NAME_MAX_WIDTH = SIZE - 96
NAME_MAX_SIZE = 72
NAME_MIN_SIZE = 32
# Only keep a single line if it still fits at this size (or larger).
# Otherwise prefer wrapping so mid-length names don't become a cramped one-liner.
NAME_MIN_SINGLE_LINE = 64


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if FONT_PATH.exists():
        return ImageFont.truetype(str(FONT_PATH), size)
    return ImageFont.load_default()


def _text_width(text: str, font: ImageFont.ImageFont) -> int:
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0]


def _text_height(text: str, font: ImageFont.ImageFont) -> int:
    bbox = font.getbbox(text)
    return bbox[3] - bbox[1]


def _center_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    y: int,
    fill: tuple[int, int, int, int],
) -> None:
    width = _text_width(text, font)
    draw.text(((SIZE - width) // 2, y), text, font=font, fill=fill)


def _prefer_two_lines(text: str) -> bool:
    """Mid/long titles read better on two lines even when a shrink would fit one."""
    if any(sep in text for sep in (" - ", " – ", " — ")):
        return True
    words = text.split()
    return len(words) >= 4 or len(text) >= 28


def _dash_split(text: str) -> list[str] | None:
    for sep in (" - ", " – ", " — "):
        if sep in text:
            left, right = text.split(sep, 1)
            left, right = left.strip(), right.strip()
            if left and right:
                return [left, right]
    return None


def _best_two_line_wrap(
    text: str, font: ImageFont.ImageFont, max_width: int
) -> list[str] | None:
    # Prefer a natural dash break when both sides fit.
    dash_lines = _dash_split(text)
    if dash_lines:
        w1 = _text_width(dash_lines[0], font)
        w2 = _text_width(dash_lines[1], font)
        if w1 <= max_width and w2 <= max_width:
            return dash_lines

    words = text.split()
    if len(words) < 2:
        return None

    best: tuple[int, list[str]] | None = None
    for i in range(1, len(words)):
        line1 = " ".join(words[:i])
        line2 = " ".join(words[i:])
        w1 = _text_width(line1, font)
        w2 = _text_width(line2, font)
        if w1 <= max_width and w2 <= max_width:
            score = abs(w1 - w2) + abs(len(line1) - len(line2))
            if best is None or score < best[0]:
                best = (score, [line1, line2])
    return best[1] if best else None


def _layout_competition_name(
    text: str,
) -> tuple[ImageFont.ImageFont, list[str]]:
    """Pick the largest readable font; wrap to two lines when needed."""
    prefer_wrap = _prefer_two_lines(text)

    # 1) Short names: as large as possible on one line (unless wrap is preferred).
    if not prefer_wrap:
        size = NAME_MAX_SIZE
        while size >= NAME_MIN_SINGLE_LINE:
            font = _load_font(size)
            if _text_width(text, font) <= NAME_MAX_WIDTH:
                return font, [text]
            size -= 2

    # 2) Two lines at the largest size that fits.
    size = NAME_MAX_SIZE
    while size >= NAME_MIN_SIZE:
        font = _load_font(size)
        lines = _best_two_line_wrap(text, font, NAME_MAX_WIDTH)
        if lines:
            return font, lines
        size -= 2

    # 3) Fallback: single line, shrinking as needed.
    size = NAME_MAX_SIZE
    while size >= NAME_MIN_SIZE:
        font = _load_font(size)
        if _text_width(text, font) <= NAME_MAX_WIDTH:
            return font, [text]
        size -= 2

    return _load_font(NAME_MIN_SIZE), [text]


def generate_resultados_png(*, competition_name: str, year: str) -> bytes:
    """Return a PNG (RGB) matching the Cubing México RESULTADOS Canva template."""
    canvas = Image.new("RGBA", (SIZE, SIZE), GREEN)
    draw = ImageDraw.Draw(canvas)

    draw.polygon([(0, 0), (TRIANGLE, 0), (0, TRIANGLE)], fill=RED)
    draw.polygon(
        [(SIZE, SIZE), (SIZE - TRIANGLE, SIZE), (SIZE, SIZE - TRIANGLE)],
        fill=RED,
    )

    logo_path = LOGO_PATH
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        logo.thumbnail((340, 340), Image.Resampling.LANCZOS)
        lx = (SIZE - logo.width) // 2
        ly = 150
        canvas.paste(logo, (lx, ly), logo if logo.mode == "RGBA" else None)

    title_font = _load_font(64)
    year_font = _load_font(96)

    name = (competition_name or "").strip() or "México"
    year_text = (year or "").strip()
    name_font, name_lines = _layout_competition_name(name)

    _center_text(draw, "RESULTADOS", title_font, 520, BLACK)

    line_gap = max(8, int(_text_height("Ay", name_font) * 0.25))
    line_height = _text_height("Ay", name_font) + line_gap
    name_block_height = line_height * len(name_lines) - line_gap
    name_top = 610
    for i, line in enumerate(name_lines):
        _center_text(draw, line, name_font, name_top + i * line_height, WHITE)

    if year_text:
        year_y = name_top + name_block_height + 36
        _center_text(draw, year_text, year_font, year_y, WHITE)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
