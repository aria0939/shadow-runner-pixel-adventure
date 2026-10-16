#!/usr/bin/env python3
"""
Generate Android app icons of various sizes.
Uses the hero idle-01.png as source.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

SRC = "assets/characters/frames/idle-01.png"
OUT_DIR = "assets/icons"
SIZES = [48, 72, 96, 144, 192, 512]


def make_icon(size, src_path, out_path):
    src = Image.open(src_path).convert("RGBA")
    # Background: dark gradient
    bg = Image.new("RGBA", (size, size), (10, 10, 20, 255))
    # Paste the hero scaled to fit
    target_h = int(size * 0.75)
    scale = target_h / src.height
    target_w = max(1, int(src.width * scale))
    hero = src.resize((target_w, target_h), Image.LANCZOS)
    # Center horizontally, bottom align with small padding
    px = (size - target_w) // 2
    py = size - target_h - int(size * 0.08)
    bg.alpha_composite(hero, (px, py))
    # Add subtle purple glow behind the hero
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = size // 2, int(size * 0.55)
    gd.ellipse(
        [size // 5, cy - size // 4, size - size // 5, cy + size // 4],
        fill=(106, 76, 255, 80),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(size // 12))
    bg.alpha_composite(glow)
    # Save as PNG
    bg.convert("RGB").save(out_path, "PNG", optimize=True)
    # But we want RGBA for android adaptive icons
    bg.save(out_path, "PNG", optimize=True)


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
    os.makedirs(OUT_DIR, exist_ok=True)
    if not os.path.exists(SRC):
        print(f"ERROR: source image not found: {SRC}")
        return
    for s in SIZES:
        out = os.path.join(OUT_DIR, f"icon-{s}.png")
        make_icon(s, SRC, out)
        print(f"  saved {out} ({s}x{s})")
    print("Done.")


if __name__ == "__main__":
    main()
