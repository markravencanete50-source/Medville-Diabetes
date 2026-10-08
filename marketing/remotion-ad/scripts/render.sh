#!/usr/bin/env bash
# Renders the ad, then masters the sound to the production guide's targets:
# -14 LUFS integrated, true peak at or below -1 dBTP, and a length equal to
# the voiceover, so the file is exactly that many seconds.
#
#   scripts/render.sh                  render the picture and master the sound
#   SKIP_RENDER=1 scripts/render.sh    re-master out/raw.mp4 without re-rendering
#   REMOTION_BROWSER=/path scripts/render.sh   use an installed browser
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
DURATION=$(python3 -c "import json; print(json.load(open('src/voiceover.json'))['duration'])")
if [ -z "${SKIP_RENDER:-}" ]; then
  npx remotion render MedvilleAd out/raw.mp4 --log=error
fi
# Measure the unmastered mix, then set the gain that lands it on -14 LUFS.
I=$(ffmpeg -hide_banner -i out/raw.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 \
  | python3 -c 'import sys,json,re; print(json.loads(re.search(r"\{[^{}]*\}", sys.stdin.read()).group())["input_i"])')
GAIN=$(python3 -c "print(round(-14 - $I, 2))")
# A fast limiter holds the peaks at -2.5 dBFS, which leaves room for the AAC
# encoder to overshoot and still stay under -1 dBTP.
ffmpeg -y -loglevel error -i out/raw.mp4 -c:v copy \
  -af "volume=${GAIN}dB,alimiter=limit=0.75:attack=0.1:release=30:level=disabled" \
  -t "$DURATION" -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/medville-diabetes-ad.mp4
echo "wrote out/medville-diabetes-ad.mp4 (${DURATION} s, gain ${GAIN} dB)"
