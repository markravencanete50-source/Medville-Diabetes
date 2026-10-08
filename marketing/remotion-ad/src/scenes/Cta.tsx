import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, lerp, prog } from "../anim";
import { Icon } from "../components/Icon";
import { Cursor } from "../components/Cursor";
import { PHONE, EMAIL, SITE, HOURS } from "../data";
import { L, WIPE } from "../timeline";

/*
  Scene 8, "Medville Diabetes. Check your eligibility today, at
  medvillediabetes.com." The resupply ring opens into the end card: the
  button is clicked, and every way to get in touch follows.
*/
export const CLICK = L.cta.start + 2.35;

const CONTACTS: [string, string][] = [["globe", SITE], ["phone", PHONE], ["mail", EMAIL]];

export const Cta: React.FC<{ t: number }> = ({ t }) => {
  if (t < WIPE.providersOut[0]) return null;
  const enter = ep(t, WIPE.providersOut[0], WIPE.providersOut[1], ease.inOut);
  const camZ = ep(t, WIPE.providersOut[0] + 0.2, WIPE.providersOut[0] + 1.6);
  const s0 = L.cta.start;
  const logo = ep(t, s0 - 0.25, s0 + 0.5);
  const head = ep(t, s0 + 0.55, s0 + 1.15);
  const btn = ep(t, s0 + 1.2, s0 + 1.7, ease.back);
  const cp = ep(t, CLICK - 0.75, CLICK - 0.05, ease.inOut);
  const press = t >= CLICK ? prog(t, CLICK, CLICK + 0.45) : 0;
  const cur = { x: lerp(1500, 1080, cp), y: lerp(1010, 655, cp) + Math.sin(cp * Math.PI) * -50 };
  const curOp = ep(t, CLICK - 0.8, CLICK - 0.65) * (1 - ep(t, CLICK + 0.6, CLICK + 0.9));
  const ripple = prog(t, CLICK, CLICK + 0.7);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - enter) * 1920}px)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(1100px 620px at 50% 30%, rgba(24,186,218,.22) 0%, transparent 70%), linear-gradient(135deg, ${C.navy} 0%, ${C.abyss} 100%)` }} />
      <AbsoluteFill style={{ transform: `scale(${lerp(1.12, 1, camZ)}) translateY(${lerp(30, 0, camZ)}px)` }}>
        <Img src={staticFile("img/medville-logo-on-dark.svg")} style={{ position: "absolute", left: 960 - 300, top: 70, width: 600, opacity: logo, transform: `translateY(${(1 - logo) * 30}px) scale(${lerp(0.9, 1, logo)})` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", font: `700 84px/1.1 ${DISPLAY}`, color: C.white, opacity: head, transform: `translateY(${(1 - head) * 40}px)` }}>
          Check your eligibility today.
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 492, textAlign: "center", font: `400 34px ${BODY}`, color: C.onDarkBrand, opacity: ep(t, s0 + 0.9, s0 + 1.4) }}>
          A short form online. Our team takes it from there.
        </div>
        <div style={{ position: "absolute", left: 960 - 300, top: 580, width: 600, height: 104, opacity: clamp(btn * 2) }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: `4px solid ${C.cyan}`, opacity: ripple > 0 && ripple < 1 ? 1 - ripple : 0, transform: `scale(${1 + ripple * 0.15}, ${1 + ripple * 0.6})` }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: 999, background: C.cyan, display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
            font: `600 36px ${DISPLAY}`, color: C.navy, boxShadow: "0 20px 50px rgba(24,186,218,.45)",
            transform: `scale(${lerp(0.6, 1, btn) * (1 - Math.sin(Math.PI * clamp(press * 2)) * 0.05)})`,
          }}>
            Check Your Eligibility
            <Icon name="arrow-right" size={38} color={C.navy} strokeWidth={2.6} style={{ transform: `translateX(${Math.max(0, Math.sin((t - CLICK - 0.3) * 5)) * 7 * prog(t, CLICK + 0.3, CLICK + 0.5)}px)` }} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 742, display: "flex", justifyContent: "center", gap: 24 }}>
          {CONTACTS.map(([ic, label], i) => {
            const at = CLICK + 0.35 + i * 0.15;
            const p = ep(t, at, at + 0.5, ease.back);
            return (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 16, padding: "12px 30px 12px 12px", borderRadius: 999, background: "rgba(11,58,82,.85)",
                border: "2px solid rgba(24,186,218,.4)", font: `500 31px ${BODY}`, color: C.white, whiteSpace: "nowrap",
                opacity: clamp(p * 2), transform: `translateY(${(1 - clamp(p)) * 30}px) scale(${lerp(0.85, 1, p)})`,
              }}>
                <div style={{ width: 62, height: 62, borderRadius: "50%", background: C.cyan, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={ic} size={32} color={C.navy} strokeWidth={2.1} draw={ep(t, at + 0.1, at + 0.7)} />
                </div>
                {label}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 866, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, font: `500 27px ${BODY}`, color: C.onDarkMuted, opacity: ep(t, CLICK + 0.9, CLICK + 1.3) }}>
          <Icon name="clock" size={30} color={C.onDarkAccent} />
          {HOURS}
        </div>
        <Cursor x={cur.x} y={cur.y} press={press} opacity={curOp} scale={1.4} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
