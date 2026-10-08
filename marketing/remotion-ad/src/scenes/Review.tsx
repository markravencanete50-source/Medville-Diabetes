import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, handheld, lerp, prog } from "../anim";
import { Icon, IconTile } from "../components/Icon";
import { ApplicationCard, WHIP } from "./Form";
import { wordTime, L } from "../timeline";

/*
  Scene 5, "Our team reviews your information, checks your insurance, and
  works with your doctor." The application lands on the team's desk and each
  check is ticked as it is named. On "Once you qualify" it is stamped.
*/
export const STAMP = L.deliver.start + 0.12;
export const DROP = [STAMP + 0.55, STAMP + 1.15] as const; // the card leaves for the box

const CHECKS = [
  { icon: "file-check-2", label: "Information reviewed", word: "reviews" },
  { icon: "shield-check", label: "Insurance checked", word: "checks" },
  { icon: "stethoscope", label: "Doctor confirmed", word: "works" },
];
export const CARD_POS = { x: 1000, y: 120, w: 780 };

export const Review: React.FC<{ t: number }> = ({ t }) => {
  if (t < WHIP[0] || t > DROP[1] + 0.3) return null;
  const whip = ep(t, WHIP[0], WHIP[1], ease.inOut);
  const blur = Math.sin(Math.PI * prog(t, WHIP[0], WHIP[1])) * 30;
  const qualified = ep(t, STAMP, STAMP + 0.3);
  const leave = ep(t, DROP[0], DROP[1], ease.inOut);
  const callAt = wordTime("review", "doctor") - 0.5;
  const call = ep(t, callAt, callAt + 0.4, ease.back) * (1 - ep(t, STAMP - 0.2, STAMP + 0.1));
  return (
    <AbsoluteFill style={{
      transform: `translateX(${(1 - whip) * 1920}px) scale(${lerp(1, 0.92, leave)})`, opacity: 1 - ep(t, DROP[0] + 0.2, DROP[1] + 0.25),
      filter: blur > 0.5 ? `blur(${blur}px)` : undefined, background: `linear-gradient(180deg, ${C.surface}, ${C.canvas})`,
    }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(circle, rgba(0,41,59,.1) 2px, transparent 2.6px)", backgroundSize: "46px 46px" }} />
      {/* The Medville team member doing the review. */}
      <div style={{ position: "absolute", left: 130, top: 140, width: 760, height: 640, borderRadius: 36, overflow: "hidden", boxShadow: "0 40px 90px rgba(0,41,59,.25)" }}>
        <Img src={staticFile("img/doctor-documents.webp")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `${handheld(t, 0.8)} scale(${lerp(1.12, 1.04, prog(t, WHIP[0], DROP[1]))})` }} />
        <div style={{ position: "absolute", left: 24, top: 24, display: "flex", alignItems: "center", gap: 10, padding: "10px 20px 10px 12px", borderRadius: 999, background: "rgba(0,41,59,.85)", color: C.white, font: `600 22px ${BODY}` }}>
          <IconTile name="headset" size={40} draw={ep(t, WHIP[1], WHIP[1] + 0.8)} />
          Medville care team
        </div>
        {/* Calling the clinic on "works with your doctor". */}
        <div style={{
          position: "absolute", right: 24, bottom: 24, display: "flex", alignItems: "center", gap: 14, padding: "16px 24px 16px 16px",
          borderRadius: 22, background: C.white, boxShadow: "0 20px 40px rgba(0,41,59,.3)", opacity: clamp(call * 2),
          transform: `scale(${lerp(0.7, 1, call)})`, transformOrigin: "100% 100%",
        }}>
          <IconTile name="phone" size={56} draw={ep(t, callAt, callAt + 0.6)} />
          <div>
            <div style={{ font: `600 22px ${DISPLAY}`, color: C.navy }}>Calling your clinic</div>
            <div style={{ font: `500 18px ${BODY}`, color: C.inkMuted }}>Confirming your diabetes care</div>
          </div>
        </div>
      </div>
      {/* The application under review. */}
      <div style={{ position: "absolute", left: CARD_POS.x, top: CARD_POS.y, width: CARD_POS.w, opacity: 1 - prog(t, DROP[0], DROP[0] + 0.05) }}>
        <div style={{ padding: 34, borderRadius: 32, background: C.white, boxShadow: "0 40px 90px rgba(0,41,59,.2)", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: C.navy, color: C.white, font: `600 28px ${DISPLAY}`, display: "flex", alignItems: "center", justifyContent: "center" }}>JR</div>
            <div>
              <div style={{ font: `600 32px ${DISPLAY}`, color: C.navy }}>Jordan Rivera</div>
              <div style={{ font: `500 21px ${BODY}`, color: C.inkMuted }}>FreeStyle Libre 3</div>
            </div>
            <div style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 999,
              background: qualified > 0.5 ? C.navy : C.soft, color: qualified > 0.5 ? C.white : C.cyanDeep, font: `600 21px ${BODY}`,
            }}>
              {qualified > 0.5 ? <><Icon name="check" size={22} color={C.cyan} strokeWidth={3} /> Qualified</> : <><span style={{ width: 10, height: 10, borderRadius: "50%", background: C.cyan, opacity: 0.5 + 0.5 * Math.sin(t * 8) }} /> In review</>}
            </div>
          </div>
          <div style={{ height: 1, background: C.line, margin: "28px 0 10px" }} />
          {CHECKS.map((ch, i) => {
            const at = wordTime("review", ch.word) + 0.15;
            const p = ep(t, at, at + 0.4, ease.back);
            const row = ep(t, WHIP[1] - 0.1 + i * 0.1, WHIP[1] + 0.3 + i * 0.1);
            return (
              <div key={ch.label} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 0", opacity: row, transform: `translateX(${(1 - row) * 40}px)` }}>
                <IconTile name={ch.icon} size={66} bg={p > 0 ? C.cyan : C.soft} color={C.navy} draw={ep(t, at - 0.2, at + 0.5)} />
                <div style={{ font: `600 29px ${DISPLAY}`, color: p > 0 ? C.navy : C.inkMuted }}>{ch.label}</div>
                <div style={{
                  marginLeft: "auto", width: 52, height: 52, borderRadius: "50%", border: `3px solid ${p > 0 ? C.cyan : C.line}`,
                  background: p > 0 ? C.cyan : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${lerp(0.8, 1, clamp(p))})`,
                }}>
                  {p > 0 && <Icon name="check" size={30} color={C.navy} strokeWidth={3.2} draw={ep(t, at, at + 0.35)} />}
                </div>
              </div>
            );
          })}
          <div style={{ height: 10, borderRadius: 5, background: C.soft, marginTop: 14, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(CHECKS.filter((c) => t >= wordTime("review", c.word) + 0.15).length / 3) * 100}%`, background: C.cyan, borderRadius: 5 }} />
          </div>
          {/* The decision row, where the stamp lands. */}
          <div style={{ display: "flex", alignItems: "center", height: 120, marginTop: 14 }}>
            <div style={{ font: `600 22px ${BODY}`, letterSpacing: "0.16em", textTransform: "uppercase", color: C.inkMuted }}>Decision</div>
            {qualified > 0 && (
              <div style={{
                marginLeft: "auto", marginRight: 20, padding: "10px 30px", borderRadius: 18, border: `6px solid ${C.cyan}`,
                font: `800 52px ${DISPLAY}`, letterSpacing: "0.08em", color: C.cyanDeep, background: C.surface,
                transform: `rotate(-6deg) scale(${lerp(2.2, 1, ease.out(qualified))})`, opacity: clamp(qualified * 3),
              }}>QUALIFIED</div>
            )}
          </div>
        </div>
      </div>
      {/* The application arriving from the phone, carried by the pan. */}
      {t < WHIP[1] + 0.35 && (
        <div style={{
          position: "absolute", left: CARD_POS.x + 130, top: CARD_POS.y + 20,
          opacity: 1 - ep(t, WHIP[1], WHIP[1] + 0.3),
          transform: `translate(${(1 - whip) * -900}px, ${(1 - whip) * 340}px) scale(${lerp(0.85, 1, whip)}) rotate(${(1 - whip) * -4}deg)`,
        }}>
          <ApplicationCard />
        </div>
      )}
    </AbsoluteFill>
  );
};
