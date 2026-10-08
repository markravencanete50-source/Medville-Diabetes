#!/usr/bin/env bash
# Builds the finished ad: music, frames rendered in parallel chunks, then
# joined and muxed with the soundtrack.
#
#   ./build.sh            1080p, 60 fps
#   FPS=30 ./build.sh     a faster review pass
#
# Needs node with playwright-core resolvable (NODE_PATH works), python3 with
# numpy, and ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
FPS="${FPS:-60}"
JOBS="${JOBS:-4}"
OUT="${OUT:-medville-diabetes-ad-1080p.mp4}"
DURATION=43.75
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

python3 music.py

# Split on whole frames so no frame is drawn twice or skipped at a seam.
TOTAL=$(python3 -c "print(round($DURATION*$FPS))")
PER=$(( (TOTAL + JOBS - 1) / JOBS ))
pids=()
for i in $(seq 0 $((JOBS - 1))); do
  F0=$(( i * PER )); F1=$(( (i + 1) * PER )); (( F1 > TOTAL )) && F1=$TOTAL
  (( F0 >= F1 )) && continue
  FROM=$(python3 -c "print($F0/$FPS)"); TO=$(python3 -c "print($F1/$FPS)")
  node render.cjs --fps "$FPS" --from "$FROM" --to "$TO" --out "$WORK/part$i.mp4" > "$WORK/log$i.txt" 2>&1 &
  pids+=($!)
  echo "file '$WORK/part$i.mp4'" >> "$WORK/list.txt"
done
for p in "${pids[@]}"; do wait "$p"; done

ffmpeg -y -loglevel error -f concat -safe 0 -i "$WORK/list.txt" -c copy "$WORK/video.mp4"
ffmpeg -y -loglevel error -i "$WORK/video.mp4" -i medville-ad-music.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "wrote $OUT"
