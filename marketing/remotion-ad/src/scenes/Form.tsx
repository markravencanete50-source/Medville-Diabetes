import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, lerp, prog } from "../anim";
import { Icon } from "../components/Icon";
import { Tap } from "../components/Cursor";
import { SAMPLE } from "../data";
import { MORPH, ctaRect } from "./Choose";

/*
  Scene 4, "Next, fill out our short eligibility form online."
  The button just clicked opens out into a phone. The real form fills in:
  name, email, phone, city and state, the product picked a moment ago, the
  insulin question and the consent box. Then Check My Eligibility, and the
  confirmation the website shows.
*/
export const SUBMIT = 21.35;
export const SENT = 21.75;
export const WHIP = [22.05, 22.6] as const;

// Phone geometry on screen.
export const PHONE = { x: 960 - 215, y: 46, w: 430, h: 880, bezel: 14 };
const SCREEN = { x: PHONE.x + PHONE.bezel, y: PHONE.y + PHONE.bezel, w: PHONE.w - 2 * PHONE.bezel, h: PHONE.h - 2 * PHONE.bezel };

// When each field is typed or tapped.
const T = { first: 18.85, last: 19.12, email: 19.38, phone: 19.72, city: 20.0, state: 20.24, product: 20.5, yes: 20.82, consent: 21.08 };

/*
  Where each control sits in the form, in screen pixels before scrolling:
  header 64, padding 22, title and note to 162, then fields of 72 with gaps
  of 16. The product preview (92) opens before the insulin question.
*/
const TAPS: [number, number, number][] = [
  [T.state + 0.0, 296, 474],
  [T.product, 200, 562],
  [T.yes, 109, 759],
  [T.consent, 49, 825],
  [SUBMIT, 201, 927],
];
const formScroll = (t: number) => lerp(0, 430, ep(t, 19.6, 20.75, ease.inOut)) + lerp(0, 150, ep(t, 20.95, 21.3, ease.inOut));

const typed = (text: string, t: number, at: number, cps = 26) => text.slice(0, Math.max(0, Math.floor((t - at) * cps)));

const Field: React.FC<{ label: string; value: string; active: boolean; w?: number; select?: boolean; children?: React.ReactNode }> = ({ label, value, active, w, select, children }) => (
  <div style={{ width: w }}>
    <div style={{ font: `600 15px ${BODY}`, color: C.navy, marginBottom: 6 }}>{label}</div>
    <div style={{
      height: 48, borderRadius: 12, border: `2px solid ${active ? C.cyanDeep : C.line}`, background: C.surface,
      display: "flex", alignItems: "center", padding: "0 14px", font: `500 17px ${BODY}`, color: C.navy, gap: 6,
      boxShadow: active ? "0 0 0 4px rgba(24,186,218,.2)" : "none",
    }}>
      {children ?? <span style={{ whiteSpace: "nowrap", overflow: "hidden" }}>{value}</span>}
      {active && !select && <span style={{ width: 2, height: 22, background: C.navy }} />}
      {select && <span style={{ marginLeft: "auto" }}><Icon name="chevron-down" size={20} color={C.inkMuted} /></span>}
    </div>
  </div>
);

const FormScreen: React.FC<{ t: number }> = ({ t }) => {
  const act = (a: number, b: number) => t >= a && t < b;
  const scroll = formScroll(t);
  const productP = ep(t, T.product, T.product + 0.3);
  const yes = ep(t, T.yes, T.yes + 0.15);
  const consent = ep(t, T.consent, T.consent + 0.25);
  const sending = t >= SUBMIT + 0.08 && t < SENT;
  const done = ep(t, SENT, SENT + 0.35);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.surface, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: -scroll }}>
        <div style={{ height: 64, background: C.navy, display: "flex", alignItems: "center", padding: "0 18px" }}>
          <Img src={staticFile("img/medville-logo-on-dark.svg")} style={{ height: 44 }} />
        </div>
        <div style={{ padding: "22px 22px 40px" }}>
          <div style={{ font: `700 28px/1.15 ${DISPLAY}`, color: C.navy }}>Check your eligibility</div>
          <div style={{ font: `400 15px ${BODY}`, color: C.inkMuted, marginTop: 6 }}>All fields are required.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <Field w={175} label="First name" value={typed(SAMPLE.first, t, T.first)} active={act(T.first, T.last)} />
              <Field w={175} label="Last name" value={typed(SAMPLE.last, t, T.last)} active={act(T.last, T.email)} />
            </div>
            <Field label="Email address" value={typed(SAMPLE.email, t, T.email, 40)} active={act(T.email, T.phone)} />
            <Field label="Phone number" value={typed(SAMPLE.phone, t, T.phone, 40)} active={act(T.phone, T.city)} />
            <div style={{ display: "flex", gap: 12 }}>
              <Field w={175} label="City" value={typed(SAMPLE.city, t, T.city, 34)} active={act(T.city, T.state)} />
              <Field w={175} label="State" value={t >= T.state + 0.1 ? SAMPLE.state : "Select"} active={act(T.state, T.product)} select />
            </div>
            <Field label="Which product are you interested in?" value="" active={act(T.product, T.yes)} select>
              <span style={{ display: "flex", alignItems: "center", gap: 8, opacity: productP > 0 ? 1 : 0.6 }}>
                {productP > 0 ? "FreeStyle Libre 3" : "Select a product"}
              </span>
            </Field>
            {/* The website shows the chosen product with its picture. */}
            <div style={{
              height: 92 * productP, overflow: "hidden", borderRadius: 14, background: C.white, border: `1px solid ${C.line}`,
              display: "flex", alignItems: "center", gap: 14, padding: productP > 0 ? "0 14px" : 0, opacity: productP,
            }}>
              <Img src={staticFile("img/freestyle-libre-3-front.webp")} style={{ height: 70, borderRadius: 8 }} />
              <div>
                <div style={{ font: `500 13px ${BODY}`, color: C.inkMuted }}>Your selection</div>
                <div style={{ font: `600 18px ${DISPLAY}`, color: C.navy }}>FreeStyle Libre 3</div>
              </div>
            </div>
            <div>
              <div style={{ font: `600 15px ${BODY}`, color: C.navy, marginBottom: 8 }}>Do you inject insulin daily?</div>
              <div style={{ display: "flex", gap: 10 }}>
                {["Yes", "No"].map((o) => {
                  const on = o === "Yes" ? yes : 0;
                  return (
                    <div key={o} style={{
                      flex: 1, height: 46, borderRadius: 999, border: `2px solid ${C.navy}`, display: "flex", alignItems: "center", justifyContent: "center",
                      font: `600 17px ${BODY}`, background: on > 0.5 ? C.navy : "transparent", color: on > 0.5 ? C.white : C.navy,
                    }}>{o}</div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: C.soft, font: `400 13px/1.45 ${BODY}`, color: C.inkMuted }}>
              <div style={{
                width: 26, height: 26, flex: "none", borderRadius: 7, border: `2px solid ${C.navy}`, background: consent > 0 ? C.navy : C.white,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {consent > 0 && <Icon name="check" size={18} color={C.white} strokeWidth={3.2} draw={consent} />}
              </div>
              By ticking this box, I certify that I personally entered my own information, and I give express consent…
            </div>
            <div style={{
              height: 56, borderRadius: 999, background: C.cyan, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              font: `600 19px ${DISPLAY}`, color: C.navy, boxShadow: "0 10px 24px rgba(24,186,218,.4)",
              transform: `scale(${1 - Math.sin(Math.PI * prog(t, SUBMIT, SUBMIT + 0.2)) * 0.05})`,
            }}>
              {sending ? "Sending your information" : "Check My Eligibility"}
            </div>
          </div>
        </div>
      </div>
      {/* Confirmation, as the website words it. */}
      {done > 0 && (
        <div style={{ position: "absolute", inset: 0, background: C.surface, opacity: done, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center" }}>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: C.cyan, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ease.back(done)})` }}>
            <Icon name="check" size={64} color={C.navy} strokeWidth={3} draw={ep(t, SENT + 0.1, SENT + 0.5)} />
          </div>
          <div style={{ font: `700 26px/1.2 ${DISPLAY}`, color: C.navy, marginTop: 26 }}>Thank You. We Received Your Information.</div>
        </div>
      )}
      {/* Finger taps on the controls. */}
      {TAPS.map(([at, x, y]) => <Tap key={at} x={x} y={y - formScroll(at)} p={prog(t, at, at + 0.35)} />)}
    </div>
  );
};

/* The application that the form produces, used here and in the review scene. */
export const ApplicationCard: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div style={{
    width: 520, padding: 26, borderRadius: 26, background: C.white, boxShadow: "0 30px 60px rgba(0,41,59,.25)",
    transform: `scale(${scale})`, transformOrigin: "50% 50%",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.navy, color: C.white, font: `600 24px ${DISPLAY}`, display: "flex", alignItems: "center", justifyContent: "center" }}>JR</div>
      <div>
        <div style={{ font: `600 26px ${DISPLAY}`, color: C.navy }}>Jordan Rivera</div>
        <div style={{ font: `500 18px ${BODY}`, color: C.inkMuted }}>Eligibility form</div>
      </div>
      <Img src={staticFile("img/freestyle-libre-3-front.webp")} style={{ height: 64, marginLeft: "auto", borderRadius: 10 }} />
    </div>
  </div>
);

export const Form: React.FC<{ t: number }> = ({ t }) => {
  if (t < MORPH[0] || t > WHIP[1] + 0.05) return null;
  const m = ep(t, MORPH[0], MORPH[1], ease.inOut);
  const a = ctaRect();
  // The button rectangle grows into the phone screen.
  const r = { x: lerp(a.x, SCREEN.x, m), y: lerp(a.y, SCREEN.y, m), w: lerp(a.w, SCREEN.w, m), h: lerp(a.h, SCREEN.h, m), rad: lerp(a.h / 2, 46, m) };
  const frame = ep(t, MORPH[1] - 0.2, MORPH[1] + 0.15);
  const content = ep(t, MORPH[1] - 0.15, MORPH[1] + 0.1);
  const bg = ep(t, MORPH[0], MORPH[1]);
  const whip = ep(t, WHIP[0], WHIP[1], ease.inOut);
  const blur = Math.sin(Math.PI * prog(t, WHIP[0], WHIP[1])) * 30;
  const turn = lerp(-16, -5, ep(t, MORPH[1], 21.5, ease.soft));
  const pop = ep(t, SENT + 0.25, WHIP[0] + 0.05, ease.out);
  return (
    <AbsoluteFill style={{ transform: `translateX(${-whip * 1920}px)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>
      {/* At home, out of focus behind the phone. */}
      <AbsoluteFill style={{ opacity: bg }}>
        <Img src={staticFile("img/woman-laptop-phone.webp")} style={{ position: "absolute", left: -100, top: -100, width: 2120, height: 1280, objectFit: "cover", filter: "blur(14px)", transform: `scale(${lerp(1.1, 1.04, prog(t, MORPH[0], WHIP[1]))})` }} />
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,24,36,.82) 0%, rgba(0,41,59,.6) 55%, rgba(0,24,36,.75) 100%)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ perspective: 1600 }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateY(${turn * frame}deg) rotateX(${3 * frame}deg)`, transformOrigin: `${PHONE.x + PHONE.w / 2}px 50%` }}>
          {/* Phone body */}
          <div style={{
            position: "absolute", left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h, borderRadius: 60,
            background: "linear-gradient(145deg, #12303f, #061520)", opacity: frame,
            boxShadow: "0 50px 100px rgba(0,0,0,.5), inset 0 0 0 2px rgba(111,196,224,.25)", transform: `scale(${lerp(1.08, 1, frame)})`,
          }} />
          {/* Screen: the button, opening out */}
          <div style={{
            position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: r.rad, overflow: "hidden",
            background: m < 1 ? `color-mix(in srgb, ${C.cyan} ${(1 - m) * 100}%, ${C.surface})` : C.surface,
          }}>
            <div style={{ position: "absolute", inset: 0, opacity: content }}>
              <FormScreen t={t} />
            </div>
          </div>
          {/* The application leaves the phone. */}
          {pop > 0 && (
            <div style={{
              position: "absolute", left: SCREEN.x + SCREEN.w / 2 - 260, top: 600, opacity: clamp(pop * 3),
              transform: `translate(${pop * 120}px, ${-pop * 80}px) scale(${lerp(0.6, 0.85, pop)}) rotate(${-pop * 4}deg)`,
            }}>
              <ApplicationCard />
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
