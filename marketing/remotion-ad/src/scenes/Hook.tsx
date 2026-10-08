import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, handheld, lerp, prog } from "../anim";
import { Icon } from "../components/Icon";

/*
  Scene 1, "Managing diabetes takes work every day."
  Daily life, shot as if on camera, with a CGM reading drawing itself beside
  her. On "should be simple" the reading card grows to fill the screen and
  becomes the light background of the brand scene.
*/
const TRACE = [[0, 92], [60, 80], [120, 96], [180, 70], [240, 78], [300, 52], [360, 64], [420, 46], [480, 58], [520, 50]];
function tracePath(pts: number[][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const D = tracePath(TRACE);

export const EXPAND = [4.95, 5.6] as const;

export const Hook: React.FC<{ t: number }> = ({ t }) => {
  if (t > EXPAND[1] + 0.05) return null;
  const ex = ep(t, EXPAND[0], EXPAND[1], ease.inOut);
  const inP = ep(t, 0.35, 1.2);
  const draw = ep(t, 0.9, 3.6, ease.soft);
  const value = Math.round(lerp(96, 112, ep(t, 0.9, 3.4, ease.soft)));
  const content = 1 - prog(t, EXPAND[0], EXPAND[0] + 0.25);
  // The card, from its place on the left to the whole frame.
  const box = {
    x: lerp(150, 0, ex), y: lerp(250, 0, ex), w: lerp(620, 1920, ex), h: lerp(470, 1080, ex), r: lerp(36, 0, ex),
  };
  const tilt = (1 - ex) * lerp(-16, -7, inP);
  return (
    <AbsoluteFill style={{ background: C.abyss }}>
      <AbsoluteFill style={{ transform: handheld(t, 1.2) }}>
        <Img src={staticFile("img/woman-phone-home.webp")} style={{
          position: "absolute", left: -60, top: -40, width: 2040, height: 1160, objectFit: "cover",
          transform: `scale(${lerp(1.04, 1.13, prog(t, 0, 5.6))})`, transformOrigin: "62% 45%",
          filter: `blur(${ex * 10}px) brightness(${1 - ex * 0.3})`,
        }} />
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,24,36,.72) 0%, rgba(0,24,36,.35) 42%, rgba(0,24,36,0) 70%)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ perspective: 1400 }}>
        <div style={{
          position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: box.r, overflow: "hidden",
          background: `linear-gradient(180deg, ${C.surface} 0%, ${C.canvas} 100%)`,
          boxShadow: `0 40px 90px rgba(0,10,18,${0.45 * (1 - ex)})`,
          opacity: clamp(inP * 2), transform: `translateY(${(1 - inP) * 60}px) rotateY(${tilt}deg) scale(${lerp(0.92, 1, inP)})`,
          transformOrigin: "0% 50%",
        }}>
          <div style={{ position: "absolute", left: 40, top: 36, right: 40, opacity: content }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: C.cyan, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="activity" size={30} color={C.navy} strokeWidth={2.3} draw={ep(t, 0.6, 1.4)} />
              </div>
              <div style={{ font: `600 26px ${BODY}`, color: C.inkMuted }}>Glucose</div>
              <div style={{ marginLeft: "auto", padding: "6px 16px", borderRadius: 999, background: C.soft, font: `600 20px ${BODY}`, color: C.cyanDeep }}>Now</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 20 }}>
              <div style={{ font: `800 128px/1 ${DISPLAY}`, color: C.navy, fontVariantNumeric: "tabular-nums" }}>{value}</div>
              <div style={{ font: `600 30px ${BODY}`, color: C.inkMuted }}>mg/dL</div>
              <div style={{ marginLeft: 8, transform: "translateY(-8px)" }}>
                <Icon name="arrow-right" size={52} color={C.teal} strokeWidth={2.6} />
              </div>
            </div>
            <svg width={540} height={130} viewBox="0 0 540 130" style={{ marginTop: 18, overflow: "visible" }}>
              <rect x={0} y={40} width={540} height={50} fill="rgba(24,186,218,.12)" rx={8} />
              <path d={D} fill="none" stroke="rgba(24,186,218,.35)" strokeWidth={14} strokeLinecap="round" pathLength={1}
                strokeDasharray="1 1" strokeDashoffset={1 - draw} style={{ filter: "blur(5px)" }} />
              <path d={D} fill="none" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" pathLength={1}
                strokeDasharray="1 1" strokeDashoffset={1 - draw} />
            </svg>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
