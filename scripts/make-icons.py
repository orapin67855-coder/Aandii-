from pathlib import Path

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
src = root / "public" / "mascot" / "cheer.png"
out = root / "public" / "icons"
out.mkdir(parents=True, exist_ok=True)
chick = Image.open(src).convert("RGBA")
for size in (192, 512):
    icon = Image.new("RGBA", (size, size), (79, 111, 181, 255))
    draw = ImageDraw.Draw(icon)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 5, fill=(79, 111, 181, 255))
    pad = size // 8
    fitted = chick.copy()
    fitted.thumbnail((size - pad * 2, size - pad * 2), Image.Resampling.LANCZOS)
    icon.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    icon.save(out / f"icon-{size}.png")
    print(size)
