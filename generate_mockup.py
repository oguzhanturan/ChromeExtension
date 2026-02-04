#!/usr/bin/env python3
"""
Generate a premium Chrome extension popup UI mockup at 2x resolution.
Output: mockup.png (800x1200 px, representing 400x600 @2x)
"""

from PIL import Image, ImageDraw, ImageFont
import math

# --- Canvas ---
W, H = 800, 1200
img = Image.new("RGBA", (W, H), (255, 255, 255, 255))
draw = ImageDraw.Draw(img, "RGBA")

# --- Fonts ---
FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_BOLD_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

def font(size, bold=False):
    path = FONT_BOLD_PATH if bold else FONT_PATH
    return ImageFont.truetype(path, size)

font_title = font(36, bold=True)
font_segment = font(26, bold=True)
font_card_title = font(28, bold=True)
font_card_subtitle = font(22)
font_card_tabs = font(20)
font_btn = font(22, bold=True)
font_footer = font(22)
font_small = font(18)

# --- Colors ---
WHITE = (255, 255, 255, 255)
TEXT_PRIMARY = (32, 33, 36, 255)       # #202124
TEXT_SECONDARY = (95, 99, 104, 255)    # #5F6368
TEXT_MUTED = (154, 160, 166, 255)      # #9AA0A6
BORDER_COLOR = (232, 234, 237, 255)    # #E8EAED
SEGMENT_BG = (241, 243, 244, 255)     # #F1F3F4
BLUE = (26, 115, 232, 255)            # #1A73E8
GREEN = (24, 128, 56, 255)            # #188038
RED = (217, 48, 37, 255)              # #D93025


def rounded_rect(draw, bbox, radius, fill=None, outline=None, outline_width=1):
    """Draw a rounded rectangle with proper corners. Auto-clamps radius."""
    x0, y0, x1, y1 = [int(v) for v in bbox]
    # Clamp radius so it doesn't exceed half the width or height
    max_r = min((x1 - x0) // 2, (y1 - y0) // 2)
    r = min(int(radius), max_r)
    if r < 1:
        r = 1

    if fill:
        # Center horizontal band
        draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
        # Center vertical band
        draw.rectangle([x0, y0 + r, x0 + r, y1 - r], fill=fill)
        draw.rectangle([x1 - r, y0 + r, x1, y1 - r], fill=fill)
        # Four corner circles
        draw.pieslice([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=fill)
        draw.pieslice([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=fill)
        draw.pieslice([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=fill)
        draw.pieslice([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=fill)

    if outline:
        w = outline_width
        draw.line([(x0 + r, y0), (x1 - r, y0)], fill=outline, width=w)
        draw.line([(x0 + r, y1), (x1 - r, y1)], fill=outline, width=w)
        draw.line([(x0, y0 + r), (x0, y1 - r)], fill=outline, width=w)
        draw.line([(x1, y0 + r), (x1, y1 - r)], fill=outline, width=w)
        draw.arc([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=outline, width=w)
        draw.arc([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=outline, width=w)
        draw.arc([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=outline, width=w)
        draw.arc([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=outline, width=w)


def draw_shadow_rect(img, bbox, radius, offset=4, blur_passes=3):
    """Draw a soft box shadow under a rounded rect."""
    shadow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer, "RGBA")
    x0, y0, x1, y1 = bbox
    for i in range(blur_passes):
        expand = (i + 1) * 2
        rounded_rect(sd, (x0 - expand, y0 - expand + offset, x1 + expand, y1 + expand + offset),
                     radius + expand, fill=(0, 0, 0, max(4, 14 - i * 4)))
    img.alpha_composite(shadow_layer)


def draw_share_icon(draw, cx, cy, color, size=16):
    """Draw a simple share icon (three dots connected by lines)."""
    s = size
    r = int(s * 0.22)
    nodes = [
        (cx + s//3, cy - s//3),
        (cx - s//3, cy),
        (cx + s//3, cy + s//3),
    ]
    draw.line([nodes[1], nodes[0]], fill=color, width=3)
    draw.line([nodes[1], nodes[2]], fill=color, width=3)
    for (nx, ny) in nodes:
        draw.ellipse([nx - r, ny - r, nx + r, ny + r], fill=color)


def draw_refresh_icon(draw, cx, cy, color, size=14):
    """Draw a circular refresh/reload icon."""
    r = size
    draw.arc([cx - r, cy - r, cx + r, cy + r], -60, 240, fill=color, width=3)
    angle_rad = math.radians(-60)
    ex = cx + r * math.cos(angle_rad)
    ey = cy + r * math.sin(angle_rad)
    arrow_size = 8
    a1 = math.radians(-60 - 40)
    a2 = math.radians(-60 + 50)
    pts = [
        (ex, ey),
        (ex + arrow_size * math.cos(a1), ey + arrow_size * math.sin(a1)),
        (ex + arrow_size * math.cos(a2), ey + arrow_size * math.sin(a2)),
    ]
    draw.polygon(pts, fill=color)


# ===================================================
#  HEADER SECTION
# ===================================================
y_cursor = 32  # top padding

# -- Icon + Title row
icon_x, icon_y = 32, y_cursor
icon_size = 34

# Blue rounded square icon
rounded_rect(draw, (icon_x, icon_y, icon_x + icon_size, icon_y + icon_size),
             8, fill=BLUE)
# White tab shapes inside icon
inner_m = 8
draw.rectangle([icon_x + inner_m, icon_y + inner_m,
                icon_x + icon_size//2 + 1, icon_y + icon_size - inner_m],
               fill=WHITE)
draw.rectangle([icon_x + icon_size//2 + 4, icon_y + inner_m,
                icon_x + icon_size - inner_m, icon_y + icon_size - inner_m],
               fill=(180, 210, 255, 255))

# Title text
title_x = icon_x + icon_size + 16
title_bbox = draw.textbbox((0, 0), "Tab Group Share", font=font_title)
title_th = title_bbox[3] - title_bbox[1]
title_y = icon_y + (icon_size - title_th) // 2 - 3
draw.text((title_x, title_y), "Tab Group Share", fill=TEXT_PRIMARY, font=font_title)

# Refresh button (right side)
refresh_btn_cx = W - 56
refresh_btn_cy = icon_y + icon_size // 2
refresh_r = 24
draw.ellipse([refresh_btn_cx - refresh_r, refresh_btn_cy - refresh_r,
              refresh_btn_cx + refresh_r, refresh_btn_cy + refresh_r],
             fill=SEGMENT_BG)
draw_refresh_icon(draw, refresh_btn_cx, refresh_btn_cy, TEXT_SECONDARY, size=13)

y_cursor = icon_y + icon_size + 28

# -- Segment / Pill navigation --
seg_margin_x = 32
seg_h = 80  # Increased to fit radius
seg_w = W - 2 * seg_margin_x
seg_y = y_cursor
seg_x = seg_margin_x
seg_radius = seg_h // 2  # Perfect pill shape

# Background pill container
rounded_rect(draw, (seg_x, seg_y, seg_x + seg_w, seg_y + seg_h),
             seg_radius, fill=SEGMENT_BG)

# Active segment (Share) - left half
active_pad = 6
active_x0 = seg_x + active_pad
active_y0 = seg_y + active_pad
active_x1 = seg_x + seg_w // 2 + 10
active_y1 = seg_y + seg_h - active_pad
active_radius = (active_y1 - active_y0) // 2

# Shadow for active segment
for i in range(4):
    expand = (i + 1)
    shadow_alpha = max(4, 16 - i * 4)
    rounded_rect(draw, (active_x0 - expand, active_y0 - expand + 3,
                        active_x1 + expand, active_y1 + expand + 3),
                 active_radius + expand, fill=(0, 0, 0, shadow_alpha))

# Active segment white pill
rounded_rect(draw, (active_x0, active_y0, active_x1, active_y1),
             active_radius, fill=WHITE)

# "Share" text centered in active segment
share_text_bbox = draw.textbbox((0, 0), "Share", font=font_segment)
share_tw = share_text_bbox[2] - share_text_bbox[0]
share_th = share_text_bbox[3] - share_text_bbox[1]
share_tx = active_x0 + (active_x1 - active_x0 - share_tw) // 2
share_ty = active_y0 + (active_y1 - active_y0 - share_th) // 2 - 2
draw.text((share_tx, share_ty), "Share", fill=TEXT_PRIMARY, font=font_segment)

# "Import" text centered in inactive segment
import_x0 = active_x1
import_x1 = seg_x + seg_w - active_pad
import_text_bbox = draw.textbbox((0, 0), "Import", font=font_segment)
import_tw = import_text_bbox[2] - import_text_bbox[0]
import_th = import_text_bbox[3] - import_text_bbox[1]
import_tx = import_x0 + (import_x1 - import_x0 - import_tw) // 2
import_ty = active_y0 + (active_y1 - active_y0 - import_th) // 2 - 2
draw.text((import_tx, import_ty), "Import", fill=TEXT_MUTED, font=font_segment)

y_cursor = seg_y + seg_h + 24

# -- Header bottom border
draw.line([(0, y_cursor), (W, y_cursor)], fill=BORDER_COLOR, width=2)
y_cursor += 2

# ===================================================
#  GROUP CARDS
# ===================================================
cards = [
    {
        "color": BLUE,
        "tint": (26, 115, 232, 8),
        "title": "Work Research",
        "subtitle": "Google Docs, GitHub, Stack Overflow...",
        "tabs": "5 tabs",
    },
    {
        "color": GREEN,
        "tint": (24, 128, 56, 8),
        "title": "Personal",
        "subtitle": "YouTube, Twitter, Reddit...",
        "tabs": "3 tabs",
    },
    {
        "color": RED,
        "tint": (217, 48, 37, 8),
        "title": "Shopping",
        "subtitle": "Amazon, Trendyol, Hepsiburada...",
        "tabs": "4 tabs",
    },
]

card_margin_x = 28
card_gap_y = 20
card_padding_x = 28
card_padding_y = 28
card_radius = 16
left_border_width = 6

y_cursor += 20

for card in cards:
    card_x0 = card_margin_x
    card_x1 = W - card_margin_x
    card_y0 = y_cursor
    card_inner_h = card_padding_y + 30 + 14 + 24 + 12 + 22 + card_padding_y
    card_y1 = card_y0 + card_inner_h

    # Draw shadow
    draw_shadow_rect(img, (card_x0, card_y0, card_x1, card_y1), card_radius, offset=4, blur_passes=3)
    draw = ImageDraw.Draw(img, "RGBA")

    # Card background
    rounded_rect(draw, (card_x0, card_y0, card_x1, card_y1), card_radius, fill=WHITE)
    # Subtle tint overlay
    rounded_rect(draw, (card_x0, card_y0, card_x1, card_y1), card_radius, fill=card["tint"])
    # Border
    rounded_rect(draw, (card_x0, card_y0, card_x1, card_y1), card_radius,
                 outline=BORDER_COLOR, outline_width=2)

    # Left colored accent border - draw as a filled stripe on the left
    # We clip by re-drawing the card interior to the right of the stripe
    color_rgba = card["color"]

    # Draw full left-side colored strip using rounded_rect approach
    # Draw a colored rounded_rect same size as card, then cover right portion
    stripe_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sl_draw = ImageDraw.Draw(stripe_layer, "RGBA")
    rounded_rect(sl_draw, (card_x0 + 2, card_y0 + 2, card_x1 - 2, card_y1 - 2),
                 card_radius - 1, fill=color_rgba)
    # Now erase everything to the right of the stripe
    sl_draw.rectangle([card_x0 + 2 + left_border_width + card_radius, card_y0,
                       card_x1, card_y1], fill=(0, 0, 0, 0))
    # Also erase the body but keep the left edge and corners
    sl_draw.rectangle([card_x0 + 2 + left_border_width, card_y0 + 2 + card_radius,
                       card_x1, card_y1 - 2 - card_radius], fill=(0, 0, 0, 0))
    img.alpha_composite(stripe_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # Re-draw a clean interior (right of the stripe) to ensure tint shows correctly
    interior_x = card_x0 + 2 + left_border_width
    blend = lambda c, a: int(255 * (1 - a/255.0) + c * (a/255.0))
    tint = card["tint"]
    interior_color = (blend(tint[0], tint[3]), blend(tint[1], tint[3]),
                      blend(tint[2], tint[3]), 255)
    draw.rectangle([interior_x, card_y0 + 3, card_x1 - 3, card_y1 - 3],
                   fill=interior_color)

    # Card content
    content_x = interior_x + card_padding_x
    content_y = card_y0 + card_padding_y

    # Title
    draw.text((content_x, content_y), card["title"], fill=TEXT_PRIMARY, font=font_card_title)
    content_y += 30 + 14

    # Subtitle
    draw.text((content_x, content_y), card["subtitle"], fill=TEXT_SECONDARY, font=font_card_subtitle)
    content_y += 24 + 12

    # Tab count with colored dot
    dot_r = 6
    draw.ellipse([content_x, content_y + 5, content_x + dot_r*2, content_y + 5 + dot_r*2],
                 fill=card["color"])
    draw.text((content_x + dot_r*2 + 8, content_y + 1), card["tabs"],
              fill=TEXT_MUTED, font=font_card_tabs)

    # Share button (right side, vertically centered in card)
    btn_text = "Share"
    btn_bbox = draw.textbbox((0, 0), btn_text, font=font_btn)
    btn_tw = btn_bbox[2] - btn_bbox[0]
    btn_h = 56
    btn_icon_space = 28
    btn_w = btn_icon_space + btn_tw + 44
    btn_x1 = card_x1 - card_padding_x - 8
    btn_x0 = btn_x1 - btn_w
    btn_y_center = card_y0 + card_inner_h // 2
    btn_y0 = btn_y_center - btn_h // 2
    btn_y1 = btn_y_center + btn_h // 2
    btn_radius = btn_h // 2

    # Button background + border
    rounded_rect(draw, (btn_x0, btn_y0, btn_x1, btn_y1), btn_radius, fill=WHITE)
    rounded_rect(draw, (btn_x0, btn_y0, btn_x1, btn_y1), btn_radius,
                 outline=BLUE, outline_width=2)

    # Share icon inside button
    icon_cx = btn_x0 + 30
    icon_cy = btn_y_center
    draw_share_icon(draw, icon_cx, icon_cy, BLUE, size=14)

    # Button text
    btn_tx = icon_cx + 20
    btn_ty = btn_y_center - (btn_bbox[3] - btn_bbox[1]) // 2 - 2
    draw.text((btn_tx, btn_ty), btn_text, fill=BLUE, font=font_btn)

    y_cursor = card_y1 + card_gap_y


# ===================================================
#  SUBTLE DIVIDER
# ===================================================
y_cursor += 8
hint_text = "All tab groups shown"
hint_bbox = draw.textbbox((0, 0), hint_text, font=font_small)
hint_tw = hint_bbox[2] - hint_bbox[0]
line_w = 60
hint_total_w = line_w + 16 + hint_tw + 16 + line_w
hint_start_x = (W - hint_total_w) // 2
hint_y = y_cursor + 4

draw.line([(hint_start_x, hint_y + 9), (hint_start_x + line_w, hint_y + 9)],
          fill=(220, 222, 225, 255), width=2)
draw.text((hint_start_x + line_w + 16, hint_y), hint_text, fill=TEXT_MUTED, font=font_small)
draw.line([(hint_start_x + line_w + 16 + hint_tw + 16, hint_y + 9),
           (hint_start_x + hint_total_w, hint_y + 9)],
          fill=(220, 222, 225, 255), width=2)

# ===================================================
#  FOOTER
# ===================================================
footer_y = H - 80

# Separator line
draw.line([(card_margin_x, footer_y), (W - card_margin_x, footer_y)],
          fill=BORDER_COLOR, width=2)

footer_text = "\u2318\u21e7E to share  \u00b7  v1.1.0"
footer_bbox = draw.textbbox((0, 0), footer_text, font=font_footer)
footer_tw = footer_bbox[2] - footer_bbox[0]
footer_th = footer_bbox[3] - footer_bbox[1]
footer_tx = (W - footer_tw) // 2
footer_ty = footer_y + (80 - footer_th) // 2 - 2
draw.text((footer_tx, footer_ty), footer_text, fill=TEXT_MUTED, font=font_footer)

# ===================================================
#  OUTER WINDOW BORDER (rounded)
# ===================================================
outer_radius = 24
rounded_rect(draw, (0, 0, W - 1, H - 1), outer_radius,
             outline=(200, 200, 200, 255), outline_width=2)

# ===================================================
#  SAVE
# ===================================================
output_path = "/home/user/ChromeExtension/mockup.png"
img.save(output_path, "PNG")
print(f"Mockup saved to {output_path}")
print(f"Dimensions: {img.size[0]}x{img.size[1]} px")
