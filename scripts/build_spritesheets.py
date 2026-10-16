#!/usr/bin/env python3
"""
Combine individual hero/enemy frame PNGs into single spritesheets
so that Phaser animation frames share one texture (consistent body offset).

Outputs:
  assets/characters/hero-spritesheet.png   (idle/walk/run/jump/fall/crouch/death)
  assets/enemies/enemy-spritesheet.png     (walker/shell-crawler/flying-shadow/shadow-hunter)
  + JSON atlas files for Phaser.
"""

import os
import json
from PIL import Image

HERO_FRAMES_DIR = "assets/characters/frames"
ENEMY_FRAMES_DIR = "assets/enemies/frames"
OUT_HERO_PNG = "assets/characters/hero-spritesheet.png"
OUT_HERO_JSON = "assets/characters/hero-spritesheet.json"
OUT_ENEMY_PNG = "assets/enemies/enemy-spritesheet.png"
OUT_ENEMY_JSON = "assets/enemies/enemy-spritesheet.json"

# Hero frame sequences (with counts)
HERO_ACTIONS = [
    ("idle", 8),
    ("walk", 8),
    ("run", 8),
    ("jump", 4),
    ("fall", 4),
    ("crouch-hit", 4),
    ("death", 4),
]

ENEMY_TYPES = [
    ("walker", 4),
    ("shell-crawler", 4),
    ("flying-shadow", 4),
    ("shadow-hunter", 4),
]

CELL_W = 256
CELL_H = 320


def trim_pad(im, target_w, target_h):
    """Trim transparent borders and pad to a uniform cell size."""
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    # Trim
    bg = Image.new("RGBA", im.size, (0, 0, 0, 0))
    diff = Image.new("RGBA", im.size, (0, 0, 0, 0))
    diff.paste(im, mask=im.split()[-1])
    diff = Image.eval(diff, lambda v: 255 if v > 0 else 0)
    diff = diff.convert("L")
    bbox = diff.getbbox()
    if bbox:
        im = im.crop(bbox)
    # Pad to target size (centered, bottom-aligned for hero)
    canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    w, h = im.size
    x = (target_w - w) // 2
    y = target_h - h  # bottom-align
    canvas.alpha_composite(im, (max(0, x), max(0, y)))
    return canvas


def build_hero():
    os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
    # Count total frames
    total = sum(c for _, c in HERO_ACTIONS)
    cols = 8  # 8 columns per row
    rows = (total + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * CELL_W, rows * CELL_H), (0, 0, 0, 0))
    atlas = {"frames": {}, "meta": {"image": "hero-spritesheet.png"}}
    idx = 0
    for action, count in HERO_ACTIONS:
        for i in range(1, count + 1):
            n = f"{i:02d}"
            src = os.path.join(HERO_FRAMES_DIR, f"{action}-{n}.png")
            if not os.path.exists(src):
                continue
            im = Image.open(src)
            cell = trim_pad(im, CELL_W, CELL_H)
            row = idx // cols
            col = idx % cols
            x = col * CELL_W
            y = row * CELL_H
            sheet.alpha_composite(cell, (x, y))
            # Phaser atlas frame
            atlas["frames"][f"hero-{action}-{n}"] = {
                "frame": {"x": x, "y": y, "w": CELL_W, "h": CELL_H},
                "rotated": False,
                "trimmed": True,
                "spriteSourceSize": {"x": 0, "y": 0, "w": CELL_W, "h": CELL_H},
                "sourceSize": {"w": CELL_W, "h": CELL_H},
            }
            idx += 1

    sheet.save(OUT_HERO_PNG, "PNG", optimize=True)
    with open(OUT_HERO_JSON, "w") as f:
        json.dump(atlas, f, indent=2)
    print(f"  saved {OUT_HERO_PNG}  size={sheet.size}  frames={idx}")
    print(f"  saved {OUT_HERO_JSON}")


def build_enemy():
    os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
    total = sum(c for _, c in ENEMY_TYPES)
    cols = 4  # 4 cols per row
    rows = (total + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * CELL_W, rows * CELL_H), (0, 0, 0, 0))
    atlas = {"frames": {}, "meta": {"image": "enemy-spritesheet.png"}}
    idx = 0
    for type_, count in ENEMY_TYPES:
        for i in range(1, count + 1):
            n = f"{i:02d}"
            src = os.path.join(ENEMY_FRAMES_DIR, f"{type_}-{n}.png")
            if not os.path.exists(src):
                continue
            im = Image.open(src)
            cell = trim_pad(im, CELL_W, CELL_H)
            row = idx // cols
            col = idx % cols
            x = col * CELL_W
            y = row * CELL_H
            sheet.alpha_composite(cell, (x, y))
            atlas["frames"][f"enemy-{type_}-{n}"] = {
                "frame": {"x": x, "y": y, "w": CELL_W, "h": CELL_H},
                "rotated": False,
                "trimmed": True,
                "spriteSourceSize": {"x": 0, "y": 0, "w": CELL_W, "h": CELL_H},
                "sourceSize": {"w": CELL_W, "h": CELL_H},
            }
            idx += 1
    sheet.save(OUT_ENEMY_PNG, "PNG", optimize=True)
    with open(OUT_ENEMY_JSON, "w") as f:
        json.dump(atlas, f, indent=2)
    print(f"  saved {OUT_ENEMY_PNG}  size={sheet.size}  frames={idx}")
    print(f"  saved {OUT_ENEMY_JSON}")


if __name__ == "__main__":
    print("Building hero spritesheet...")
    build_hero()
    print("Building enemy spritesheet...")
    build_enemy()
    print("Done.")
