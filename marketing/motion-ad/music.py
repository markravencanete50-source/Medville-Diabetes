"""
Original music bed and sound design for the Medville Diabetes motion ad.

Everything is synthesised here with numpy, so there is no licensed audio in
the ad. 96 beats per minute, 2.5 seconds per bar, so the scene cuts in
ad.js land on bar lines. Writes medville-ad-music.wav (48 kHz, stereo).

    python3 music.py
"""
import wave
import numpy as np

SR = 48000
DUR = 43.75
N = int(SR * DUR)
BEAT = 60 / 96
BAR = BEAT * 4
rng = np.random.default_rng(11)
t_all = np.arange(N) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(buf, sig, start, gain=1.0):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def fft_filter(x, lo=None, hi=None, order=2):
    """Butterworth shaped magnitude response applied in the frequency domain."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        g *= 1 / np.sqrt(1 + (lo / f) ** (2 * order))
    return np.fft.irfft(X * g, len(x))


def env_adsr(n, a, d, s, r, sustain_len):
    e = np.zeros(n)
    A, D, S, R = int(a * SR), int(d * SR), int(sustain_len * SR), int(r * SR)
    k = 0
    seg = min(A, n - k); e[k:k + seg] = np.linspace(0, 1, A, endpoint=False)[:seg]; k += seg
    seg = min(D, n - k); e[k:k + seg] = np.linspace(1, s, D, endpoint=False)[:seg]; k += seg
    seg = min(S, n - k); e[k:k + seg] = s; k += seg
    seg = min(R, n - k); e[k:k + seg] = np.linspace(s, 0, R)[:seg]
    return e


# Chords, one per bar: Am7, Fmaj7, Cmaj7, G6. Warm and hopeful.
CHORDS = [
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [48, 55, 59, 64],
    [55, 59, 62, 64],
]
BASS = [45, 41, 48, 43]
n_bars = int(np.ceil(DUR / BAR))
FINAL_BAR = 16  # the last chord rings out from here (40.0 s)

pad = np.zeros(N)
arp = np.zeros(N)
bass = np.zeros(N)
drums = np.zeros(N)
fx = np.zeros(N)
bells = np.zeros(N)

# ---------- pad ----------
for b in range(n_bars):
    chord = CHORDS[b % 4] if b < FINAL_BAR else [48, 55, 60, 64, 67]
    length = BAR + 0.6 if b < FINAL_BAR else DUR - b * BAR
    n = int(length * SR)
    tt = np.arange(n) / SR
    e = env_adsr(n, 0.5, 0.4, 0.8, 0.9 if b < FINAL_BAR else 2.2, length - 1.8 if b < FINAL_BAR else max(0, length - 3.2))
    sig = np.zeros(n)
    for note in chord:
        f = midi(note)
        for det in (-0.12, 0.0, 0.12):
            ff = f * 2 ** (det / 12 / 4)
            for h in range(1, 6):
                sig += np.sin(2 * np.pi * ff * h * tt + rng.uniform(0, 6.28)) / h ** 1.6
    sig *= e * (1 + 0.04 * np.sin(2 * np.pi * 0.3 * tt))
    place(pad, sig, b * BAR)
pad = fft_filter(pad, lo=90, hi=2400)

# ---------- arpeggio, sixteenth notes from bar 1 ----------
step = BEAT / 2
pattern = [0, 1, 2, 3, 2, 1, 2, 3]
k = 0
t0 = BAR
while t0 < FINAL_BAR * BAR:
    b = int(t0 // BAR)
    chord = CHORDS[b % 4]
    note = chord[pattern[k % 8]] + 12
    n = int(0.42 * SR)
    tt = np.arange(n) / SR
    f = midi(note)
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) + 0.12 * np.sin(2 * np.pi * 3 * f * tt))
    s *= np.exp(-tt / 0.12) * np.minimum(1, tt / 0.004)
    accent = 1.0 if k % 4 == 0 else 0.7
    place(arp, s, t0, accent)
    k += 1
    t0 += step
arp = fft_filter(arp, lo=200, hi=5000)
# Arp swells in during the hook, full from the logo.
arp *= np.clip((t_all - 2.5) / 2.5, 0, 1)

# ---------- bass, eighth note pulse from the products scene ----------
t0 = 4 * BAR
while t0 < FINAL_BAR * BAR:
    b = int(t0 // BAR)
    f = midi(BASS[b % 4])
    n = int(0.3 * SR)
    tt = np.arange(n) / SR
    s = np.tanh(2.2 * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)))
    s *= np.exp(-tt / 0.16) * np.minimum(1, tt / 0.006)
    place(bass, s, t0, 0.9 if (t0 / step) % 2 < 0.5 else 0.6)
    t0 += step
bass = fft_filter(bass, hi=900)


# ---------- drums ----------
def kick():
    n = int(0.45 * SR)
    tt = np.arange(n) / SR
    f = 45 + 95 * np.exp(-tt / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt / 0.17) * np.minimum(1, tt / 0.002)


def hat():
    n = int(0.09 * SR)
    tt = np.arange(n) / SR
    return fft_filter(rng.standard_normal(n), lo=7000) * np.exp(-tt / 0.025)


def clap():
    n = int(0.25 * SR)
    tt = np.arange(n) / SR
    s = fft_filter(rng.standard_normal(n), lo=900, hi=5000)
    e = np.exp(-tt / 0.07)
    for d in (0.0, 0.011, 0.022):
        e += 0.6 * np.exp(-np.maximum(0, tt - d) / 0.006) * (tt >= d)
    return s * e * 0.5


K, Hh, C = kick(), hat(), clap()
for i in range(int(DUR / BEAT) + 1):
    tb = i * BEAT
    if 4 * BAR <= tb < FINAL_BAR * BAR:
        place(drums, K, tb, 0.85)
        if i % 2 == 1:
            place(drums, C, tb, 0.35)
    if 6 * BAR <= tb < FINAL_BAR * BAR:
        place(drums, Hh, tb + BEAT / 2, 0.22)
# Final downbeat on the end card.
place(drums, K, FINAL_BAR * BAR, 1.0)


# ---------- transitions ----------
def whoosh(center, length=0.9, f0=300, f1=5000, gain=0.5):
    """Noise swept through a moving band, peaking at the cut."""
    n = int(length * SR)
    x = rng.standard_normal(n)
    hop, win = 512, 2048
    out = np.zeros(n + win)
    w = np.hanning(win)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for start in range(0, n - win, hop):
        p = start / n
        fc = f0 * (f1 / f0) ** p
        g = np.exp(-0.5 * (np.log(freqs + 1) - np.log(fc)) ** 2 / 0.35)
        seg = np.fft.irfft(np.fft.rfft(x[start:start + win] * w) * g, win)
        out[start:start + win] += seg * w
    out = out[:n]
    tt = np.arange(n) / SR
    e = np.exp(-0.5 * ((tt - length * 0.6) / (length * 0.2)) ** 2)
    out = out * e
    out /= np.max(np.abs(out)) + 1e-9
    place(fx, out, center - length * 0.6, gain)


def riser(start, end, gain=0.35):
    n = int((end - start) * SR)
    tt = np.arange(n) / SR
    x = fft_filter(rng.standard_normal(n), lo=600, hi=9000)
    e = (tt / tt[-1]) ** 2.2
    place(fx, x / np.max(np.abs(x)) * e, start, gain)


def boom(at, gain=0.8):
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    f = 38 + 50 * np.exp(-tt / 0.08)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.5)
    place(fx, s, at, gain)


def bell(at, note, gain=0.25, decay=1.2):
    n = int(decay * 2.5 * SR)
    tt = np.arange(n) / SR
    f = midi(note)
    s = np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.3) + 0.2 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / 0.12)
    s *= np.exp(-tt / decay) * np.minimum(1, tt / 0.002)
    place(bells, s, at, gain)


def tick(at, gain=0.5):
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    s = fft_filter(rng.standard_normal(n), lo=2500, hi=9000) * np.exp(-tt / 0.008)
    place(fx, s, at, gain)


riser(3.0, 4.95, 0.3)
boom(4.95, 0.75)              # circle wipe into the logo
for i, nt in enumerate([76, 79, 84, 88]):
    bell(6.6 + i * 0.09, nt, 0.12)   # logo shine
whoosh(9.92, 0.8, 400, 6000, 0.55)   # whip pan to products
for tt_ in (11.25, 12.5, 13.75):
    whoosh(tt_, 0.5, 900, 4000, 0.16)  # carousel turns
whoosh(15.15, 1.0, 4000, 300, 0.45)  # zoom through
for tt_ in (19.5, 23.6):
    whoosh(tt_, 0.9, 500, 3000, 0.25)  # camera travels between steps
for i, tt_ in enumerate([15.9, 19.95, 24.05]):
    bell(tt_, [81, 84, 88][i], 0.10, 0.6)  # each step ticked on the rail
whoosh(27.5, 0.8, 5000, 500, 0.5)    # crane down to services
whoosh(33.78, 0.8, 300, 4000, 0.45)  # cube turn
whoosh(37.73, 0.75, 600, 7000, 0.5)  # diagonal wipe to the end card
tick(39.85, 0.7)                     # cursor click
bell(39.87, 88, 0.16, 0.8)
bell(39.95, 93, 0.10, 0.8)


# ---------- reverb ----------
def reverb(x, seconds=1.8, decay=0.45, seed=0):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    tt = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-tt / decay)
    ir = fft_filter(ir, hi=6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    size = 1 << int(np.ceil(np.log2(L)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return y


# Each stem is levelled to a peak of 1 first, so the gains below are the mix.
def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)


pad, arp, bass, drums, fx, bells = map(norm, (pad, arp, bass, drums, fx, bells))
dry = 0.30 * pad + 0.34 * arp + 0.42 * bass + 0.72 * drums + 0.55 * fx + 0.40 * bells
send = 0.28 * pad + 0.30 * arp + 0.04 * drums + 0.22 * fx + 0.45 * bells
left = dry + 0.55 * reverb(send, seed=1)
right = dry + 0.55 * reverb(send, seed=2)
# A touch of width: the arp leans left, the bells lean right.
left += 0.05 * arp
right += 0.05 * bells

# Clear the rumble below the kick drum's fundamental.
left, right = fft_filter(left, lo=35), fft_filter(right, lo=35)
mix = np.stack([left, right], axis=1)
mix = np.tanh(mix / (np.max(np.abs(mix)) + 1e-9) * 1.1)
mix /= np.max(np.abs(mix))
mix *= 10 ** (-1.0 / 20)
fade_in = np.clip(t_all / 0.05, 0, 1)
fade_out = np.clip((DUR - t_all) / 1.6, 0, 1)
mix *= (fade_in * fade_out)[:, None]

pcm = (mix * 32767).astype("<i2")
with wave.open("medville-ad-music.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote medville-ad-music.wav", DUR, "s")
