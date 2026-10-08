import React from "react";
import { AbsoluteFill } from "remotion";
import { C, BODY } from "../theme";
import { clamp, ease, ep, lerp, prog } from "../anim";
import { Hero, SiteHeader, ProductsSection, HEADER_H, PRODUCTS_TOP, cardPos, CARD, CTA_TOP } from "../components/Website";
import { Cursor } from "../components/Cursor";
import { Icon } from "../components/Icon";
import { wordTime } from "../timeline";

/*
  Scene 3, "Here is how it works. First, choose your device."
  The camera pulls back: the brand scene was the website all along. The page
  scrolls to the products, the cursor looks at the FreeStyle Libre 3 and the
  Dexcom G7 as they are named, picks the Libre 3 and presses Check Your
  Eligibility. That button becomes the phone in scene 4.
*/
export const PULLBACK = [11.42, 12.5] as const;
export const CLICK_PRODUCT = 17.5;
export const CLICK_CTA = 18.12;
export const MORPH = [18.15, 18.75] as const;
const CHROME = 64;

type Cam = { s: number; tx: number; ty: number; rx: number; ry: number; scroll: number };
const FLAT_END: Cam = { s: 1.0, tx: 960 - 1.0 * 960, ty: 0, rx: 0, ry: 0, scroll: PRODUCTS_TOP + 40 };
// Vertically centre the first row of cards.
FLAT_END.ty = 540 - FLAT_END.s * (CHROME + (cardPos(0).y + 235 - FLAT_END.scroll));

function cam(t: number): Cam {
  const pb = ep(t, PULLBACK[0], PULLBACK[1], ease.inOut);
  const sc = ep(t, 12.75, 13.85, ease.inOut);
  const zoom = ep(t, 13.7, 14.7, ease.inOut);
  const flat = ep(t, 17.2, 17.95, ease.inOut);
  // Pulled back: the whole browser, tilted on the desk.
  const back = { s: 0.7, tx: (1920 - 1920 * 0.7) / 2, ty: (1080 - (1080 + CHROME) * 0.7) / 2 - 10, rx: 8, ry: -13 };
  const near = { s: 0.95, tx: 960 - 0.95 * 960, ty: 0, rx: 3, ry: 6 };
  near.ty = 540 - near.s * (CHROME + (cardPos(0).y + 235 - (PRODUCTS_TOP + 40)));
  let c = {
    s: lerp(1, back.s, pb), tx: lerp(0, back.tx, pb), ty: lerp(-CHROME, back.ty, pb),
    rx: lerp(0, back.rx, pb), ry: lerp(0, back.ry, pb),
  };
  c = { s: lerp(c.s, near.s, zoom), tx: lerp(c.tx, near.tx, zoom), ty: lerp(c.ty, near.ty, zoom), rx: lerp(c.rx, near.rx, zoom), ry: lerp(c.ry, near.ry, zoom) };
  // A slow drift while the cursor works, then square on for the button.
  const drift = Math.sin((t - 14.7) * 0.6) * 1.5 * prog(t, 14.7, 15.2);
  c.ry += drift * (1 - flat);
  c = { s: lerp(c.s, FLAT_END.s, flat), tx: lerp(c.tx, FLAT_END.tx, flat), ty: lerp(c.ty, FLAT_END.ty, flat), rx: lerp(c.rx, 0, flat), ry: lerp(c.ry, 0, flat) };
  const scroll = lerp(lerp(HEADER_H, 0, ep(t, PULLBACK[0] + 0.15, PULLBACK[1] - 0.1, ease.inOut)), PRODUCTS_TOP + 40, sc);
  return { ...c, scroll };
}

/* The screen rectangle of the Check Your Eligibility button when it is clicked. */
export function ctaRect() {
  const c = FLAT_END;
  const { x, y } = cardPos(0);
  const bx = x + 24, by = y + CTA_TOP;
  return { x: c.tx + c.s * bx, y: c.ty + c.s * (CHROME + by - c.scroll), w: c.s * (CARD.w - 48), h: c.s * 70 };
}

// Cursor path in page coordinates, timed to the words that name each product.
function cursor(t: number) {
  const libre = { x: cardPos(0).x + 300, y: cardPos(0).y + 180 };
  const g7 = { x: cardPos(1).x + 280, y: cardPos(1).y + 200 };
  const cta = { x: cardPos(0).x + 330, y: cardPos(0).y + CTA_TOP + 45 };
  const start = { x: 1500, y: PRODUCTS_TOP + 1000 };
  const tLibre = wordTime("choose", "FreeStyle");
  const tG7 = wordTime("choose", "Dexcom");
  const keys: [number, { x: number; y: number }][] = [
    [14.0, start], [tLibre, libre], [tG7 - 0.45, libre], [tG7, g7], [CLICK_PRODUCT - 0.5, g7], [CLICK_PRODUCT - 0.05, { x: libre.x + 20, y: libre.y + 30 }],
    [CLICK_PRODUCT + 0.2, { x: libre.x + 20, y: libre.y + 30 }], [CLICK_CTA - 0.03, cta], [20, cta],
  ];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const p = ease.inOut(prog(t, keys[i - 1][0], keys[i][0]));
      return { x: lerp(keys[i - 1][1].x, keys[i][1].x, p), y: lerp(keys[i - 1][1].y, keys[i][1].y, p) };
    }
  }
  return keys[keys.length - 1][1];
}

export const Choose: React.FC<{ t: number }> = ({ t }) => {
  if (t < PULLBACK[0] || t > MORPH[1] + 0.05) return null;
  const c = cam(t);
  const tLibre = wordTime("choose", "FreeStyle");
  const tG7 = wordTime("choose", "Dexcom");
  const hover = {
    libre3: Math.max(ep(t, tLibre - 0.1, tLibre + 0.25) * (1 - ep(t, tG7 - 0.4, tG7 - 0.15)), ep(t, CLICK_PRODUCT - 0.15, CLICK_PRODUCT + 0.1)),
    g7: ep(t, tG7 - 0.1, tG7 + 0.2) * (1 - ep(t, CLICK_PRODUCT - 0.45, CLICK_PRODUCT - 0.2)),
  };
  const selected = ep(t, CLICK_PRODUCT, CLICK_PRODUCT + 0.35);
  const ctaShow = ep(t, CLICK_PRODUCT + 0.12, CLICK_PRODUCT + 0.45);
  const ctaPress = prog(t, CLICK_CTA, CLICK_CTA + 0.2);
  const cur = cursor(t);
  const curP = (t >= CLICK_PRODUCT && t < CLICK_PRODUCT + 0.45) ? prog(t, CLICK_PRODUCT, CLICK_PRODUCT + 0.45) : (t >= CLICK_CTA ? prog(t, CLICK_CTA, CLICK_CTA + 0.45) : 0);
  const pb = prog(t, PULLBACK[0], PULLBACK[1]);
  const fadeOut = ep(t, MORPH[0] + 0.1, MORPH[1]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1400px 800px at 50% 40%, ${C.raised} 0%, ${C.navy} 50%, ${C.abyss} 100%)`, opacity: 1 - fadeOut }}>
      {/* Desk light behind the browser. */}
      <AbsoluteFill style={{ background: "radial-gradient(900px 500px at 50% 100%, rgba(24,186,218,.25), transparent 70%)", opacity: pb }} />
      <AbsoluteFill style={{ perspective: 2200 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, width: 1920, height: 1080 + CHROME, transformOrigin: "0 0",
          transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.s})`,
        }}>
          <div style={{
            width: 1920, height: 1080 + CHROME, transformOrigin: "50% 50%", transform: `rotateX(${c.rx}deg) rotateY(${c.ry}deg)`,
            borderRadius: 26 * clamp(pb * 3), overflow: "hidden", boxShadow: `0 60px 140px rgba(0,0,0,${0.55 * pb})`,
            background: C.white,
          }}>
            {/* Browser chrome */}
            <div style={{ height: CHROME, background: "#e9f1f5", display: "flex", alignItems: "center", gap: 12, padding: "0 26px", borderBottom: `1px solid ${C.line}` }}>
              {["#ff6159", "#ffbd2e", "#28c941"].map((col) => <div key={col} style={{ width: 18, height: 18, borderRadius: "50%", background: col }} />)}
              <div style={{
                marginLeft: 30, flex: 1, maxWidth: 900, height: 40, borderRadius: 999, background: C.white, border: `1px solid ${C.line}`,
                display: "flex", alignItems: "center", gap: 10, padding: "0 18px", font: `500 20px ${BODY}`, color: C.inkMuted,
              }}>
                <Icon name="lock" size={18} color={C.inkMuted} strokeWidth={2.2} />
                {t < 13.2 ? "medvillediabetes.com" : "medvillediabetes.com/products"}
              </div>
            </div>
            {/* Page viewport */}
            <div style={{ position: "relative", height: 1080, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: -c.scroll, width: 1920 }}>
                <SiteHeader />
                <Hero t={t} />
                <ProductsSection hover={hover} selected={selected} ctaShow={ctaShow} ctaPress={ctaPress} />
                {t >= 14.0 && (
                  <div style={{ position: "absolute", left: 0, top: 0 }}>
                    <Cursor x={cur.x} y={cur.y} press={curP} opacity={ep(t, 14.0, 14.25)} scale={1.1} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
