import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, handheld, lerp, prog } from "../anim";
import { Icon, IconTile } from "../components/Icon";
import { Doorstep, FLIP_AT } from "./Deliver";
import { wordTime, L, WIPE } from "../timeline";

/*
  Scene 7, "And we stay with you, with ongoing resupply, and real people to
  answer your questions." The doorstep picture flips over like a card; on its
  back is the support team and the resupply cycle. The cycle's ring then
  opens out into the end card.
*/
export const FLIP = [FLIP_AT, FLIP_AT + 0.85] as const;
export const RING = { x: 1390, y: 470, r: 230 };

const NODES = [
  { icon: "calendar-check", label: "Reminder", a: -90 },
  { icon: "refresh-cw", label: "Reorder", a: 30 },
  { icon: "package-check", label: "Delivered", a: 150 },
];

const SupportContent: React.FC<{ t: number }> = ({ t }) => {
  const ringAt = wordTime("support", "ongoing") - 0.25;
  // The ring is there as the card lands; its parts arrive on "ongoing resupply".
  const ring = ep(t, FLIP[1] - 0.25, FLIP[1] + 0.5);
  const people = wordTime("support", "real") - 0.1;
  const b1 = ep(t, people, people + 0.4, ease.back);
  const b2 = ep(t, people + 0.75, people + 1.15, ease.back);
  const spin = (t - ringAt) * 60;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.canvas})`, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(circle, rgba(0,41,59,.1) 2px, transparent 2.6px)", backgroundSize: "46px 46px" }} />
      {/* A real person on the support line. */}
      <div style={{ position: "absolute", left: 130, top: 130, width: 780, height: 660, borderRadius: 36, overflow: "hidden", boxShadow: "0 40px 90px rgba(0,41,59,.25)" }}>
        <Img src={staticFile("img/support-agent.webp")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `${handheld(t, 0.8)} scale(${lerp(1.1, 1.03, prog(t, FLIP[0], WIPE.supportOut[0]))})` }} />
        <div style={{ position: "absolute", left: 24, top: 24, display: "flex", alignItems: "center", gap: 10, padding: "10px 20px 10px 12px", borderRadius: 999, background: "rgba(0,41,59,.85)", color: C.white, font: `600 22px ${BODY}` }}>
          <IconTile name="headset" size={40} />
          Medville support
        </div>
        {/* A question, and a person answering it. */}
        <div style={{ position: "absolute", right: 26, bottom: 130, maxWidth: 420, padding: "16px 22px", borderRadius: "22px 22px 6px 22px", background: C.white, font: `500 23px/1.35 ${BODY}`, color: C.navy, boxShadow: "0 16px 30px rgba(0,41,59,.25)", opacity: clamp(b1 * 2), transform: `scale(${lerp(0.7, 1, b1)})`, transformOrigin: "100% 100%" }}>
          I have a question about my sensors.
        </div>
        <div style={{ position: "absolute", left: 26, bottom: 30, maxWidth: 420, padding: "16px 22px", borderRadius: "22px 22px 22px 6px", background: C.cyan, font: `600 23px/1.35 ${BODY}`, color: C.navy, boxShadow: "0 16px 30px rgba(0,41,59,.25)", opacity: clamp(b2 * 2), transform: `scale(${lerp(0.7, 1, b2)})`, transformOrigin: "0% 100%" }}>
          Happy to help, Jordan.
        </div>
      </div>
      {/* The resupply cycle. */}
      <div style={{ position: "absolute", left: RING.x - 300, top: RING.y - 300, width: 600, height: 600, opacity: clamp(ring * 2), transform: `scale(${lerp(0.8, 1, ring)})` }}>
        <svg width={600} height={600} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <circle cx={300} cy={300} r={RING.r} fill="rgba(255,255,255,.7)" stroke="rgba(0,41,59,.12)" strokeWidth={22} />
          <circle cx={300} cy={300} r={RING.r} fill="none" stroke={C.cyan} strokeWidth={10} strokeLinecap="round" pathLength={1}
            strokeDasharray="0.28 0.72" strokeDashoffset={-spin / 360} opacity={ep(t, ringAt, ringAt + 0.4)} />
        </svg>
        <div style={{ position: "absolute", left: 300 - 90, top: 300 - 100, width: 180, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <IconTile name="refresh-cw" size={110} radius={30} shadow="0 18px 36px rgba(24,186,218,.45)" draw={ep(t, FLIP[1], FLIP[1] + 0.9)} style={{ transform: `rotate(${ep(t, ringAt, ringAt + 1.2) * 180}deg)` }} />
          <div style={{ font: `700 27px/1.15 ${DISPLAY}`, color: C.navy, textAlign: "center" }}>Ongoing resupply</div>
        </div>
        {NODES.map((n, i) => {
          const at = ringAt + 0.35 + i * 0.25;
          const p = ep(t, at, at + 0.45, ease.back);
          const rad = (n.a * Math.PI) / 180;
          const x = 300 + Math.cos(rad) * RING.r, y = 300 + Math.sin(rad) * RING.r;
          return (
            <div key={n.label} style={{ position: "absolute", left: x - 60, top: y - 40, width: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: clamp(p * 2), transform: `scale(${lerp(0.5, 1, p)})` }}>
              <IconTile name={n.icon} size={80} bg={C.navy} color={C.white} draw={ep(t, at + 0.1, at + 0.7)} shadow="0 14px 28px rgba(0,41,59,.3)" />
              <div style={{ padding: "6px 14px", borderRadius: 999, background: C.white, font: `600 19px ${BODY}`, color: C.navy, boxShadow: "0 6px 14px rgba(0,41,59,.15)" }}>{n.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Support: React.FC<{ t: number }> = ({ t }) => {
  if (t < FLIP[0] || t > WIPE.supportOut[1] + 0.05) return null;
  const out = ep(t, WIPE.supportOut[0], WIPE.supportOut[1], ease.inOut);
  const leave = (node: React.ReactNode) => (
    <AbsoluteFill style={{ transform: `translateX(${-out * 1920}px)` }}>{node}</AbsoluteFill>
  );
  if (t < FLIP[1]) {
    const p = ease.inOut(prog(t, FLIP[0], FLIP[1]));
    const angle = p * 180;
    const s = 1 - Math.sin(Math.PI * p) * 0.42;
    return leave(
      <AbsoluteFill style={{ background: C.abyss, perspective: 2200 }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `scale(${s}) rotateY(${angle}deg)` }}>
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 40 * Math.sin(Math.PI * p), overflow: "hidden" }}>
            <Doorstep t={t} />
          </div>
          <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 40 * Math.sin(Math.PI * p), overflow: "hidden" }}>
            <SupportContent t={t} />
          </div>
        </div>
      </AbsoluteFill>,
    );
  }
  return leave(<SupportContent t={t} />);
};
