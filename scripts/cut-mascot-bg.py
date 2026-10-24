"""ตัดพื้นหลังแผ่นมาสคอตให้เหลือตัวน้องไข่ เป็น PNG โปร่งใส"""
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "public" / "mascot"
TOLERANCE = 42


def corner_color(im: Image.Image) -> tuple[int, int, int]:
    w, h = im.size
    pix = im.load()
    samples = [pix[2, 2], pix[w - 3, 2], pix[2, h - 3], pix[w - 3, h - 3]]
    return tuple(sum(p[i] for p in samples) // 4 for i in range(3))  # type: ignore[return-value]


def near(rgb: tuple[int, int, int], bg: tuple[int, int, int]) -> bool:
    return abs(rgb[0] - bg[0]) + abs(rgb[1] - bg[1]) + abs(rgb[2] - bg[2]) < TOLERANCE


def cut(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA")
    if im.width < 900:
        im = im.resize((im.width * 2, im.height * 2), Image.Resampling.LANCZOS)
    bg = corner_color(im)
    w, h = im.size
    pix = im.load()
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b, _a = pix[x, y]
        if not near((r, g, b), bg):
            continue
        pix[x, y] = (r, g, b, 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))
    # ขอบที่เกือบเป็นพื้นหลัง ทำให้จาง เพื่อไม่ให้เห็นกรอบสี่เหลี่ยม
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a == 0 or not near((r, g, b), bg):
                continue
            pix[x, y] = (r, g, b, 90)
    rgb = im.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    out = rgb.convert("RGBA")
    out.putalpha(im.getchannel("A"))
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG", optimize=True)
    print(f"{src.name} -> {dest.name} {out.size}")


def main() -> None:
    for src in sorted(ROOT.glob("*.jpg")):
        cut(src, ROOT / f"{src.stem}.png")


if __name__ == "__main__":
    main()
