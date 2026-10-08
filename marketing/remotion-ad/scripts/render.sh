#!/usr/bin/env bash
# Renders the ad and brings the sound to -14 LUFS, the usual level for
# online video. Output: out/medville-diabetes-ad.mp4
#   REMOTION_BROWSER=/path/to/chrome scripts/render.sh   (optional browser)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
npx remotion render MedvilleAd out/raw.mp4 --log=error
# Two pass loudness normalisation: measure, then apply linearly.
read -r I TP LRA THRESH <<<"$(ffmpeg -hide_banner -i out/raw.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 \
  | python3 -c 'import sys,json,re; d=json.loads(re.search(r"\{[^{}]*\}", sys.stdin.read()).group()); print(d["input_i"], d["input_tp"], d["input_lra"], d["input_thresh"])')"
ffmpeg -y -loglevel error -i out/raw.mp4 -c:v copy \
  -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=$I:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$THRESH:linear=true" \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/medville-diabetes-ad.mp4
rm out/raw.mp4
echo "wrote out/medville-diabetes-ad.mp4"
