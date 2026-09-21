#!/usr/bin/env python3
"""Classify paths in the VTracer-traced Better Albay logo by color family.

Groups paths into:
  - neutral (gray/black-ish)  -> the wordmark text ("Better Albay .org")
  - blue                      -> the mountain icon
  - gold/yellow               -> the sun icon

Reports the estimated bounding box of each group so we can confirm the
text/icon split before recoloring.
"""
import re
import sys
from collections import defaultdict

SVG = sys.argv[1] if len(sys.argv) > 1 else "assets/images/logo/better-albay-logo.svg"

NUM = re.compile(r"-?\d+(?:\.\d+)?")
PATH_RE = re.compile(r"<path\b[^>]*>", re.S)
FILL_RE = re.compile(r'fill="(#[0-9A-Fa-f]{3,6})"')
D_RE = re.compile(r'\bd="([^"]*)"')
TRANSFORM_RE = re.compile(r'transform="translate\(([-\d.]+)[ ,]([-\d.]+)\)"')


def bbox_of(d, dx=0.0, dy=0.0):
    nums = [float(n) for n in NUM.findall(d)]
    xs = nums[0::2]
    ys = nums[1::2]
    if not xs or not ys:
        return None
    return (min(xs) + dx, min(ys) + dy, max(xs) + dx, max(ys) + dy)


def classify(hexcolor):
    h = hexcolor.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    chroma = mx - mn
    if chroma <= 30:
        return "neutral"
    if b >= mx and b > g:
        return "blue"
    if r >= mx and g > b:
        return "gold"
    return "other"


def main():
    svg = open(SVG, encoding="utf-8").read()
    groups = defaultdict(list)
    for m in PATH_RE.finditer(svg):
        tag = m.group(0)
        fill_m = FILL_RE.search(tag)
        fill = fill_m.group(1) if fill_m else "(none)"
        d_m = D_RE.search(tag)
        d = d_m.group(1) if d_m else ""
        t_m = TRANSFORM_RE.search(tag)
        dx = dy = 0.0
        if t_m:
            dx, dy = float(t_m.group(1)), float(t_m.group(2))
        bb = bbox_of(d, dx, dy)
        groups[classify(fill)].append((fill, bb, len(d)))

    # The icon (blue + gold) lives left of x=780; the wordmark lives right of it.
    TEXT_X = 780.0

    for name in ("neutral", "blue", "gold", "other"):
        items = groups.get(name, [])
        if not items:
            continue
        boxes = [i[1] for i in items if i[1]]
        x0 = min(b[0] for b in boxes)
        y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes)
        y1 = max(b[3] for b in boxes)
        print(f"{name:8s} paths={len(items):4d}  bbox ~ x:{x0:7.1f}-{x1:7.1f}  y:{y0:6.1f}-{y1:6.1f}")

    print("\n-- cross-check: paths classified as icon color but sitting in the text zone --")
    for name in ("blue", "gold"):
        for fill, bb, _ in groups.get(name, []):
            if bb and bb[0] > TEXT_X:
                print(f"  {name} {fill} @ x:{bb[0]:.1f}-{bb[2]:.1f} y:{bb[1]:.1f}-{bb[3]:.1f}")

    print("-- cross-check: neutral paths sitting in the icon zone --")
    for fill, bb, _ in groups.get("neutral", []):
        if bb and bb[2] < TEXT_X:
            print(f"  neutral {fill} @ x:{bb[0]:.1f}-{bb[2]:.1f} y:{bb[1]:.1f}-{bb[3]:.1f}")


if __name__ == "__main__":
    main()
