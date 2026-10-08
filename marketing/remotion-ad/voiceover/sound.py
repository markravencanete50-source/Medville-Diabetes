"""
Music bed and sound effects for the Medville Diabetes Remotion ad.

Everything is synthesised with numpy, so no licensed audio is used.

  public/music.wav    a bed as long as the voiceover, 96 beats per minute.
                      Its sections follow src/voiceover.json: soft under the
                      opening, a groove from "Here is how it works", a final
                      chord under the call to action. The video lowers it
                      under the voice.
  public/sfx/*.wav    short effects that the scenes place on their actions.

    python3 sound.py
"""
import json
import os
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SR = 48000
rng = np.random.default_rng(11)


def write(path, x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def fft_filter(x, lo=None, hi=None, order=2):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        g *= 1 / np.sqrt(1 + (lo / f) ** (2 * order))
    return np.fft.irfft(X * g, len(x))


def norm(x, peak=1.0):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def tt(seconds):
    return np.arange(int(seconds * SR)) / SR


def place(buf, sig, start, gain=1.0):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def reverb(x, seconds=1.6, decay=0.4, seed=0):
    r = np.random.default_rng(seed)
    t = tt(seconds)
    ir = fft_filter(r.standard_normal(len(t)) * np.exp(-t / decay), hi=6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]


# ---------------------------------------------------------------- effects
def sweep_noise(length, f0, f1, width=0.35):
    n = int(length * SR)
    x = rng.standard_normal(n)
    hop, win = 512, 2048
    out = np.zeros(n + win)
    w = np.hanning(win)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for s in range(0, n - win, hop):
        fc = f0 * (f1 / f0) ** (s / n)
        g = np.exp(-0.5 * (np.log(freqs + 1) - np.log(fc)) ** 2 / width)
        out[s:s + win] += np.fft.irfft(np.fft.rfft(x[s:s + win] * w) * g, win) * w
    return out[:n]


def whoosh(length=0.8, f0=400, f1=6000):
    x = sweep_noise(length, f0, f1)
    t = tt(length)[: len(x)]
    e = np.exp(-0.5 * ((t - length * 0.6) / (length * 0.2)) ** 2)
    return norm(x * e, 0.9)


def click():
    t = tt(0.06)
    s = fft_filter(rng.standard_normal(len(t)), lo=1800, hi=7000) * np.exp(-t / 0.006)
    s += 0.5 * np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.004)
    return norm(s, 0.9)


def tap():
    t = tt(0.08)
    s = np.sin(2 * np.pi * (500 + 900 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.018)
    return norm(s, 0.8)


def typing(length=0.9, rate=13):
    out = np.zeros(int(length * SR))
    k = 0.0
    while k < length - 0.05:
        t = tt(0.04)
        key = fft_filter(rng.standard_normal(len(t)), lo=1200, hi=6000) * np.exp(-t / 0.005)
        place(out, key, k, rng.uniform(0.5, 1.0))
        k += 1 / rate * rng.uniform(0.7, 1.3)
    return norm(out, 0.8)


def pop():
    t = tt(0.18)
    f = 380 + 520 * (1 - np.exp(-t / 0.03))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    return norm(s, 0.8)


def bell(note, decay=0.9):
    t = tt(decay * 2.5)
    f = midi(note)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.3)
         + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.1))
    return s * np.exp(-t / decay) * np.minimum(1, t / 0.002)


def chime():
    out = np.zeros(int(1.8 * SR))
    place(out, bell(84, 0.6), 0.0, 0.8)
    place(out, bell(91, 0.8), 0.09, 0.7)
    return norm(out, 0.8)


def stamp():
    t = tt(0.5)
    thump = np.sin(2 * np.pi * np.cumsum(70 + 120 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.08)
    slap = fft_filter(rng.standard_normal(len(t)), lo=600, hi=5000) * np.exp(-t / 0.025)
    return norm(thump + 0.6 * slap, 0.9)


def box():
    t = tt(0.45)
    thud = np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.09)
    card = fft_filter(rng.standard_normal(len(t)), lo=300, hi=2500) * np.exp(-t / 0.05)
    return norm(thud + 0.5 * card, 0.9)


def doorbell():
    out = np.zeros(int(2.2 * SR))
    place(out, bell(76, 0.9), 0.0, 0.8)   # ding
    place(out, bell(72, 1.1), 0.42, 0.8)  # dong
    return norm(out, 0.8)


def impact():
    t = tt(1.6)
    s = np.sin(2 * np.pi * np.cumsum(38 + 55 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.5)
    s += 0.3 * fft_filter(rng.standard_normal(len(t)), lo=2000, hi=9000) * np.exp(-t / 0.04)
    return norm(s, 0.9)


def riser(length=1.6):
    t = tt(length)
    x = sweep_noise(length, 500, 7000, 0.5)
    return norm(x * (t[: len(x)] / length) ** 2.2, 0.8)


def engine(length=2.4):
    t = tt(length)
    s = np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 110 * t + np.sin(2 * np.pi * 7 * t))
    s = fft_filter(s + 0.3 * rng.standard_normal(len(t)), hi=400)
    e = np.minimum(1, t / 0.4) * np.minimum(1, (length - t) / 0.6)
    return norm(s * e, 0.6)


# ---------------------------------------------------------------- music
def music(timing):
    dur = timing["duration"]
    lines = {l["id"]: l for l in timing["lines"]}
    n = int(dur * SR)
    t_all = np.arange(n) / SR
    beat = 60 / 96
    bar = beat * 4
    groove_from = lines["choose"]["start"] - 0.4
    final_at = lines["cta"]["start"] - 0.25
    chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 59, 64], [55, 59, 62, 64]]
    basses = [45, 41, 48, 43]
    pad, arp, bass, drums = (np.zeros(n) for _ in range(4))

    b = 0
    while b * bar < final_at:
        chord = chords[b % 4]
        length = min(bar + 0.6, final_at - b * bar + 0.6)
        t = tt(length)
        e = np.minimum(1, t / 0.5) * np.minimum(1, (length - t) / 0.6)
        sig = np.zeros(len(t))
        for note in chord:
            for det in (-0.1, 0.0, 0.1):
                f = midi(note) * 2 ** (det / 48)
                for h in range(1, 6):
                    sig += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) / h ** 1.6
        place(pad, sig * e, b * bar)
        b += 1
    # Final chord: rings from the call to action to the end.
    length = dur - final_at
    t = tt(length)
    e = np.minimum(1, t / 0.05) * np.exp(-t / 3.5)
    sig = np.zeros(len(t))
    for note in [48, 55, 60, 64, 67]:
        for h in range(1, 6):
            sig += np.sin(2 * np.pi * midi(note) * h * t) / h ** 1.6
    place(pad, sig * e * 1.2, final_at)
    pad = fft_filter(pad, lo=90, hi=2400)

    step = beat / 2
    pattern = [0, 1, 2, 3, 2, 1, 2, 3]
    k, t0 = 0, bar / 2
    while t0 < final_at:
        chord = chords[int(t0 // bar) % 4]
        f = midi(chord[pattern[k % 8]] + 12)
        t = tt(0.42)
        s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.12) * np.minimum(1, t / 0.004)
        place(arp, s, t0, 1.0 if k % 4 == 0 else 0.7)
        k += 1
        t0 += step
    arp = fft_filter(arp, lo=200, hi=5000) * np.clip((t_all - 1.0) / 3.0, 0, 1)

    t0 = np.ceil(groove_from / step) * step
    while t0 < final_at:
        f = midi(basses[int(t0 // bar) % 4])
        t = tt(0.3)
        s = np.tanh(2.2 * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t))) * np.exp(-t / 0.16) * np.minimum(1, t / 0.006)
        place(bass, s, t0, 0.9 if round(t0 / step) % 2 == 0 else 0.6)
        t0 += step
    bass = fft_filter(bass, hi=900)

    tk = tt(0.45)
    kick = np.sin(2 * np.pi * np.cumsum(45 + 95 * np.exp(-tk / 0.045)) / SR) * np.exp(-tk / 0.17)
    th = tt(0.09)
    hat = fft_filter(rng.standard_normal(len(th)), lo=7000) * np.exp(-th / 0.025)
    i0 = int(np.ceil(groove_from / beat))
    i = i0
    while i * beat < final_at:
        place(drums, kick, i * beat, 0.85)
        place(drums, hat, i * beat + beat / 2, 0.25)
        i += 1
    place(drums, kick, final_at, 1.0)

    pad, arp, bass, drums = map(norm, (pad, arp, bass, drums))
    dry = 0.34 * pad + 0.32 * arp + 0.4 * bass + 0.62 * drums
    send = 0.3 * pad + 0.3 * arp + 0.04 * drums
    left = fft_filter(dry + 0.5 * reverb(send, seed=1) + 0.04 * arp, lo=35)
    right = fft_filter(dry + 0.5 * reverb(send, seed=2), lo=35)
    mix = np.stack([left, right], axis=1)
    mix = np.tanh(mix / np.max(np.abs(mix)) * 1.1)
    mix = mix / np.max(np.abs(mix)) * 10 ** (-1 / 20)
    mix *= (np.clip(t_all / 0.05, 0, 1) * np.clip((dur - t_all) / 1.5, 0, 1))[:, None]
    return mix


def main():
    timing = json.load(open(os.path.join(ROOT, "src", "voiceover.json")))
    os.makedirs(os.path.join(ROOT, "public", "sfx"), exist_ok=True)
    write(os.path.join(ROOT, "public", "music.wav"), music(timing))
    effects = {
        "whoosh-up": whoosh(0.8, 400, 6000), "whoosh-down": whoosh(0.8, 5000, 400),
        "whoosh-short": whoosh(0.5, 900, 4000), "click": click(), "tap": tap(),
        "typing": typing(), "pop": pop(), "chime": chime(), "stamp": stamp(),
        "box": box(), "doorbell": doorbell(), "impact": impact(), "riser": riser(),
        "engine": engine(),
    }
    for name, sig in effects.items():
        write(os.path.join(ROOT, "public", "sfx", name + ".wav"), sig)
    print("wrote music.wav and", len(effects), "effects")


if __name__ == "__main__":
    main()
