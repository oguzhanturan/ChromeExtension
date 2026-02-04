#!/usr/bin/env python3
"""
Generate a compact Chrome-style Tab Group Share extension popup mockup.
Output: mockup.png (680px wide x ~900px tall at 2x, representing a 340px popup).
"""

from PIL import Image, ImageDraw, ImageFont
import math

# --- Constants (all at 2x) ---
WIDTH = 680
BG_COLOR = "#FFFFFF"
BORDER_COLOR = "#DADCE0"
BORDER_RADIUS = 24
DIVIDER_COLOR = "#E8EAED"

# Fonts
FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_BOLD_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

font_title = ImageFont.truetype(FONT_BOLD_PATH, 28)
font_segment = ImageFont.truetype(FONT_PATH, 24)
font_segment_active = ImageFont.truetype(FONT_BOLD_PATH, 24)
font_chip = ImageFont.truetype(FONT_BOLD_PATH, 22)
font_preview = ImageFont.truetype(FONT_PATH, 22)
font_footer = ImageFont.truetype(FONT_PATH, 20)

# Group data
GROUPS = [
    {
        "name": "Work Research",
        "count": 5,
        "color": "#1A73E8",
        "preview": "google.com, github.com, stackoverflow.com",
    },
    {
        "name": "Personal",
        "count": 3,
        "color": "#188038",
        "preview": "youtube.com, twitter.com, reddit.com",
    },
    {
        "name": "Shopping",
        "count": 4,
        "color": "#D93025",
        "preview": "amazon.com, trendyol.com, hepsiburada.com",
    },
]


def hex_to_rgb(h):
    """Convert hex color string to RGB tuple."""
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle with filled corners."""
    x0, y0, x1, y1 = [int(v) for v in bbox]
    r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
    if fill:
        draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
        draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
        draw.pieslice([x0, y0, x0 + 2 * r, y0 + 2 * r], 180, 270, fill=fill)
        draw.pieslice([x1 - 2 * r, y0, x1, y0 + 2 * r], 270, 360, fill=fill)
        draw.pieslice([x0, y1 - 2 * r, x0 + 2 * r, y1], 90, 180, fill=fill)
        draw.pieslice([x1 - 2 * r, y1 - 2 * r, x1, y1], 0, 90, fill=fill)
    if outline:
        draw.line([x0 + r, y0, x1 - r, y0], fill=outline, width=width)
        draw.line([x0 + r, y1, x1 - r, y1], fill=outline, width=width)
        draw.line([x0, y0 + r, x0, y1 - r], fill=outline, width=width)
        draw.line([x1, y0 + r, x1, y1 - r], fill=outline, width=width)
        draw.arc([x0, y0, x0 + 2 * r, y0 + 2 * r], 180, 270, fill=outline, width=width)
        draw.arc([x1 - 2 * r, y0, x1, y0 + 2 * r], 270, 360, fill=outline, width=width)
        draw.arc([x0, y1 - 2 * r, x0 + 2 * r, y1], 90, 180, fill=outline, width=width)
        draw.arc([x1 - 2 * r, y1 - 2 * r, x1, y1], 0, 90, fill=outline, width=width)


def draw_pill(draw, bbox, fill=None, outline=None, width=1):
    """Draw a pill / capsule shape (fully rounded ends)."""
    x0, y0, x1, y1 = bbox
    h = y1 - y0
    r = h // 2
    draw_rounded_rect(draw, bbox, r, fill=fill, outline=outline, width=width)


def draw_circle(draw, cx, cy, radius, fill=None, outline=None, width=1):
    """Draw a circle centered at (cx, cy)."""
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        fill=fill, outline=outline, width=width,
    )


def draw_share_icon(draw, cx, cy, color, size=22):
    """Three-dot share icon connected by V-shaped lines."""
    dot_r = 4
    rx, ry = cx + size // 2, cy - size // 3
    rx2, ry2 = cx + size // 2, cy + size // 3
    lx, ly = cx - size // 2, cy
    draw_circle(draw, rx, ry, dot_r, fill=color)
    draw_circle(draw, rx2, ry2, dot_r, fill=color)
    draw_circle(draw, lx, ly, dot_r, fill=color)
    draw.line([lx, ly, rx, ry], fill=color, width=3)
    draw.line([lx, ly, rx2, ry2], fill=color, width=3)


def draw_refresh_icon(draw, cx, cy, color, radius=14):
    """Circular refresh arrow with two arrowheads."""
    draw.arc(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        start=30, end=330, fill=color, width=3,
    )
    a1 = math.radians(330)
    tx, ty = cx + radius * math.cos(a1), cy - radius * math.sin(a1)
    draw.polygon([(tx, ty), (tx - 8, ty - 6), (tx + 2, ty - 7)], fill=color)
    a2 = math.radians(30)
    tx2, ty2 = cx + radius * math.cos(a2), cy - radius * math.sin(a2)
    draw.polygon([(tx2, ty2), (tx2 + 8, ty2 + 6), (tx2 - 2, ty2 + 7)], fill=color)


def draw_app_icon(draw, x, y, size=28):
    """Small blue rounded-square extension icon with a grid motif."""
    draw_rounded_rect(draw, [x, y, x + size, y + size], 6, fill="#1A73E8")
    m = 5
    mx, my = x + size // 2, y + size // 2
    draw.line([mx, y + m, mx, y + size - m], fill="#FFFFFF", width=2)
    draw.line([x + m, my, x + size - m, my], fill="#FFFFFF", width=2)


def _center_text(draw, text, font, color, x0, y0, x1, y1):
    """Draw text horizontally and vertically centered in a bounding box."""
    bb = draw.textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx = (x0 + x1) // 2 - tw // 2
    ty = (y0 + y1) // 2 - th // 2 - 1
    draw.text((tx, ty), text, fill=color, font=font)


# ──────────────────────────────────────────────────
# Layout spacing constants (all at 2x).
# Tuned so the total popup height is ~900px.
# ──────────────────────────────────────────────────
PAD_H = 28                 # horizontal padding

HEADER_TOP = 52            # top of popup → icon row
TITLE_ROW_H = 52           # icon + title vertical extent
GAP_TITLE_SEG = 40         # title row → segment control
SEGMENT_H = 72             # segment control pill height
GAP_SEG_DIV = 36           # segment → divider line
GAP_DIV_CARDS = 24         # divider → first card

CARD_PAD_TOP = 38          # whitespace above chip per card
CHIP_H = 46                # pill chip height
GAP_CHIP_PREV = 16         # chip → preview text
PREVIEW_H = 28             # preview text line height
CARD_PAD_BOT = 38          # whitespace below preview per card

GAP_CARDS_FOOTER = 28      # last card → footer divider
FOOTER_PAD_TOP = 24        # footer divider → text
FOOTER_TEXT_H = 24         # footer text line height
FOOTER_PAD_BOT = 36        # text → bottom edge


def compute_height():
    """Calculate total popup height from spacing constants."""
    h = HEADER_TOP + TITLE_ROW_H + GAP_TITLE_SEG
    h += SEGMENT_H + GAP_SEG_DIV + 1 + GAP_DIV_CARDS          # +1 for divider px
    card = CARD_PAD_TOP + CHIP_H + GAP_CHIP_PREV + PREVIEW_H + CARD_PAD_BOT
    h += card * 3 + 2                                          # +2 for inter-card dividers
    h += GAP_CARDS_FOOTER + 1 + FOOTER_PAD_TOP + FOOTER_TEXT_H + FOOTER_PAD_BOT
    return h


def generate_mockup():
    HEIGHT = compute_height()
    print(f"Content area: {WIDTH}x{HEIGHT}")

    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Popup background + rounded border ──
    draw_rounded_rect(
        draw, [0, 0, WIDTH - 1, HEIGHT - 1], BORDER_RADIUS,
        fill=hex_to_rgb(BG_COLOR), outline=hex_to_rgb(BORDER_COLOR), width=2,
    )

    y = HEADER_TOP

    # ═══════════════════════════════════════
    # HEADER: icon · title · refresh button
    # ═══════════════════════════════════════
    draw_app_icon(draw, PAD_H, y + 12, 28)
    draw.text((PAD_H + 28 + 12, y + 10), "Tab Group Share", fill="#202124", font=font_title)

    rcx = WIDTH - PAD_H - 16
    rcy = y + 24
    draw_refresh_icon(draw, rcx, rcy, "#5F6368", radius=14)

    y += TITLE_ROW_H + GAP_TITLE_SEG

    # ═══════════════════════════════════════
    # SEGMENT CONTROL: [Share] | Import
    # ═══════════════════════════════════════
    sx0, sy0 = PAD_H, y
    sx1, sy1 = WIDTH - PAD_H, y + SEGMENT_H
    draw_pill(draw, [sx0, sy0, sx1, sy1], fill=hex_to_rgb("#F1F3F4"))

    ip = 6  # inner padding
    iy0, iy1 = sy0 + ip, sy1 - ip
    mid = (sx0 + sx1) // 2

    # Active segment — white pill with light border
    ax0, ax1 = sx0 + ip, mid - 3
    draw_pill(draw, [ax0, iy0, ax1, iy1], fill="#FFFFFF",
              outline=hex_to_rgb("#DADCE0"), width=1)
    _center_text(draw, "Share", font_segment_active, "#202124", ax0, iy0, ax1, iy1)

    # Inactive segment — text only
    bx0, bx1 = mid + 3, sx1 - ip
    _center_text(draw, "Import", font_segment, "#80868B", bx0, iy0, bx1, iy1)

    y += SEGMENT_H + GAP_SEG_DIV

    # Thin divider below segment control
    draw.line([(PAD_H, y), (WIDTH - PAD_H, y)], fill=hex_to_rgb(DIVIDER_COLOR), width=1)
    y += 1 + GAP_DIV_CARDS

    # ═══════════════════════════════════════
    # GROUP CARDS (3 cards)
    # ═══════════════════════════════════════
    for i, g in enumerate(GROUPS):
        y += CARD_PAD_TOP

        # -- Colored chip pill --
        chip_label = f"{g['name']} \u00b7 {g['count']}"
        cb = draw.textbbox((0, 0), chip_label, font=font_chip)
        ctw = cb[2] - cb[0]
        cth = cb[3] - cb[1]
        cpx = 16  # horizontal text padding inside chip
        cx0 = PAD_H
        cx1 = cx0 + ctw + cpx * 2
        cy0 = y
        cy1 = y + CHIP_H

        draw_pill(draw, [cx0, cy0, cx1, cy1], fill=hex_to_rgb(g["color"]))
        draw.text(
            (cx0 + cpx, cy0 + (CHIP_H - cth) // 2 - 1),
            chip_label, fill="#FFFFFF", font=font_chip,
        )

        # -- Circle share button (right side) --
        content_h = CHIP_H + GAP_CHIP_PREV + PREVIEW_H
        btn_r = 28
        btn_cx = WIDTH - PAD_H - btn_r
        btn_cy = cy0 + content_h // 2
        draw_circle(draw, btn_cx, btn_cy, btn_r,
                    outline=hex_to_rgb("#DADCE0"), width=2)
        draw_share_icon(draw, btn_cx, btn_cy, "#1A73E8", size=22)

        y += CHIP_H + GAP_CHIP_PREV

        # -- Preview domain text --
        ptxt = g["preview"]
        max_pw = btn_cx - btn_r - PAD_H - 20
        while True:
            pw = draw.textbbox((0, 0), ptxt, font=font_preview)[2]
            if pw <= max_pw or len(ptxt) <= 12:
                break
            ptxt = ptxt[:-4].rstrip(", ") + "\u2026"
        draw.text((PAD_H, y), ptxt, fill="#80868B", font=font_preview)

        y += PREVIEW_H + CARD_PAD_BOT

        # Subtle divider between cards (not after last)
        if i < len(GROUPS) - 1:
            draw.line(
                [(PAD_H, y), (WIDTH - PAD_H, y)],
                fill=hex_to_rgb(DIVIDER_COLOR), width=1,
            )
            y += 1

    y += GAP_CARDS_FOOTER

    # ═══════════════════════════════════════
    # FOOTER
    # ═══════════════════════════════════════
    draw.line([(0, y), (WIDTH, y)], fill=hex_to_rgb(DIVIDER_COLOR), width=1)
    y += 1 + FOOTER_PAD_TOP

    ftxt = "Ctrl+Shift+S to share \u00b7 v1.1.0"
    fb = draw.textbbox((0, 0), ftxt, font=font_footer)
    ftw = fb[2] - fb[0]
    draw.text(((WIDTH - ftw) // 2, y), ftxt, fill="#9AA0A6", font=font_footer)

    # ── Composite onto a light-gray canvas with a subtle shadow ──
    pad = 10
    cw, ch = WIDTH + pad * 2, HEIGHT + pad * 2
    canvas = Image.new("RGBA", (cw, ch), (245, 245, 245, 255))
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 25))
    canvas.paste(shadow, (pad + 4, pad + 4), shadow)
    canvas.paste(img, (pad, pad), img)

    output = canvas.convert("RGB")
    output.save("/home/user/ChromeExtension/mockup.png", "PNG")
    print(f"Mockup saved: {output.size[0]}x{output.size[1]}px")


if __name__ == "__main__":
    generate_mockup()
