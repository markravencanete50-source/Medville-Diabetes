/*
  Timing. Every scene is placed against the voiceover, read from
  voiceover.json, which voiceover/voiceover.py writes. Change a line of the
  script, regenerate, and the scenes move with it.
*/
import vo from "./voiceover.json";

export const FPS = 30;
export const DURATION = vo.duration;
export const DURATION_FRAMES = Math.ceil(vo.duration * FPS);

export type LineId = "hook" | "brand" | "choose" | "form" | "review" | "deliver" | "support" | "cta";
export type Line = { id: LineId; start: number; end: number; spoken: string; caption: string };
export const LINES = vo.lines as Line[];
export const L = Object.fromEntries(LINES.map((l) => [l.id, l])) as Record<LineId, Line>;

/*
  Roughly when a word is spoken, by its position in the line. Speech runs at
  a near even pace, so this lands within a few frames, which is close enough
  to put a hover or a tick on the word that names it.
*/
export function wordTime(id: LineId, word: string, nth = 0): number {
  const line = L[id];
  const text = line.spoken;
  let at = -1;
  for (let i = 0; i <= nth; i++) at = text.indexOf(word, at + 1);
  if (at < 0) throw new Error(`"${word}" is not in the ${id} line`);
  return line.start + (at / text.length) * (line.end - line.start);
}
