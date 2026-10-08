import React from "react";
import { Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { PRODUCTS } from "../data";
import { Icon } from "./Icon";
import { clamp, ease, ep, lerp } from "../anim";
import { wordTime } from "../timeline";

/*
  A recreation of the Medville Diabetes website, drawn at 1920 px wide.
  The brand scene shows the hero full screen; the product scene shows the
  same page inside a browser and scrolls it. Because both use this one
  component at the same moment in time, the cut between them is invisible.
*/
export const HEADER_H = 96;
export const HERO_H = 1080;
export const PRODUCTS_TOP = HEADER_H + HERO_H;

const Blob: React.FC<{ x: number; y: number; r: number; c: string; t: number; i: number }> = ({ x, y, r, c, t, i }) => (
  <div style={{
    position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: c,
    // They grow in once the glucose card has become this page, so nothing pops.
    opacity: ep(t, 5.5, 6.6, ease.soft),
    filter: "blur(70px)", transform: `translate(${Math.sin(t * 0.4 + i * 1.7) * 40}px, ${Math.cos(t * 0.33 + i) * 40}px)`,
  }} />
);

export const SiteHeader: React.FC = () => (
  <div style={{
    height: HEADER_H, background: C.navy, display: "flex", alignItems: "center", padding: "0 80px", gap: 56,
    borderBottom: "1px solid rgba(24,186,218,.3)",
  }}>
    <Img src={staticFile("img/medville-logo-on-dark.svg")} style={{ height: 66 }} />
    <div style={{ display: "flex", gap: 40, font: `500 22px ${BODY}`, color: C.onDarkBrand, marginLeft: 40 }}>
      {["Products", "Our Services", "Refer a Patient", "About", "Blog", "Contact"].map((n) => (
        <span key={n} style={{ color: n === "Products" ? C.white : undefined }}>{n}</span>
      ))}
    </div>
    <div style={{ marginLeft: "auto", padding: "14px 28px", borderRadius: 999, background: C.cyan, color: C.navy, font: `600 21px ${DISPLAY}` }}>
      Check Your Eligibility
    </div>
  </div>
);

/* The hero: logo, then what Medville supplies, arriving with the voiceover. */
const HERO_ITEMS = [
  { img: "img/freestyle-libre-3-front.webp", label: "FreeStyle Libre", word: "CGMs" },
  { img: "img/dexcom-g7-front.webp", label: "Dexcom", word: "CGMs" },
  { img: "img/freestyle-libre-3-sensor-front.webp", label: "Sensors", word: "sensors" },
  { img: "img/tandem-tslim-x2-front.webp", label: "Insulin pumps", word: "insulin" },
];

export const Hero: React.FC<{ t: number }> = ({ t }) => {
  const logo = ep(t, 5.55, 6.6);
  const usP = ep(t, wordTime("brand", "United") - 0.1, wordTime("brand", "United") + 0.5);
  return (
    <div style={{ position: "relative", width: 1920, height: HERO_H, overflow: "hidden", background: `linear-gradient(180deg, ${C.surface} 0%, ${C.canvas} 100%)` }}>
      <Blob x={260} y={200} r={330} c="rgba(24,186,218,.26)" t={t} i={0} />
      <Blob x={1680} y={880} r={360} c="rgba(24,186,218,.22)" t={t} i={1} />
      <Blob x={1500} y={120} r={220} c="rgba(10,109,138,.10)" t={t} i={2} />
      {/* Logo: wipes in from the left, settling as it grows. */}
      <div style={{ position: "absolute", left: 960 - 390, top: 120, width: 780, height: 351 }}>
        <Img src={staticFile("img/medville-logo.svg")} style={{
          width: 780, height: 351, clipPath: `inset(0 ${(1 - logo) * 100}% 0 0)`,
          transform: `scale(${lerp(0.92, 1, logo)})`, opacity: clamp(logo * 3),
        }} />
      </div>
      {/* United States supplier */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 486, display: "flex", justifyContent: "center",
        opacity: usP, transform: `translateY(${(1 - usP) * 20}px)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 26px 12px 16px", borderRadius: 999, background: C.navy, color: C.white, font: `600 26px ${BODY}` }}>
          <Icon name="map-pin" size={28} color={C.cyan} strokeWidth={2.2} draw={ep(t, wordTime("brand", "United"), wordTime("brand", "United") + 0.6)} />
          United States supplier
        </div>
      </div>
      {/* What Medville supplies */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 580, display: "flex", justifyContent: "center", gap: 28 }}>
        {HERO_ITEMS.map((it, i) => {
          const at = wordTime("brand", it.word) - 0.15 + (i === 1 ? 0.12 : 0);
          const p = ep(t, at, at + 0.55, ease.back);
          const f = ep(t, at, at + 0.25);
          return (
            <div key={i} style={{
              width: 300, height: 290, borderRadius: 28, background: C.white, overflow: "hidden",
              boxShadow: "0 24px 50px rgba(0,41,59,.16)", opacity: f,
              transform: `translateY(${(1 - p) * 70}px) scale(${lerp(0.8, 1, p)})`,
            }}>
              <div style={{ height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Img src={staticFile(it.img)} style={{ maxWidth: 260, maxHeight: 190 }} />
              </div>
              <div style={{ height: 80, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", font: `600 25px ${DISPLAY}`, color: C.navy, background: C.surface }}>
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* The product listing: what a visitor sees after scrolling past the hero. */
/* Where the Check Your Eligibility button sits on a card, over the foot of the picture. */
export const CTA_TOP = 236;
export const CARD = { w: 520, h: 470, gap: 40, top: PRODUCTS_TOP + 250, left: (1920 - (3 * 520 + 2 * 40)) / 2 };
export const cardPos = (i: number) => ({
  x: CARD.left + (i % 3) * (CARD.w + CARD.gap),
  y: CARD.top + Math.floor(i / 3) * (CARD.h + CARD.gap),
});

export const ProductsSection: React.FC<{ hover: Record<string, number>; selected: number; ctaShow: number; ctaPress: number }> = ({
  hover, selected, ctaShow, ctaPress,
}) => (
  <div style={{ position: "relative", width: 1920, height: 1300, background: C.canvas }}>
    <div style={{ position: "absolute", left: CARD.left, top: 70, font: `600 22px ${BODY}`, letterSpacing: "0.18em", textTransform: "uppercase", color: C.cyanDeep }}>
      Products
    </div>
    <div style={{ position: "absolute", left: CARD.left, top: 108, font: `700 58px ${DISPLAY}`, color: C.navy }}>
      Continuous Glucose Monitors
    </div>
    <div style={{ position: "absolute", left: CARD.left + 1100, top: 120, display: "flex", gap: 12 }}>
      {["All", "FreeStyle Libre", "Dexcom"].map((f, i) => (
        <div key={f} style={{
          padding: "10px 22px", borderRadius: 999, font: `600 20px ${BODY}`,
          background: i === 0 ? C.navy : "transparent", color: i === 0 ? C.white : C.navy, border: `2px solid ${C.navy}`,
        }}>{f}</div>
      ))}
    </div>
    {PRODUCTS.map((p, i) => {
      const { x, y } = cardPos(i);
      const h = hover[p.id] || 0;
      const isSel = p.id === "libre3" ? selected : 0;
      return (
        <div key={p.id} style={{
          position: "absolute", left: x, top: y - PRODUCTS_TOP, width: CARD.w, height: CARD.h, borderRadius: 30,
          background: C.surface, overflow: "hidden",
          boxShadow: `0 ${18 + h * 22}px ${40 + h * 30}px rgba(0,41,59,${0.12 + h * 0.12}), 0 0 0 ${h * 4 + isSel * 4}px ${C.cyan}`,
          transform: `translateY(${-h * 12}px)`,
        }}>
          <div style={{ height: 320, background: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Img src={staticFile(p.img)} style={{ maxWidth: 430, maxHeight: 280, transform: `scale(${1 + h * 0.05})` }} />
          </div>
          <div style={{ position: "absolute", left: 32, top: 344, font: `600 32px ${DISPLAY}`, color: C.navy }}>{p.name}</div>
          {p.id === "libre3" && isSel > 0 && (
            <div style={{
              position: "absolute", right: 24, top: 24, width: 64, height: 64, borderRadius: "50%", background: C.cyan,
              display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ease.back(isSel)})`,
            }}>
              <Icon name="check" size={36} color={C.navy} strokeWidth={3} draw={isSel} />
            </div>
          )}
          {p.id === "libre3" && ctaShow > 0 && (
            <div style={{
              position: "absolute", left: 24, right: 24, top: CTA_TOP, height: 70, borderRadius: 999, background: C.cyan,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12, font: `600 26px ${DISPLAY}`, color: C.navy,
              opacity: ctaShow, transform: `translateY(${(1 - ctaShow) * 30}px) scale(${1 - Math.sin(Math.PI * ctaPress) * 0.05})`,
              boxShadow: "0 12px 30px rgba(24,186,218,.45)",
            }}>
              Check Your Eligibility <Icon name="arrow-right" size={28} color={C.navy} strokeWidth={2.6} />
            </div>
          )}
        </div>
      );
    })}
  </div>
);
