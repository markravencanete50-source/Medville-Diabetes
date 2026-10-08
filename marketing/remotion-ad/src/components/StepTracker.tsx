import React from "react";
import { C, BODY } from "../theme";
import { ep } from "../anim";
import { Icon } from "./Icon";

/*
  The four steps of the process, top left, while the process is shown.
  The current step is filled, finished steps are ticked.
*/
export const STEPS = [
  { label: "Choose", from: 12.55 },
  { label: "Apply", from: 18.4 },
  { label: "Review", from: 22.35 },
  { label: "Delivered", from: 27.75 },
];
export const TRACKER = [12.55, 31.3] as const;

export const StepTracker: React.FC<{ t: number }> = ({ t }) => {
  if (t < TRACKER[0] - 0.1 || t > TRACKER[1] + 0.4) return null;
  const vis = ep(t, TRACKER[0], TRACKER[0] + 0.4) * (1 - ep(t, TRACKER[1], TRACKER[1] + 0.3));
  const cur = STEPS.reduce((k, s, i) => (t >= s.from ? i : k), 0);
  return (
    <div style={{
      position: "absolute", left: 40, top: 34, display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 999,
      background: "rgba(0,24,36,.82)", boxShadow: "0 10px 30px rgba(0,0,0,.25)", opacity: vis, transform: `translateY(${(1 - vis) * -20}px)`, zIndex: 90,
    }}>
      {STEPS.map((s, i) => {
        const on = i === cur;
        const done = i < cur;
        const p = ep(t, s.from, s.from + 0.3);
        return (
          <div key={s.label} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 20px 9px 9px", borderRadius: 999,
            background: on ? `rgba(24,186,218,${0.25 + 0.75 * p})` : "transparent",
            color: on ? C.navy : done ? C.white : C.onDarkMuted, font: `600 22px ${BODY}`,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: on ? C.navy : done ? C.cyan : "rgba(255,255,255,.12)", color: on ? C.white : C.navy, font: `700 18px ${BODY}`,
            }}>
              {done ? <Icon name="check" size={20} color={C.navy} strokeWidth={3.2} /> : <span style={{ color: on ? C.white : C.onDarkMuted }}>{i + 1}</span>}
            </div>
            {s.label}
          </div>
        );
      })}
    </div>
  );
};
