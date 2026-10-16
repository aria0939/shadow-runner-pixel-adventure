#!/usr/bin/env python3
"""
Extract individual sprite frames from the pickups-and-effects atlas.

The atlas is irregular and has scattered transparent noise. We use
connected-component analysis on a strict alpha threshold (>=200), filter
out background noise, and save each meaningful sprite as a separate PNG.

Outputs:
  assets/collectibles/individual/<name>.png
"""

import os
from PIL import Image, ImageChops
import numpy as np
from scipy import ndimage

ATLAS = "assets/collectibles/pickups-and-effects-atlas.png"
OUT_DIR = "assets/collectibles/individual"

# Semantic naming by region of the atlas. We will discover components,
# then map them by their bounding-box position to a friendly name.
# Layout (approximate):
#   Row 1 (y  30-200): pickups (coin, shadow energy, small icons)
#   Row 2 (y 200-400): more pickups
#   Row 3 (y 400-650): power-ups
#   Row 4 (y 650-850): checkpoint / exit / dust
#   Row 5 (y 850-1024): effects / trail
NAMES = [
    "coin", "shadow-energy", "small-shadow", "heart",
    "speed-powerup", "double-jump-powerup", "shield-powerup", "magnet-powerup",
    "shadow-mode-powerup", "checkpoint-flag", "exit-gate",
    "dust-burst", "shadow-dash-trail", "damage-stars",
    "sparkle", "boss-burst",
]


def extract():
    os.makedirs(OUT_DIR, exist_ok=True)
    # Clear existing files
    for f in os.listdir(OUT_DIR):
        if f.endswith(".png"):
            os.remove(os.path.join(OUT_DIR, f))

    im = Image.open(ATLAS).convert("RGBA")
    arr = np.array(im)
    alpha = arr[:, :, 3]
    h, w = alpha.shape

    opaque = alpha >= 200
    labeled, n = ndimage.label(opaque, structure=np.ones((3, 3)))
    sizes = ndimage.sum(opaque, labeled, range(1, n + 1))
    bboxes = ndimage.find_objects(labeled)

    # Filter: components with size > 1000 AND not touching all 4 atlas edges
    # (component 1 was the background noise touching everything)
    components = []
    for i in range(n):
        sz = sizes[i]
        if sz < 1000:
            continue
        bb = bboxes[i]
        ysl, ysr = bb[0].start, bb[0].stop
        xsl, xsr = bb[1].start, bb[1].stop
        # Skip components that span the whole atlas (background noise)
        if (ysr - ysl) > 0.85 * h and (xsr - xsl) > 0.85 * w:
            continue
        components.append({
            "id": i + 1,
            "size": int(sz),
            "y0": ysl, "y1": ysr,
            "x0": xsl, "x1": xsr,
            "h": ysr - ysl,
            "w": xsr - xsl,
        })

    # Sort by reading order: top-to-bottom, then left-to-right
    components.sort(key=lambda c: (c["y0"], c["x0"]))

    print(f"Extracting {len(components)} sprites:")
    for idx, comp in enumerate(components):
        # Crop with small padding
        pad = 2
        y0 = max(0, comp["y0"] - pad)
        y1 = min(h, comp["y1"] + pad)
        x0 = max(0, comp["x0"] - pad)
        x1 = min(w, comp["x1"] + pad)
        crop = im.crop((x0, y0, x1, y1))

        # Re-trim transparent borders
        bg = Image.new("RGBA", crop.size, (0, 0, 0, 0))
        diff = ImageChops.difference(crop, bg)
        bbox = diff.getbbox()
        if bbox:
            crop = crop.crop(bbox)

        name = NAMES[idx] if idx < len(NAMES) else f"pickup-{idx+1:02d}"
        out = os.path.join(OUT_DIR, f"{name}.png")
        crop.save(out)
        print(f"  {name:25s}  size={crop.size}  from y=[{comp['y0']}-{comp['y1']}] x=[{comp['x0']}-{comp['x1']}]")

    print(f"Total extracted: {len(components)}")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
    extract()
