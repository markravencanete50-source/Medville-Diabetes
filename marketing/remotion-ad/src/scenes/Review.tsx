import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, handheld, lerp, prog } from "../anim";
import { Icon, IconTile } from "../components/Icon";
import { WHIP } from "./Form";
import { wordTime, L } from "../timeline";

/*
  Scene 5, "Our team reviews your information, checks your insurance, and
  works with your doctor."

  A video call. A Medville care team member is on camera at the top left.
  Below, the doctor's office is called and answers. The application is on
  the shared screen at the right: each check ticks as it is named, and a
  secure message asks the office to confirm the diabetes care. On "Once you
  qualify" the application is stamped.
*/
export const STAMP = L.deliver.start + 0.12;
export const DROP = [STAMP + 0.55, STAMP + 1.15] as const;
export const CARD_POS = { x: 1000, y: 110, w: 780 };

const CALL_START = wordTime("review", "checks") - 0.1; // the doctor's office is called
export const CONNECT = wordTime("review", "works") - 0.25; // the office answers
export const REPLY = wordTime("review", "doctor") + 0.35; // the office confirms in writing
const ASK = wordTime("review", "works") - 0.1; // the team sends the question
const TALK_END = wordTime("review", "works") - 0.05;

const CHECKS = [
  { icon: "file-check-2", label: "Information reviewed", word: "reviews" },
  { icon: "shield-check", label: "Insurance checked", word: "checks" },
  { icon: "stethoscope", label: "Doctor confirmed", word: "works" },
];

/* A video tile: a photograph held by a slow hand-held drift. */
const Tile: React.FC<{ x: number; y: number; w: number; h: number; src: string; t: number; zoom: number; children?: React.ReactNode }> = ({
  x, y, w, h, src, t, zoom, children,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 30, overflow: "hidden", background: C.navy, boxShadow: "0 30px 70px rgba(0,41,59,.22)" }}>
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `${handheld(t, 0.7)} scale(${zoom})` }} />
    {children}
  </div>
);

const Chip: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    position: "absolute", display: "flex", alignItems: "center", gap: 12, padding: "9px 20px 9px 9px", borderRadius: 999,
    background: "rgba(0,41,59,.86)", color: C.white, font: `600 21px ${BODY}`, whiteSpace: "nowrap", ...style,
  }}>{children}</div>
);

/* Audio level bars, moving while someone talks. */
const Bars: React.FC<{ t: number; on: number }> = ({ t, on }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4, height: 26, opacity: on, marginLeft: 6 }}>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{ width: 5, borderRadius: 3, background: C.cyan, height: 8 + 18 * Math.abs(Math.sin(t * (9 + i * 2.3) + i)) }} />
    ))}
  </div>
);

const CallButton: React.FC<{ name: string; bg: string; color: string }> = ({ name, bg, color }) => (
  <div style={{ width: 58, height: 58, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(0,0,0,.25)" }}>
    <Icon name={name} size={28} color={color} strokeWidth={2.2} />
  </div>
);

/* A secure message between the team and the doctor's office. */
const Bubble: React.FC<{ who: string; text: string; p: number; side: "left" | "right" }> = ({ who, text, p, side }) => {
  const right = side === "right";
  return (
    <div style={{
      alignSelf: right ? "flex-end" : "flex-start", maxWidth: 600, padding: "14px 22px 16px", borderRadius: right ? "24px 24px 6px 24px" : "24px 24px 24px 6px",
      background: right ? C.cyan : C.white, boxShadow: "0 14px 30px rgba(0,41,59,.14)",
      opacity: clamp(p * 2), transform: `translateY(${(1 - p) * 26}px) scale(${lerp(0.9, 1, clamp(p))})`,
      transformOrigin: right ? "100% 100%" : "0% 100%",
    }}>
      <div style={{ font: `600 14px ${BODY}`, letterSpacing: "0.08em", textTransform: "uppercase", color: right ? C.navy : C.cyanDeep, marginBottom: 4 }}>{who}</div>
      <div style={{ font: `500 24px/1.3 ${BODY}`, color: C.navy }}>{text}</div>
    </div>
  );
};

export const Review: React.FC<{ t: number }> = ({ t }) => {
  if (t < WHIP[0] || t > DROP[1] + 0.3) return null;
  const whip = ep(t, WHIP[0], WHIP[1], ease.inOut);
  const blur = Math.sin(Math.PI * prog(t, WHIP[0], WHIP[1])) * 30;
  const qualified = ep(t, STAMP, STAMP + 0.3);
  const leave = ep(t, DROP[0], DROP[1], ease.inOut);
  const ringing = ep(t, CALL_START, CALL_START + 0.35);
  const connected = ep(t, CONNECT, CONNECT + 0.3);
  const secs = Math.max(0, Math.floor(t - CONNECT));
  const talking = ep(t, L.review.start, L.review.start + 0.2) * (1 - ep(t, TALK_END, TALK_END + 0.2));
  const ask = ep(t, ASK, ASK + 0.35, ease.back);
  const reply = ep(t, REPLY, REPLY + 0.35, ease.back);
  return (
    <AbsoluteFill style={{
      transform: `translateX(${(1 - whip) * 1920}px) scale(${lerp(1, 0.92, leave)})`,
      opacity: 1 - ep(t, DROP[0] + 0.2, DROP[1] + 0.25),
      filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
      background: `linear-gradient(180deg, ${C.surface}, ${C.canvas})`,
    }}>
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(circle, rgba(0,41,59,.1) 2px, transparent 2.6px)", backgroundSize: "46px 46px" }} />

      {/* The Medville care team member, on camera. */}
      <Tile x={110} y={120} w={580} h={410} src="img/support-agent.webp" t={t} zoom={lerp(1.1, 1.03, prog(t, WHIP[0], DROP[1]))}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 30, border: `6px solid ${C.cyan}`, opacity: talking }} />
        <Chip style={{ left: 18, top: 18, padding: "7px 18px 7px 7px" }}>
          <IconTile name="headset" size={40} draw={ep(t, WHIP[1], WHIP[1] + 0.6)} />
          Medville care team
          <Bars t={t} on={talking} />
        </Chip>
      </Tile>

      {/* The doctor's office: called, then connected. */}
      <div style={{ position: "absolute", left: 110, top: 560, width: 580, height: 330, opacity: ringing }}>
        <Tile x={0} y={0} w={580} h={330} src="img/doctor-documents.webp" t={t} zoom={lerp(1.08, 1.02, prog(t, CALL_START, DROP[1]))}>
          {/* Calling: a dark veil until the office answers. */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,24,36,.62)", opacity: 1 - connected, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: C.white, font: `600 26px ${DISPLAY}` }}>
            <Icon name="phone-call" size={44} color={C.cyan} strokeWidth={2} style={{ transform: `rotate(${Math.sin(t * 14) * 12}deg)` }} />
            Calling your doctor's office
          </div>
          <Chip style={{ left: 18, top: 18, padding: "7px 18px 7px 7px", opacity: connected }}>
            <IconTile name="stethoscope" size={40} />
            Your doctor's office
          </Chip>
          <Chip style={{ right: 18, top: 18, padding: "7px 18px", opacity: connected, font: `600 21px ${BODY}`, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.cyan }} />
            00:{String(secs).padStart(2, "0")}
          </Chip>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, display: "flex", justifyContent: "center", gap: 14, opacity: connected }}>
            <CallButton name="mic" bg={C.white} color={C.navy} />
            <CallButton name="video" bg={C.white} color={C.navy} />
            <CallButton name="phone-off" bg={C.navy} color={C.white} />
          </div>
        </Tile>
      </div>

      {/* The shared screen: the application, checked as the call goes on. */}
      <div style={{ position: "absolute", left: CARD_POS.x, top: 64, font: `600 19px ${BODY}`, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cyanDeep }}>
        Shared screen: eligibility form
      </div>
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
              {qualified > 0.5
                ? <><Icon name="check" size={22} color={C.cyan} strokeWidth={3} /> Qualified</>
                : <><span style={{ width: 10, height: 10, borderRadius: "50%", background: C.cyan, opacity: 0.5 + 0.5 * Math.sin(t * 8) }} /> In review</>}
            </div>
          </div>
          <div style={{ height: 1, background: C.line, margin: "24px 0 6px" }} />
          {CHECKS.map((ch) => {
            const at = wordTime("review", ch.word) + 0.15;
            const p = ep(t, at, at + 0.4, ease.back);
            const row = ep(t, WHIP[1] - 0.1, WHIP[1] + 0.3);
            return (
              <div key={ch.label} style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 0", opacity: row, transform: `translateX(${(1 - row) * 40}px)` }}>
                <IconTile name={ch.icon} size={62} bg={p > 0 ? C.cyan : C.soft} color={C.navy} draw={ep(t, at - 0.2, at + 0.5)} />
                <div style={{ font: `600 28px ${DISPLAY}`, color: p > 0 ? C.navy : C.inkMuted }}>{ch.label}</div>
                <div style={{
                  marginLeft: "auto", width: 50, height: 50, borderRadius: "50%", border: `3px solid ${p > 0 ? C.cyan : C.line}`,
                  background: p > 0 ? C.cyan : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${lerp(0.8, 1, clamp(p))})`,
                }}>
                  {p > 0 && <Icon name="check" size={28} color={C.navy} strokeWidth={3.2} draw={ep(t, at, at + 0.35)} />}
                </div>
              </div>
            );
          })}
          <div style={{ height: 10, borderRadius: 5, background: C.soft, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(CHECKS.filter((c) => t >= wordTime("review", c.word) + 0.15).length / 3) * 100}%`, background: C.cyan, borderRadius: 5 }} />
          </div>
          {/* The decision row, where the stamp lands. */}
          <div style={{ display: "flex", alignItems: "center", height: 104, marginTop: 6 }}>
            <div style={{ font: `600 20px ${BODY}`, letterSpacing: "0.16em", textTransform: "uppercase", color: C.inkMuted }}>Decision</div>
            {qualified > 0 && (
              <div style={{
                marginLeft: "auto", marginRight: 20, padding: "8px 28px", borderRadius: 18, border: `6px solid ${C.cyan}`,
                font: `800 48px ${DISPLAY}`, letterSpacing: "0.08em", color: C.cyanDeep, background: C.surface,
                transform: `rotate(-6deg) scale(${lerp(2.2, 1, ease.out(qualified))})`, opacity: clamp(qualified * 3),
              }}>QUALIFIED</div>
            )}
          </div>
        </div>
      </div>

      {/* The secure message between the team and the office. */}
      <div style={{ position: "absolute", left: CARD_POS.x, top: 770, width: CARD_POS.w, display: "flex", flexDirection: "column", gap: 12 }}>
        <Bubble who="Medville care team" text="Please confirm this patient's diabetes care." p={ask} side="left" />
        <Bubble who="Your doctor's office" text="Confirmed. Thank you." p={reply} side="right" />
      </div>
    </AbsoluteFill>
  );
};
