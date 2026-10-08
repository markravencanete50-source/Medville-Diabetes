import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, handheld, lerp, prog } from "../anim";
import { Icon, IconTile } from "../components/Icon";
import { wordTime, WIPE } from "../timeline";

/*
  "Healthcare providers can refer a patient to us, and our team takes it
  from there." A referral is three steps, each ticked on the word that names
  it, then the team takes the referral on.
*/
const ROWS = [
  { icon: "file-check-2", label: "Complete the referral form", word: "refer" },
  { icon: "clipboard-check", label: "Attach the requested documents", word: "patient" },
  { icon: "lock", label: "Send through our secure method", word: "takes" },
];

export const Providers: React.FC<{ t: number }> = ({ t }) => {
  if (t < WIPE.servicesOut[0] || t > WIPE.providersOut[1] + 0.05) return null;
  const inP = ep(t, WIPE.servicesOut[0], WIPE.servicesOut[1], ease.inOut);
  const outP = ep(t, WIPE.providersOut[0], WIPE.providersOut[1], ease.inOut);
  const card = ep(t, WIPE.servicesOut[1], WIPE.servicesOut[1] + 0.6, ease.out);
  const handoffAt = wordTime("providers", "takes") + 0.25;
  const handoff = ep(t, handoffAt, handoffAt + 0.5, ease.back);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - inP) * 1920 - outP * 1920}px)`, background: `linear-gradient(180deg, ${C.surface}, ${C.canvas})` }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(circle, rgba(0,41,59,.1) 2px, transparent 2.6px)", backgroundSize: "46px 46px" }} />
      {/* A clinician with her documents, shot close and slowly moving. */}
      <div style={{ position: "absolute", left: 140, top: 210, width: 700, height: 600, borderRadius: 36, overflow: "hidden", boxShadow: "0 40px 90px rgba(0,41,59,.25)" }}>
        <Img src={staticFile("img/doctor-documents.webp")} style={{
          width: "100%", height: "100%", objectFit: "cover", transform: `${handheld(t, 0.6)} scale(${lerp(1.1, 1.03, prog(t, WIPE.servicesOut[0], WIPE.providersOut[1]))})`,
        }} />
        <div style={{ position: "absolute", left: 22, top: 22, display: "flex", alignItems: "center", gap: 12, padding: "9px 22px 9px 9px", borderRadius: 999, background: "rgba(0,41,59,.86)", color: C.white, font: `600 22px ${BODY}` }}>
          <IconTile name="stethoscope" size={42} />
          For healthcare providers
        </div>
      </div>
      {/* The referral, step by step. */}
      <div style={{
        position: "absolute", left: 920, top: 210, width: 860, height: 600, boxSizing: "border-box", padding: "56px 60px", borderRadius: 36,
        background: C.white, boxShadow: "0 40px 90px rgba(0,41,59,.16)", opacity: clamp(card * 2), transform: `translateY(${(1 - card) * 60}px)`,
      }}>
        <div style={{ font: `600 24px ${BODY}`, letterSpacing: "0.2em", textTransform: "uppercase", color: C.cyanDeep }}>Refer a patient</div>
        <div style={{ marginTop: 10, font: `700 60px/1.1 ${DISPLAY}`, color: C.navy }}>Refer in three simple steps</div>
        <div style={{ marginTop: 36 }}>
          {ROWS.map((row) => {
            const at = wordTime("providers", row.word);
            const p = ep(t, at, at + 0.4, ease.back);
            return (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 24, padding: "14px 0", opacity: clamp(card * 2) }}>
                <IconTile name={row.icon} size={84} bg={p > 0 ? C.cyan : C.soft} color={C.navy} draw={ep(t, at - 0.2, at + 0.5)} />
                <div style={{ font: `600 32px ${DISPLAY}`, color: p > 0 ? C.navy : C.inkMuted }}>{row.label}</div>
                <div style={{
                  marginLeft: "auto", width: 52, height: 52, borderRadius: "50%", border: `3px solid ${p > 0 ? C.cyan : C.line}`,
                  background: p > 0 ? C.cyan : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                  transform: `scale(${lerp(0.8, 1, clamp(p))})`,
                }}>
                  {p > 0 && <Icon name="check" size={30} color={C.navy} strokeWidth={3.2} draw={ep(t, at, at + 0.35)} />}
                </div>
              </div>
            );
          })}
        </div>
        {/* The hand-off to the team. */}
        <div style={{
          marginTop: 34, display: "inline-flex", alignItems: "center", gap: 14, padding: "16px 30px", borderRadius: 999, background: C.cyan,
          font: `600 28px ${DISPLAY}`, color: C.navy, opacity: clamp(handoff * 2), transform: `scale(${lerp(0.8, 1, clamp(handoff))})`, transformOrigin: "0% 50%",
        }}>
          We take it from here <Icon name="arrow-right" size={30} color={C.navy} strokeWidth={2.6} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
