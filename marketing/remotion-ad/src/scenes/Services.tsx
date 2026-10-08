import React from "react";
import { AbsoluteFill } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, lerp } from "../anim";
import { IconTile } from "../components/Icon";
import { wordTime, WIPE } from "../timeline";

/*
  "Our services cover insurance verification and authorization, doctor
  verification, documentation review, and ongoing resupply."
  Each service arrives on the word that names it. The descriptions are the
  website's own sentences from the Our Services page.
*/
const TILES = [
  { icon: "shield-check", word: "insurance", title: "Insurance verification and authorization", text: "We verify coverage and obtain required authorization or follow-up information." },
  { icon: "stethoscope", word: "doctor", title: "Doctor verification", text: "We contact your clinic to confirm your diabetes care and the key office details." },
  { icon: "file-check-2", word: "documentation", title: "Documentation review", text: "We check documents for accuracy, completion, and payer requirements." },
  { icon: "refresh-cw", word: "ongoing", title: "Ongoing resupply", text: "We maintain eligibility and documentation while supporting ongoing resupply shipments." },
];

const TILE = { w: 380, h: 480, gap: 36 };
const LEFT = (1920 - (4 * TILE.w + 3 * TILE.gap)) / 2;
export const SERVICE_AT = TILES.map((tile) => wordTime("services", tile.word));

export const Services: React.FC<{ t: number }> = ({ t }) => {
  if (t < WIPE.supportOut[0] || t > WIPE.servicesOut[1] + 0.05) return null;
  const inP = ep(t, WIPE.supportOut[0], WIPE.supportOut[1], ease.inOut);
  const outP = ep(t, WIPE.servicesOut[0], WIPE.servicesOut[1], ease.inOut);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - inP) * 1920 - outP * 1920}px)`, background: `linear-gradient(180deg, ${C.surface}, ${C.canvas})` }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(circle, rgba(0,41,59,.1) 2px, transparent 2.6px)", backgroundSize: "46px 46px" }} />
      <div style={{ position: "absolute", left: LEFT, top: 150, font: `600 24px ${BODY}`, letterSpacing: "0.2em", textTransform: "uppercase", color: C.cyanDeep }}>
        Our services
      </div>
      <div style={{ position: "absolute", left: LEFT, top: 190, font: `700 76px/1.08 ${DISPLAY}`, color: C.navy }}>
        What our team does for you
      </div>
      {TILES.map((tile, i) => {
        const at = SERVICE_AT[i];
        const p = ep(t, at, at + 0.5, ease.back);
        return (
          <div key={tile.word} style={{
            position: "absolute", left: LEFT + i * (TILE.w + TILE.gap), top: 380, width: TILE.w, height: TILE.h, boxSizing: "border-box",
            padding: "40px 34px", borderRadius: 32, background: C.white, boxShadow: "0 30px 60px rgba(0,41,59,.16)",
            opacity: clamp(p * 2), transform: `translateY(${(1 - p) * 70}px) scale(${lerp(0.9, 1, clamp(p))})`,
          }}>
            <IconTile name={tile.icon} size={110} radius={30} draw={ep(t, at, at + 0.9)} shadow="0 18px 36px rgba(24,186,218,.4)" />
            <div style={{ marginTop: 34, font: `600 33px/1.2 ${DISPLAY}`, color: C.navy }}>{tile.title}</div>
            <div style={{ marginTop: 18, font: `400 24px/1.45 ${BODY}`, color: C.inkMuted }}>{tile.text}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
