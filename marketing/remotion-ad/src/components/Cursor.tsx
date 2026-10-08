import React from "react";
import { clamp } from "../anim";

/*
  A mouse pointer at (x, y), the tip of the arrow. `press` (0 to 1) is a
  click in progress: the pointer dips and a ring spreads from the tip.
*/
export const Cursor: React.FC<{ x: number; y: number; press?: number; opacity?: number; scale?: number }> = ({
  x, y, press = 0, opacity = 1, scale = 1,
}) => {
  const dip = press > 0 && press < 1 ? Math.sin(Math.PI * clamp(press * 2)) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none", zIndex: 50 }}>
      {press > 0 && press < 1 && (
        <div style={{
          position: "absolute", left: -40 * (0.3 + press), top: -40 * (0.3 + press),
          width: 80 * (0.3 + press), height: 80 * (0.3 + press), borderRadius: "50%",
          border: "4px solid #18bada", opacity: 1 - press,
        }} />
      )}
      <svg width={44 * scale} height={44 * scale} viewBox="0 0 24 24"
        style={{ transform: `scale(${1 - dip * 0.15})`, transformOrigin: "0 0", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.35))" }}>
        <path d="M3 2.5 L3 19.5 L7.6 15.2 L10.6 21.8 L13.6 20.5 L10.7 14 L17 14 Z" fill="#ffffff" stroke="#00293b" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* A finger tap on a touch screen: a soft ring where the finger lands. */
export const Tap: React.FC<{ x: number; y: number; p: number }> = ({ x, y, p }) => {
  if (p <= 0 || p >= 1) return null;
  const r = 18 + p * 34;
  return (
    <div style={{
      position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%",
      background: `rgba(24,186,218,${0.35 * (1 - p)})`, border: `3px solid rgba(24,186,218,${1 - p})`, zIndex: 40,
    }} />
  );
};
