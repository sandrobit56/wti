"""
File:        scripts/paper-stickers.py
Application: რა ვჭამოთ? (WTI)
Author:      Sandro Germanishvili
Date:        2026-11-25
Version:     v1.0
Description: Turns the 63 food stickers into collage cut-outs: thick off-white scissor border
             (slightly uneven, like hand-cut paper), the paper texture multiplied over the
             border, and a soft paste shadow. Run once: python3 scripts/paper-stickers.py <src_dir>
             Writes public/stickers/<slug>.webp (same names, so lib/stickers.ts is unchanged).
"""
import sys, glob, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src = sys.argv[1]
if not os.path.isdir(src): raise SystemExit(f"source folder missing: {src}")
paper = np.asarray(Image.open("public/collage/paper.webp").convert("L")).astype(float) / 255
OUT, PAD, BORDER = 256, 18, 9
for f in sorted(glob.glob(f"{src}/*.webp")):
    im = Image.open(f).convert("RGBA")
    im.thumbnail((OUT - 2 * PAD, OUT - 2 * PAD), Image.LANCZOS)
    canvas = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((OUT - im.width) // 2, (OUT - im.height) // 2))
    a = np.asarray(canvas)[..., 3] > 40
    rng = np.random.default_rng(abs(hash(os.path.basename(f))) % 2**32)
    # scissor border: dilate, then cut it with a coarse polygon-ish wobble
    border = ndimage.binary_dilation(a, iterations=BORDER)
    wob = ndimage.gaussian_filter(rng.standard_normal((OUT, OUT)), 6) * 40
    border = ndimage.binary_dilation(a, iterations=BORDER - 3) | (border & (wob > -0.6))
    border = ndimage.binary_fill_holes(ndimage.binary_closing(border, iterations=3))
    lab, n = ndimage.label(border)
    if n > 1: border = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)   # one piece of paper
    tex = paper[:OUT, :OUT]
    base = np.zeros((OUT, OUT, 4), np.uint8)
    base[..., 0] = (255 * tex).astype(np.uint8); base[..., 1] = (250 * tex).astype(np.uint8); base[..., 2] = (242 * tex).astype(np.uint8)
    base[..., 3] = (border * 255).astype(np.uint8)
    # paste shadow under the paper
    sh = Image.fromarray((ndimage.gaussian_filter(border.astype(float), 4) * 70).astype(np.uint8), "L")
    shadow = Image.new("RGBA", (OUT, OUT), (28, 26, 23, 0)); shadow.putalpha(sh)
    out = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    out.alpha_composite(shadow, (0, 4)); out.alpha_composite(Image.fromarray(base, "RGBA")); out.alpha_composite(canvas)
    out.save(f"public/stickers/{os.path.basename(f)}", "WEBP", quality=88, method=6)
print("done")
