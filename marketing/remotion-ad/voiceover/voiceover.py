"""
AI voiceover for the Medville Diabetes Remotion ad.

Synthesised with Kokoro (Apache 2.0 licence, voice af_heart), so the voice is
free to use in a commercial advertisement. Each line is generated on its own,
then the lines are joined with short pauses into public/voiceover.wav, and the
start and end of every line is written to src/voiceover.json. The video reads
that file, so every scene is timed to the sentence that describes it.

    python3 voiceover.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin
"""
import argparse
import json
import os

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# id, the words spoken, the caption shown, the pause after the line (seconds).
# Spoken text differs from the caption only where a word is written for the ear.
LINES = [
    ("hook", "Managing diabetes takes work every day. Getting your CGM should be simple.",
     "Managing diabetes takes work every day. Getting your CGM should be simple.", 0.45),
    ("brand", "Medville Diabetes is a United States supplier of CGMs, sensors, and insulin pumps.",
     "Medville Diabetes is a United States supplier of CGMs, sensors, and insulin pumps.", 0.4),
    ("choose", "Here is how it works. First, choose your device, like the FreeStyle Libre three, or the Dexcom G seven.",
     "Here is how it works. First, choose your device, like the FreeStyle Libre 3 or the Dexcom G7.", 0.35),
    ("form", "Next, fill out our short eligibility form online.",
     "Next, fill out our short eligibility form online.", 1.1),
    ("review", "Our team reviews your information, checks your insurance, and works with your doctor.",
     "Our team reviews your information, checks your insurance, and works with your doctor.", 0.6),
    ("deliver", "Once you qualify, we ship your CGM and supplies straight to your door.",
     "Once you qualify, we ship your CGM and supplies straight to your door.", 0.7),
    ("support", "And we stay with you, with ongoing resupply, and real people to answer your questions.",
     "And we stay with you, with ongoing resupply and real people to answer your questions.", 0.45),
    ("cta", "Medville Diabetes. Check your eligibility today, at medville diabetes dot com.",
     "Medville Diabetes. Check your eligibility today at medvillediabetes.com.", 0.0),
]
LEAD_IN = 0.6   # silence before the first word
TAIL = 2.6      # the end card holds after the last word
SPEED = 1.08
VOICE = "af_heart"


def trim(a, sr, thresh=0.004):
    """Cut leading and trailing silence, keeping 40 ms either side."""
    idx = np.where(np.abs(a) > thresh)[0]
    if len(idx) == 0:
        return a
    pad = int(0.04 * sr)
    return a[max(0, idx[0] - pad): min(len(a), idx[-1] + pad)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--voices", required=True)
    args = ap.parse_args()
    k = Kokoro(args.model, args.voices)
    sr = 24000
    out = [np.zeros(int(LEAD_IN * sr), dtype=np.float32)]
    t = LEAD_IN
    timing = []
    for key, spoken, caption, gap in LINES:
        a, sr = k.create(spoken, voice=VOICE, speed=SPEED, lang="en-us")
        a = trim(a.astype(np.float32), sr)
        dur = len(a) / sr
        timing.append({"id": key, "start": round(t, 3), "end": round(t + dur, 3), "spoken": spoken, "caption": caption})
        out += [a, np.zeros(int(gap * sr), dtype=np.float32)]
        t += dur + gap
    out.append(np.zeros(int(TAIL * sr), dtype=np.float32))
    audio = np.concatenate(out)
    audio = audio / np.max(np.abs(audio)) * 0.89
    sf.write(os.path.join(ROOT, "public", "voiceover.wav"), audio, sr)
    total = len(audio) / sr
    with open(os.path.join(ROOT, "src", "voiceover.json"), "w") as f:
        json.dump({"voice": VOICE, "duration": round(total, 3), "lines": timing}, f, indent=2)
    for x in timing:
        print(f'{x["id"]:8} {x["start"]:6.2f} to {x["end"]:6.2f}')
    print("total", round(total, 2), "s")


if __name__ == "__main__":
    main()
