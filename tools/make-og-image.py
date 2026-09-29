from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (14, 21, 32)
GOLD = (245, 205, 75)
TEAL = (83, 212, 200)
RED = (200, 61, 69)
WHITE = (255, 255, 255)
MUTED = (163, 178, 195)
CARD = (20, 31, 42)

BOLD = "C:/Windows/Fonts/segoeuib.ttf"
REG = "C:/Windows/Fonts/segoeui.ttf"
BOLDZ = "C:/Windows/Fonts/segoeuiz.ttf"


def f(path, size):
    return ImageFont.truetype(path, size)


def glow(base, cx, cy, r, col, strength):
    """Degradado radial suave: se pinta a baja resolucion y se escala
    con BOX, lo que evita el bandeado de los circulos concentricos."""
    s = 64
    layer = Image.new("L", (s * 2, s * 2), 0)
    ld = ImageDraw.Draw(layer)
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        rr = s * t
        v = int(255 * (1 - t) ** 2)
        ld.ellipse([s - rr, s - rr, s + rr, s + rr], fill=v)
    layer = layer.resize((r * 2, r * 2), Image.BOX).filter(__import__("PIL.ImageFilter", fromlist=["ImageFilter"]).GaussianBlur(r // 14))
    mask = Image.new("L", base.size, 0)
    mask.paste(layer, (cx - r, cy - r))
    mask = mask.point(lambda v: int(v * strength))
    base.paste(Image.new("RGB", base.size, col), (0, 0), mask)


img = Image.new("RGB", (W, H), BG)
glow(img, 250, 90, 460, GOLD, 0.17)
glow(img, 1010, 600, 420, TEAL, 0.16)
d = ImageDraw.Draw(img, "RGBA")

d.rectangle([0, 0, W / 3, 7], fill=GOLD)
d.rectangle([W / 3, 0, 2 * W / 3, 7], fill=TEAL)
d.rectangle([2 * W / 3, 0, W, 7], fill=RED)

X = 78
d.text((X, 78), "Inglés con Chunks", font=f(BOLD, 62), fill=WHITE)
d.text((X, 156), "Aprende inglés con frases reales en contexto", font=f(REG, 27), fill=MUTED)

d.text((X, 226), "2250", font=f(BOLDZ, 122), fill=GOLD)
d.text((X, 356), "chunks en 9 episodios, canciones e historias", font=f(BOLD, 29), fill=WHITE)

chips = [("9 podcasts", GOLD), ("21 canciones", TEAL), ("2 historias", RED)]
cx = X
for label, col in chips:
    tw = d.textlength(label, font=f(BOLD, 20))
    d.rounded_rectangle([cx, 412, cx + tw + 40, 456], radius=22,
                        fill=(col[0], col[1], col[2], 34), outline=(col[0], col[1], col[2], 160), width=2)
    d.text((cx + 20, 423), label, font=f(BOLD, 20), fill=col)
    cx += tw + 56

d.text((X, 500), "Escucha  ·  Lee  ·  Repite  ·  Canta", font=f(REG, 25), fill=WHITE)
d.text((X, 544), "Gratis, sin registro y sin backend", font=f(REG, 21), fill=MUTED)
d.text((X, 580), "edenglishchunks.vercel.app", font=f(BOLD, 22), fill=TEAL)

# tarjeta de chunk, imitando la app
cx0, cy0, cw, ch = 830, 96, 292, 440
d.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + ch], radius=26, fill=CARD, outline=(70, 90, 110, 255), width=2)
d.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + 52], radius=26, fill=(28, 42, 56))
d.rectangle([cx0, cy0 + 30, cx0 + cw, cy0 + 52], fill=(28, 42, 56))
d.ellipse([cx0 + 20, cy0 + 18, cx0 + 34, cy0 + 32], fill=RED)
d.ellipse([cx0 + 40, cy0 + 18, cx0 + 54, cy0 + 32], fill=GOLD)
d.ellipse([cx0 + 60, cy0 + 18, cx0 + 74, cy0 + 32], fill=TEAL)
d.text((cx0 + cw / 2, cy0 + 86), "Escuchar", font=f(BOLD, 20), fill=GOLD, anchor="mm")

y = cy0 + 130
for text, col, size, bold in [
    ("Deal with it.", WHITE, 30, True),
    ("Me encargo de eso.", MUTED, 19, False),
    ("I'll deal with it right now.", WHITE, 26, True),
    ("Me encargaré de eso hoy.", MUTED, 18, False),
]:
    ff = f(BOLD if bold else REG, size)
    while d.textlength(text, font=ff) > cw - 56 and size > 13:
        size -= 1
        ff = f(BOLD if bold else REG, size)
    d.text((cx0 + cw / 2, y), text, font=ff, fill=col, anchor="mm")
    y += size + 26

d.rounded_rectangle([cx0 + 34, cy0 + ch - 54, cx0 + cw - 34, cy0 + ch - 46], radius=4, fill=(60, 76, 92))
d.rounded_rectangle([cx0 + 34, cy0 + ch - 54, cx0 + 34 + (cw - 68) * 0.42, cy0 + ch - 46], radius=4, fill=GOLD)

img.save("assets/og-image.png", optimize=True)
print("guardado", img.size)
