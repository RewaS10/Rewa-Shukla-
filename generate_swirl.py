"""
Generates a seamlessly-looping, transparent-background "Starry Night" swirl
animation: a few slow-turning vortices (echoing the painting's two big spirals),
each with nested soft flow bands and orbiting comet-like stars, plus a scattered
ambient starfield with a top-to-bottom density gradient (sparse near the top,
dense toward the bottom) so the field reads as "more stars" the further you
scroll into it.

Every motion parameter uses phase(t) = phase0 + 2*pi*k*(t/T) with integer k,
so frame 0 and frame T are mathematically identical -> perfect loop, no seams.
"""

import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

random.seed(7)
np.random.seed(7)

W, H = 1600, 1800          # canvas size (object-fit: cover handles the rest)
T = 72                      # frames per loop
FPS = 12                    # -> 6s loop, slow motion

GOLD = (255, 209, 102)
CREAM = (244, 197, 66)
MOON = (214, 222, 238)
SILVER = (232, 234, 237)

VORTICES = [
    # cx, cy (fraction of W,H), max radius (px), band count, strength (star count), direction
    dict(fx=0.24, fy=0.28, rmax=290, bands=5, stars=30, dirn=1),
    dict(fx=0.80, fy=0.20, rmax=190, bands=4, stars=20, dirn=-1),
    dict(fx=0.64, fy=0.80, rmax=230, bands=4, stars=22, dirn=1),
]

def vertical_density(y_frac):
    """0 near the very top (matches Hero's sparse sky), ramping to 1 by ~60% down."""
    t = min(1.0, max(0.0, y_frac / 0.6))
    # smoothstep
    return t * t * (3 - 2 * t)

def make_band_points(cx, cy, r0, r1, turns, phase0, k, t, steps=140, wobble=0.0, wseed=0):
    pts = []
    phase = phase0 + 2 * math.pi * k * (t / T)
    for i in range(steps):
        f = i / (steps - 1)
        ang = phase + turns * 2 * math.pi * f
        r = r0 + (r1 - r0) * f
        if wobble:
            r += wobble * math.sin(f * 9 + wseed) * (r1 - r0) * 0.06
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r * 0.94))
    return pts

def render_frame(t):
    # separate layers: soft blurred glow layer + sharp core layer, composited together
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    core = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    texture = Image.new('RGBA', (W, H), (0, 0, 0, 0))  # crisp brushwork, only lightly softened
    gdraw = ImageDraw.Draw(glow)
    cdraw = ImageDraw.Draw(core)
    tdraw = ImageDraw.Draw(texture)

    # ---- flow bands: bold, layered strokes with a couple of offset "ridge" lines
    # per band to read as directional brushwork rather than a flat blurred smear ----
    for v in VORTICES:
        cx, cy = v['fx'] * W, v['fy'] * H
        for b in range(v['bands']):
            r0 = v['rmax'] * (0.12 + 0.16 * b)
            r1 = v['rmax'] * (0.30 + 0.20 * b)
            k = 1
            phase0 = b * 1.1 + (0 if v['dirn'] > 0 else math.pi)
            turns = 0.62 * v['dirn']
            dens = vertical_density(cy / H)
            base_alpha = (0.95 - b * 0.13)
            if base_alpha <= 0.15:
                continue
            color = GOLD if b % 2 == 0 else MOON
            width = max(4, int(20 - b * 2.2))

            # wide soft under-glow (cheap: draw thick + blur whole texture layer once at the end)
            pts_main = make_band_points(cx, cy, r0, r1, turns, phase0, k * v['dirn'], t, wobble=1.0, wseed=b)
            a_main = int(150 * dens * base_alpha)
            tdraw.line(pts_main, fill=color + (a_main,), width=width, joint='curve')

            # one brighter, thinner ridge line offset slightly along the same path —
            # simulates a highlight catching the raised paint of a brush stroke
            pts_ridge = make_band_points(cx, cy, r0 * 1.015, r1 * 1.015, turns, phase0 + 0.03, k * v['dirn'], t, wobble=1.0, wseed=b + 0.4)
            a_ridge = int(120 * dens * base_alpha)
            ridge_color = tuple(min(255, c + 26) for c in color)
            tdraw.line(pts_ridge, fill=ridge_color + (a_ridge,), width=max(2, int(width * 0.35)), joint='curve')

            # one darker groove line on the other side — the shadowed edge of the ridge
            pts_groove = make_band_points(cx, cy, r0 * 0.985, r1 * 0.985, turns, phase0 - 0.03, k * v['dirn'], t, wobble=1.0, wseed=b + 0.8)
            a_groove = int(90 * dens * base_alpha)
            groove_color = tuple(max(0, c - 40) for c in color)
            tdraw.line(pts_groove, fill=groove_color + (a_groove,), width=max(2, int(width * 0.3)), joint='curve')

    texture = texture.filter(ImageFilter.GaussianBlur(2.2))  # soften brush edges just slightly, keep definition
    glow_bands = texture.filter(ImageFilter.GaussianBlur(20))  # separate wide, faint halo for atmosphere

    # ---- ambient loose starfield (gentle twinkle, minimal drift, density gradient) ----
    rnd = random.Random(42)
    for i in range(260):
        fx, fy = rnd.random(), rnd.random()
        dens = vertical_density(fy)
        if rnd.random() > (0.15 + 0.85 * dens):
            continue  # thin the field out near the top
        x, y = fx * W, fy * H
        k = rnd.choice([1, 1, 2])
        phase0 = rnd.random() * 2 * math.pi
        twinkle = 0.55 + 0.45 * math.sin(phase0 + 2 * math.pi * k * (t / T))
        base_r = rnd.uniform(1.6, 4.2) * (0.6 + 0.4 * dens)
        color = GOLD if rnd.random() < 0.7 else SILVER
        a = int(200 * twinkle * (0.35 + 0.65 * dens))
        cdraw.ellipse([x - base_r, y - base_r, x + base_r, y + base_r], fill=color + (a,))
        if base_r > 3:
            gdraw.ellipse([x - base_r * 3, y - base_r * 3, x + base_r * 3, y + base_r * 3],
                          fill=color + (int(a * 0.25),))

    # ---- vortex-orbiting stars: comet-shaped brushstrokes tangent to motion ----
    for v in VORTICES:
        cx, cy = v['fx'] * W, v['fy'] * H
        rnd2 = random.Random(int(v['fx'] * 1000 + v['fy'] * 100))
        for i in range(v['stars']):
            radius = rnd2.uniform(0.15, 1.0) * v['rmax']
            k = rnd2.choice([1, 1, 2])
            phase0 = rnd2.random() * 2 * math.pi
            ang = phase0 + v['dirn'] * 2 * math.pi * k * (t / T)
            hx = cx + math.cos(ang) * radius
            hy = cy + math.sin(ang) * radius * 0.94
            # tail: slightly behind in angle -> tapered comet stroke
            tail_ang = ang - v['dirn'] * 0.5
            tail_r = radius * 0.82
            tx = cx + math.cos(tail_ang) * tail_r
            ty = cy + math.sin(tail_ang) * tail_r * 0.94

            dens = vertical_density(hy / H)
            size = rnd2.uniform(2.2, 5.0)
            color = GOLD if rnd2.random() < 0.75 else SILVER
            a = int(215 * (0.4 + 0.6 * dens))
            if a <= 4:
                continue

            cdraw.line([(tx, ty), (hx, hy)], fill=color + (int(a * 0.55),), width=max(2, int(size * 0.7)))
            cdraw.ellipse([hx - size, hy - size, hx + size, hy + size], fill=color + (a,))
            gr = size * 4
            gdraw.ellipse([hx - gr, hy - gr, hx + gr, hy + gr], fill=color + (int(a * 0.3),))

    glow = glow.filter(ImageFilter.GaussianBlur(3))  # soften star halos slightly

    frame = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    frame = Image.alpha_composite(frame, glow_bands)  # widest, faintest atmosphere
    frame = Image.alpha_composite(frame, texture)     # defined swirl brushwork
    frame = Image.alpha_composite(frame, glow)        # star halos
    frame = Image.alpha_composite(frame, core)         # sharp star cores
    return frame

if __name__ == '__main__':
    import sys, os
    mode = sys.argv[1] if len(sys.argv) > 1 else 'sample'

    if mode == 'sample':
        f = render_frame(0)
        f.save('/home/claude/swirl/sample_frame0.png')
        f2 = render_frame(T // 4)
        f2.save('/home/claude/swirl/sample_frame18.png')
        print('sample frames written')

    elif mode == 'batch':
        # usage: python3 generate_swirl.py batch <start> <end>
        start, end = int(sys.argv[2]), int(sys.argv[3])
        os.makedirs('/home/claude/swirl/frames', exist_ok=True)
        for t in range(start, end):
            render_frame(t).save(f'/home/claude/swirl/frames/f{t:03d}.png')
        print(f'batch {start}-{end} done')

    elif mode == 'assemble':
        TARGET_W = 1000
        frame_files = sorted(os.listdir('/home/claude/swirl/frames'))
        assert len(frame_files) == T, f'expected {T} frames, found {len(frame_files)}'
        frames = []
        for fn in frame_files:
            im = Image.open(f'/home/claude/swirl/frames/{fn}').convert('RGBA')
            scale = TARGET_W / im.width
            im = im.resize((TARGET_W, round(im.height * scale)), Image.LANCZOS)
            frames.append(im)
        frames[0].save(
            '/home/claude/swirl/starry-swirl.webp',
            format='WEBP', save_all=True, append_images=frames[1:],
            duration=int(1000 / FPS), loop=0, quality=78, method=4
        )
        print('wrote starry-swirl.webp with', len(frames), 'frames at', frames[0].size)

    else:
        frames = [render_frame(t) for t in range(T)]
        frames[0].save(
            '/home/claude/swirl/starry-swirl.webp',
            format='WEBP', save_all=True, append_images=frames[1:],
            duration=int(1000 / FPS), loop=0, quality=82, method=6
        )
        print('wrote starry-swirl.webp with', len(frames), 'frames')
