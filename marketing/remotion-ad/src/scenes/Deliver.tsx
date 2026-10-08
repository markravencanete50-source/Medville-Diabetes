import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, BODY, DISPLAY } from "../theme";
import { clamp, ease, ep, handheld, lerp, prog } from "../anim";
import { Icon, IconTile } from "../components/Icon";
import { ApplicationCard } from "./Form";
import { DROP, CARD_POS } from "./Review";

/*
  Scene 6, "Once you qualify, we ship your CGM and supplies straight to your door."
  The stamped application drops into a Medville box, the box closes, and
  it rides the route to the customer's home on a map. On "door", two doors
  close and swing open on the doorstep.
*/
export const CLOSE = [DROP[1] - 0.05, DROP[1] + 0.4] as const;
export const MAP = [CLOSE[1] + 0.1, 30.25] as const;
export const DOORS = [30.12, 30.38, 30.55, 31.05] as const; // close from, closed, open from, open
export const FLIP_AT = 31.35;

const BW = 420, BH = 270, BD = 320;
// Screen height of the open top of the box: the application disappears below it.
const MOUTH_Y = 470;
const face = (w: number, h: number, transform: string, bg: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: "absolute", left: -w / 2, top: -h / 2, width: w, height: h, transform, background: bg, backfaceVisibility: "hidden", ...extra,
});

const ShippingBox: React.FC<{ t: number; flap: number }> = ({ t, flap }) => {
  const tape = ep(t, CLOSE[1] - 0.05, CLOSE[1] + 0.2);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d" }}>
      <div style={face(BW, BD, `rotateX(-90deg) translateZ(${BH / 2}px)`, "#062030")} />
      <div style={face(BW, BH, `rotateY(180deg) translateZ(${BD / 2}px)`, "#0a3347")} />
      <div style={face(BD, BH, `rotateY(-90deg) translateZ(${BW / 2}px)`, "#082c3e")} />
      <div style={face(BD, BH, `rotateY(90deg) translateZ(${BW / 2}px)`, "#0d3f57")} />
      {/* inside walls, seen while the box is open */}
      <div style={face(BW, BH, `translateZ(${BD / 2 - 1}px) rotateY(180deg)`, "#041722")} />
      <div style={face(BW, BH, `rotateY(0deg) translateZ(${-BD / 2 + 1}px)`, "#05202e", { backfaceVisibility: "visible" })} />
      {/* front, with the label */}
      <div style={face(BW, BH, `translateZ(${BD / 2}px)`, "linear-gradient(180deg,#0e4560,#0b3a52)", { display: "flex", alignItems: "center", justifyContent: "center" })}>
        <div style={{ position: "absolute", left: BW / 2 - 22, top: 0, width: 44, height: 70, background: C.cyan, opacity: tape }} />
        <Img src={staticFile("img/medville-logo-on-dark.svg")} style={{ width: 250 }} />
      </div>
      {/* flaps: open leaning out, closed lying flat */}
      <div style={face(BW, BD / 2, `translate3d(0, ${-BH / 2 - BD / 4}px, ${BD / 2}px) rotateX(${lerp(-35, 90, flap)}deg)`, "#11506e", { transformOrigin: "50% 100%", backfaceVisibility: "visible" })} />
      <div style={face(BW, BD / 2, `translate3d(0, ${-BH / 2 - BD / 4}px, ${-BD / 2}px) rotateX(${lerp(35, -90, flap)}deg)`, "#0f4964", { transformOrigin: "50% 100%", backfaceVisibility: "visible" })} />
      {/* tape across the closed flaps */}
      <div style={face(70, BD + 4, `translate3d(0, ${-BH / 2 - 1}px, 0) rotateX(90deg)`, C.cyan, { opacity: tape, backfaceVisibility: "visible" })} />
    </div>
  );
};

// The route on the map, in map coordinates.
const ROUTE = [[380, 1180], [380, 900], [820, 900], [820, 640], [1380, 640], [1380, 430], [1880, 430]];
const segLens = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const total = segLens.reduce((a, b) => a + b, 0);
function along(p: number) {
  let d = p * total;
  for (let i = 0; i < segLens.length; i++) {
    if (d <= segLens[i]) {
      const f = d / segLens[i];
      return { x: lerp(ROUTE[i][0], ROUTE[i + 1][0], f), y: lerp(ROUTE[i][1], ROUTE[i + 1][1], f) };
    }
    d -= segLens[i];
  }
  return { x: ROUTE[ROUTE.length - 1][0], y: ROUTE[ROUTE.length - 1][1] };
}

const MapPlane: React.FC<{ t: number; truckP: number }> = ({ t, truckP }) => {
  const truck = along(truckP);
  const routeStr = ROUTE.map((p) => p.join(",")).join(" ");
  const streets: React.ReactNode[] = [];
  for (let x = 160; x < 2300; x += 220) streets.push(<line key={"v" + x} x1={x} y1={0} x2={x} y2={1600} stroke="#ffffff" strokeWidth={18} />);
  for (let y = 210; y < 1600; y += 230) streets.push(<line key={"h" + y} x1={0} y1={y} x2={2300} y2={y} stroke="#ffffff" strokeWidth={18} />);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 2300, height: 1600, background: "#d9eef5", transformStyle: "preserve-3d" }}>
      <svg width={2300} height={1600} style={{ position: "absolute", left: 0, top: 0 }}>
        {streets}
        <rect x={1010} y={1000} width={420} height={380} rx={30} fill="rgba(24,186,218,.22)" />
        <rect x={1700} y={890} width={400} height={300} rx={30} fill="rgba(24,186,218,.18)" />
        <polyline points={routeStr} fill="none" stroke="rgba(0,41,59,.18)" strokeWidth={26} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={routeStr} fill="none" stroke={C.cyan} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - truckP} />
      </svg>
      {/* origin and destination, standing up off the map */}
      {[{ p: ROUTE[0], icon: "building-2", label: "Medville Diabetes" }, { p: ROUTE[ROUTE.length - 1], icon: "house", label: "Your home" }].map((pin, i) => (
        <div key={i} style={{ position: "absolute", left: pin.p[0], top: pin.p[1], transformStyle: "preserve-3d" }}>
          <div style={{ position: "absolute", left: -130, top: -170, width: 260, transform: "rotateX(-50deg)", transformOrigin: "50% 100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px 10px 10px", borderRadius: 999, background: i === 1 ? C.cyan : C.navy, color: i === 1 ? C.navy : C.white, font: `600 24px ${BODY}`, whiteSpace: "nowrap", boxShadow: "0 12px 24px rgba(0,41,59,.3)" }}>
              <IconTile name={pin.icon} size={44} bg={i === 1 ? C.navy : C.cyan} color={i === 1 ? C.white : C.navy} />
              {pin.label}
            </div>
            <div style={{ width: 4, height: 60, background: i === 1 ? C.cyan : C.navy }} />
          </div>
        </div>
      ))}
      {/* the truck */}
      <div style={{ position: "absolute", left: truck.x, top: truck.y, transformStyle: "preserve-3d" }}>
        <div style={{ position: "absolute", left: -48, top: -110, transform: "rotateX(-50deg)", transformOrigin: "50% 100%" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 8px rgba(24,186,218,.45), 0 16px 30px rgba(0,41,59,.4)", transform: `translateY(${Math.abs(Math.sin(t * 14)) * -4}px)` }}>
            <Icon name="truck" size={52} color={C.white} strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
};

const STATUS = [
  { label: "Order shipped", at: MAP[0] + 0.25 },
  { label: "Out for delivery", at: MAP[0] + 0.9 },
  { label: "Arriving at your door", at: MAP[1] - 0.35 },
];

export const Deliver: React.FC<{ t: number }> = ({ t }) => {
  if (t < DROP[0] || t > FLIP_AT + 0.02) return null;
  const bgIn = ep(t, DROP[0], DROP[0] + 0.4);
  const fly = ep(t, DROP[0], DROP[1] - 0.15, ease.inOut);
  const sink = ep(t, DROP[1] - 0.25, DROP[1] + 0.05, ease.in);
  const flap = ep(t, CLOSE[0] + 0.05, CLOSE[1], ease.inOut);
  const toMap = ep(t, MAP[0] - 0.1, MAP[0] + 0.55, ease.inOut);
  const reveal = ep(t, MAP[0] - 0.05, MAP[0] + 0.45, ease.in);
  const truckP = ep(t, MAP[0] + 0.2, MAP[1] - 0.3, ease.inOut);
  const truck = along(truckP);
  const doorsIn = ep(t, DOORS[0], DOORS[1], ease.in);
  const doorsOpen = ep(t, DOORS[2], DOORS[3], ease.inOut);
  const photo = t >= DOORS[1];
  const delivered = ep(t, DOORS[3] - 0.1, DOORS[3] + 0.3, ease.back);
  // Card from its place on the review desk to the mouth of the box.
  const cardFrom = { x: CARD_POS.x + CARD_POS.w / 2, y: CARD_POS.y + 260 };
  const cardTo = { x: 975, y: 420 };
  return (
    <AbsoluteFill>
      {!photo && (
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.surface}, ${C.canvas})`, opacity: bgIn }}>
          {/* Map, tilted like a navigation view, the camera riding with the truck */}
          {toMap > 0 && (
            <AbsoluteFill style={{ perspective: 1300, clipPath: reveal < 1 ? `circle(${reveal * 1300}px at 960px 600px)` : undefined }}>
              <div style={{
                position: "absolute", left: 960, top: 600, transformStyle: "preserve-3d",
                transform: `rotateX(50deg) rotateZ(${lerp(-8, 4, truckP)}deg) scale(${lerp(0.75, 1, toMap)}) translate(${-truck.x}px, ${-truck.y}px)`,
              }}>
                <MapPlane t={t} truckP={truckP} />
              </div>
            </AbsoluteFill>
          )}
          {/* The box, closing, then shrinking onto the start of the route */}
          {t < MAP[0] + 0.35 && (
            <AbsoluteFill style={{ perspective: 1500 }}>
              <div style={{
                position: "absolute", left: 960, top: 640, transformStyle: "preserve-3d",
                transform: `translateY(${lerp(80, 0, ep(t, DROP[0], DROP[0] + 0.45))}px) scale(${lerp(1, 0.15, toMap)}) rotateX(-24deg) rotateY(${lerp(-32, -18, prog(t, DROP[0], MAP[0]))}deg)`,
                opacity: 1 - ep(t, MAP[0] + 0.1, MAP[0] + 0.35),
              }}>
                <ShippingBox t={t} flap={flap} />
              </div>
            </AbsoluteFill>
          )}
          {/* The application, carried over from the review desk and dropped into the box */}
          {sink < 1 && (
            <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: MOUTH_Y, overflow: "hidden" }}>
              <div style={{
                position: "absolute", left: lerp(cardFrom.x, cardTo.x, fly) - 260, top: lerp(cardFrom.y, cardTo.y, fly) + sink * 260 - 50,
                transform: `scale(${lerp(1.45, 0.62, fly)}) rotate(${lerp(0, -3, fly)}deg)`,
              }}>
                <ApplicationCard />
              </div>
            </div>
          )}
          {/* Order status, like a tracking page */}
          {toMap > 0 && (
            <div style={{ position: "absolute", right: 70, top: 70, width: 470, padding: 28, borderRadius: 28, background: "rgba(255,255,255,.95)", boxShadow: "0 30px 70px rgba(0,41,59,.25)", opacity: toMap, transform: `translateY(${(1 - toMap) * -30}px)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <IconTile name="package" size={52} draw={ep(t, MAP[0], MAP[0] + 0.6)} />
                <div style={{ font: `600 27px ${DISPLAY}`, color: C.navy }}>Your order</div>
              </div>
              {STATUS.map((s) => {
                const p = ep(t, s.at, s.at + 0.3, ease.back);
                return (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 0" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: p > 0 ? C.cyan : C.soft, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${lerp(0.8, 1, clamp(p))})` }}>
                      {p > 0 && <Icon name="check" size={22} color={C.navy} strokeWidth={3.2} draw={ep(t, s.at, s.at + 0.3)} />}
                    </div>
                    <div style={{ font: `600 23px ${BODY}`, color: p > 0 ? C.navy : C.inkMuted }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </AbsoluteFill>
      )}
      {/* The doorstep, behind the doors */}
      {photo && <Doorstep t={t} badge={delivered} draw={ep(t, DOORS[3], DOORS[3] + 0.6)} />}
      {/* Two doors close in, the bell rings, they swing open */}
      {t >= DOORS[0] && t < DOORS[3] + 0.05 && (
        <AbsoluteFill style={{ perspective: 1600 }}>
          {[0, 1].map((i) => {
            const side = i === 0 ? -1 : 1;
            return (
              <div key={i} style={{
                position: "absolute", top: 0, width: 960, height: 1080, left: i === 0 ? 0 : 960,
                transformOrigin: i === 0 ? "0% 50%" : "100% 50%",
                transform: `translateX(${side * (1 - doorsIn) * 980}px) rotateY(${-side * doorsOpen * 105}deg)`,
                background: "linear-gradient(180deg, #0e4560, #062638)", boxShadow: "inset 0 0 0 3px rgba(111,196,224,.25)",
              }}>
                {[0, 1].map((k) => (
                  <div key={k} style={{ position: "absolute", left: 110, right: 110, top: k === 0 ? 120 : 600, height: k === 0 ? 400 : 360, borderRadius: 18, border: "4px solid rgba(111,196,224,.25)" }} />
                ))}
                <div style={{ position: "absolute", top: 520, [i === 0 ? "right" : "left"]: 60, width: 22, height: 120, borderRadius: 11, background: C.cyan }} />
              </div>
            );
          })}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* The doorstep photograph. Scene 7 flips this same picture over. */
export const Doorstep: React.FC<{ t: number; badge?: number; draw?: number }> = ({ t, badge = 1, draw = 1 }) => (
  <AbsoluteFill style={{ background: C.abyss, overflow: "hidden" }}>
    <AbsoluteFill style={{ transform: handheld(t, 1) }}>
      <Img src={staticFile("img/home-delivery.webp")} style={{ position: "absolute", left: -40, top: -30, width: 2000, height: 1140, objectFit: "cover", transform: `scale(${lerp(1.15, 1.05, prog(t, DOORS[2], FLIP_AT + 0.8))})` }} />
    </AbsoluteFill>
    <div style={{
      position: "absolute", left: 120, top: 120, display: "flex", alignItems: "center", gap: 14, padding: "14px 28px 14px 14px", borderRadius: 999,
      background: C.white, boxShadow: "0 20px 40px rgba(0,0,0,.3)", opacity: clamp(badge * 2), transform: `scale(${lerp(0.6, 1, badge)})`, transformOrigin: "0 50%",
    }}>
      <IconTile name="package-check" size={60} draw={draw} />
      <div style={{ font: `700 32px ${DISPLAY}`, color: C.navy }}>Delivered</div>
    </div>
  </AbsoluteFill>
);
