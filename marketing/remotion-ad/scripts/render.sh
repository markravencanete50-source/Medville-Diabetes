#!/usr/bin/env bash
# Renders the ad, then brings the sound to the production guide's targets:
# -14 LUFS integrated, true peak at or below -1 dBTP, cut to the exact length
# of the voiceover so the file is precisely that many seconds.
# Output: out/medville-diabetes-ad.mp4
#   REMOTION_BROWSER=/path/to/chrome scripts/render.sh   (optional browser)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
DURATION=$(python3 -c "import json; print(json.load(open('src/voiceover.json'))['duration'])")
npx remotion render MedvilleAd out/raw.mp4 --log=error
# Pass 1 measures the mix; pass 2 applies the gain linearly, then a limiter
# holds the peaks at -1.5 dBFS, below the -1 dBTP ceiling.
read -r I TP LRA THRESH <<<"$(ffmpeg -hide_banner -i out/raw.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 \
  | python3 -c 'import sys,json,re; d=json.loads(re.search(r"\{[^{}]*\}", sys.stdin.read()).group()); print(d["input_i"], d["input_tp"], d["input_lra"], d["input_thresh"])')"
ffmpeg -y -loglevel error -i out/raw.mp4 -c:v copy \
  -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=$I:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$THRESH:linear=true,alimiter=limit=0.84:attack=5:release=50" \
  -t "$DURATION" -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/medville-diabetes-ad.mp4
rm out/raw.mp4
echo "wrote out/medville-diabetes-ad.mp4 (${DURATION} s)"
