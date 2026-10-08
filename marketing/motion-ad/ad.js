/*
  Medville Diabetes motion advertisement: the timeline.

  window.render(t) draws the frame at t seconds. Each scene owns a "camera"
  (perspective, then a world that is moved and rotated), so every scene is
  seen from its own angle and the camera keeps moving inside it.

  Scenes and their beats (seconds). The cuts fall on the music's bar lines,
  2.5 s per bar at 96 beats per minute.
    1  0.00 to  5.0   Hook: a glucose trend draws across a 3D grid.
    2  5.0  to 10.0   Logo reveal through a circle wipe from the trend line.
    3 10.0  to 15.0   Products on a 3D carousel, after a whip pan.
    4 15.0  to 27.5   How it works: the camera travels along three steps.
    5 27.5  to 33.75  Services: six tiles, a crane down from above.
    6 33.75 to 37.5   Patients and providers, after a cube turn.
    7 37.5  to 43.75  Call to action and contact details.

  Copy follows the client's rules: plain English, no contractions, no dashes.
*/
(function () {
  "use strict";

  const DURATION = 43.75;
  const W = 1920, H = 1080;
  const ASSET = "../../public";

  /* ---------- maths ---------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const E = {
    linear: p => p,
    outCubic: p => 1 - Math.pow(1 - p, 3),
    inCubic: p => p * p * p,
    inOutCubic: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outQuart: p => 1 - Math.pow(1 - p, 4),
    inOutQuart: p => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
    outExpo: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOutSine: p => -(Math.cos(Math.PI * p) - 1) / 2,
    outBack: p => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  };
  // Velocity of an eased move, used to size motion blur.
  const speed = (ease, p) => {
    const d = 0.01;
    return Math.abs(ease(clamp(p + d)) - ease(clamp(p - d))) / (2 * d);
  };

  /* Keyframes: [[time, {prop: value}, ease], ...]. The ease on a key shapes
     the move that arrives at it. Missing props hold the previous value. */
  function kf(t, keys) {
    const props = {};
    keys.forEach(k => Object.keys(k[1]).forEach(p => (props[p] = true)));
    const out = {};
    for (const p of Object.keys(props)) {
      const ks = keys.filter(k => k[1][p] !== undefined);
      if (t <= ks[0][0]) { out[p] = ks[0][1][p]; continue; }
      out[p] = ks[ks.length - 1][1][p];
      for (let i = 1; i < ks.length; i++) {
        if (t <= ks[i][0]) {
          const a = ks[i - 1], b = ks[i];
          const e = b[2] || E.inOutSine;
          out[p] = lerp(a[1][p], b[1][p], e((t - a[0]) / (b[0] - a[0])));
          break;
        }
      }
    }
    return out;
  }

  // Seeded random numbers, so particles sit in the same place every render.
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- DOM helpers ---------- */
  const stage = document.getElementById("stage");
  function el(tag, cls, parent, css, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) Object.assign(e.style, css);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  const px = v => v + "px";

  function makeScene(id) {
    const root = el("div", "scene", stage);
    root.id = id;
    const bg = el("div", "bg", root);
    const cam = el("div", "cam", root);
    const world = el("div", "world", cam);
    const hud = el("div", "hud", root);
    return { root, bg, cam, world, hud };
  }
  function setCam(world, c) {
    world.style.transform =
      `translate3d(0,0,${c.z || 0}px) rotateX(${c.rx || 0}deg) rotateY(${c.ry || 0}deg) ` +
      `rotateZ(${c.rz || 0}deg) translate3d(${-(c.x || 0)}px,${-(c.y || 0)}px,0)`;
  }
  function show(s, on) { s.root.style.display = on ? "block" : "none"; }

  /* Words that rise into place one after another. */
  function words(parent, text, css) {
    const box = el("div", "", parent, css);
    const list = [];
    text.split(" ").forEach((w, i, a) => {
      list.push(el("span", "w", box, null, w));
      if (i < a.length - 1) box.appendChild(document.createTextNode(" "));
    });
    box._words = list;
    return box;
  }
  function revealWords(box, t, t0, o = {}) {
    const stagger = o.stagger ?? 0.06, dur = o.dur ?? 0.7, dy = o.dy ?? 46;
    const outP = o.out ? E.inCubic(prog(t, o.out, o.out + (o.outDur || 0.45))) : 0;
    box._words.forEach((w, i) => {
      const p = E.outQuart(prog(t, t0 + i * stagger, t0 + i * stagger + dur));
      const blur = (1 - p) * 10 + outP * 12;
      w.style.opacity = p * (1 - outP);
      w.style.transform = `translate3d(0,${(1 - p) * dy - outP * 30}px,0) rotateX(${(1 - p) * -40}deg)`;
      w.style.filter = blur > 0.05 ? `blur(${blur}px)` : "none";
    });
  }
  // Simple fade and rise for any element.
  function rise(e, t, t0, o = {}) {
    const dur = o.dur ?? 0.7, dy = o.dy ?? 30;
    const p = (o.ease || E.outQuart)(prog(t, t0, t0 + dur));
    const outP = o.out ? E.inCubic(prog(t, o.out, o.out + (o.outDur || 0.45))) : 0;
    e.style.opacity = p * (1 - outP);
    e.style.transform = (o.base || "") + ` translate3d(0,${(1 - p) * dy}px,0)` + (o.scale ? ` scale(${lerp(o.scale, 1, p)})` : "");
    return p;
  }

  /* Icons: Lucide line icons that draw themselves stroke by stroke. */
  function icon(name, size, color, sw = 2, parent, css) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", color);
    svg.setAttribute("stroke-width", sw);
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("class", "ic");
    svg.innerHTML = window.ICONS[name];
    svg.querySelectorAll("path,circle,rect,line,polyline,polygon,ellipse").forEach(s => {
      s.setAttribute("pathLength", "1");
      s.style.strokeDasharray = "1 2";
    });
    if (css) Object.assign(svg.style, css);
    if (parent) parent.appendChild(svg);
    drawIcon(svg, 1);
    return svg;
  }
  function drawIcon(svg, p) {
    const shapes = svg.querySelectorAll("[pathLength]");
    const n = shapes.length;
    shapes.forEach((s, i) => {
      const off = n > 1 ? (0.45 * i) / (n - 1) : 0;
      const q = E.inOutSine(clamp((p - off) / 0.55));
      s.style.strokeDashoffset = 1 - q;
      s.style.opacity = q > 0.001 ? 1 : 0;
    });
  }
  /* A rounded tile with an icon, the one icon treatment used everywhere. */
  function iconTile(parent, name, o) {
    const tile = el("div", "abs", parent, {
      left: px(o.x), top: px(o.y), width: px(o.size), height: px(o.size),
      borderRadius: px(o.radius ?? o.size * 0.28), background: o.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: o.shadow || "none",
    });
    tile._icon = icon(name, Math.round(o.size * (o.iconScale || 0.52)), o.color, o.sw || 2, tile);
    return tile;
  }
  function popTile(tile, t, t0, o = {}) {
    const p = E.outBack(prog(t, t0, t0 + 0.6));
    const f = prog(t, t0, t0 + 0.25);
    tile.style.opacity = f;
    tile.style.transform = (o.base || "") + ` scale(${lerp(0.4, 1, p)}) rotate(${(1 - p) * -14}deg)`;
    drawIcon(tile._icon, prog(t, t0 + 0.15, t0 + 1.05));
  }

  /* A smooth glucose style trace through points, as an SVG path string. */
  function smoothPath(pts) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    return d;
  }
  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* Soft cyan blobs, like the hero wash on the site. */
  function blobs(parent, list) {
    return list.map(b => el("div", "blob", parent, {
      left: px(b.x - b.r), top: px(b.y - b.r), width: px(b.r * 2), height: px(b.r * 2),
      background: b.c, opacity: b.o ?? 1,
    }));
  }
  function driftBlobs(arr, t, amp = 40) {
    arr.forEach((b, i) => {
      b.style.transform = `translate3d(${Math.sin(t * 0.4 + i * 1.7) * amp}px,${Math.cos(t * 0.33 + i) * amp}px,0)`;
    });
  }

  /* ======================================================================
     Scene 1: the hook
     ====================================================================== */
  const s1 = makeScene("s1");
  s1.bg.style.background = "radial-gradient(1300px 820px at 50% 58%, #0b3a52 0%, #00293b 46%, #001824 100%)";
  const s1floor = el("div", "abs", s1.world, {
    left: px(960 - 2600), top: px(780 - 1500), width: "5200px", height: "3000px",
    backgroundImage:
      "linear-gradient(rgba(24,186,218,.30) 2px, transparent 2px), linear-gradient(90deg, rgba(24,186,218,.30) 2px, transparent 2px)",
    backgroundSize: "120px 120px",
    WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 35%, transparent 80%)",
    transform: "translate3d(0,200px,0) rotateX(80deg)",
  });
  const s1parts = [];
  {
    const r = rng(7);
    for (let i = 0; i < 46; i++) {
      const size = 3 + r() * 7;
      const d = el("div", "abs", s1.world, {
        left: px(-300 + r() * 2520), top: px(-150 + r() * 1300), width: px(size), height: px(size),
        borderRadius: "50%", background: "#6fc4e0", boxShadow: "0 0 14px 3px rgba(24,186,218,.55)",
      });
      d._z = -1400 + r() * 1700; d._o = 0.25 + r() * 0.55; d._v = 10 + r() * 26; d._ph = r() * 6;
      s1parts.push(d);
    }
  }
  const TX = 900; // the trace runs from x = -900 to 2900 so its ends are never in shot
  const s1svg = svgEl("svg", { width: 3800, height: 640, viewBox: "0 0 3800 640" }, null);
  const s1svgWrap = el("div", "abs", s1.world, { left: px(-TX), top: "300px", width: "3800px", height: "640px" });
  s1svgWrap.appendChild(s1svg);
  svgEl("rect", { x: 0, y: 250, width: 3800, height: 190, fill: "rgba(24,186,218,.07)" }, s1svg);
  svgEl("line", { x1: 0, y1: 250, x2: 3800, y2: 250, stroke: "rgba(111,196,224,.35)", "stroke-width": 2, "stroke-dasharray": "10 14" }, s1svg);
  svgEl("line", { x1: 0, y1: 440, x2: 3800, y2: 440, stroke: "rgba(111,196,224,.35)", "stroke-width": 2, "stroke-dasharray": "10 14" }, s1svg);
  const tracePts = [[-900, 430], [-700, 410], [-480, 440], [-260, 400], [-60, 425], [120, 395], [260, 430], [400, 352], [540, 378], [680, 300], [820, 336], [960, 268], [1100, 318], [1240, 286], [1380, 330], [1520, 300], [1660, 320], [1800, 296], [1960, 310], [2200, 290], [2500, 315], [2900, 300]].map(([x, y]) => [x + TX, y]);
  const s1glow = svgEl("path", { d: smoothPath(tracePts), fill: "none", stroke: "rgba(24,186,218,.35)", "stroke-width": 22, "stroke-linecap": "round", filter: "blur(8px)" }, s1svg);
  const s1trace = svgEl("path", { d: smoothPath(tracePts), fill: "none", stroke: "#18bada", "stroke-width": 7, "stroke-linecap": "round" }, s1svg);
  const s1len = () => s1trace.getTotalLength();
  const s1dot = el("div", "abs", s1.world, {
    width: "30px", height: "30px", marginLeft: "-15px", marginTop: "-15px", borderRadius: "50%",
    background: "#ffffff", border: "6px solid #18bada", boxShadow: "0 0 30px 10px rgba(24,186,218,.6)",
  });
  const s1pulse = el("div", "abs", s1.world, {
    width: "30px", height: "30px", marginLeft: "-15px", marginTop: "-15px", borderRadius: "50%",
    border: "3px solid #18bada",
  });
  const s1l1 = words(s1.hud, "Managing diabetes takes work every day.", {
    position: "absolute", left: "0", right: "0", top: "150px", textAlign: "center",
    font: "600 62px Poppins", color: "#ffffff", perspective: "800px",
  });
  const s1l2 = words(s1.hud, "Getting your CGM should be simple.", {
    position: "absolute", left: "0", right: "0", top: "240px", textAlign: "center",
    font: "700 80px Poppins", color: "#18bada", perspective: "800px",
  });

  function renderS1(t) {
    const on = t < 5.6;
    show(s1, on);
    if (!on) return;
    const c = kf(t, [
      [0, { x: -160, y: 70, z: 420, rx: 26, ry: -22, rz: -4 }],
      [4.7, { x: 160, y: 0, z: 60, rx: 9, ry: 9, rz: 0 }, E.inOutSine],
      [5.5, { x: 300, z: 520, rx: 4, ry: 12 }, E.inCubic],
    ]);
    setCam(s1.world, c);
    s1floor.style.backgroundPosition = `0px ${t * 70}px`;
    s1parts.forEach(d => {
      d.style.transform = `translate3d(${Math.sin(t * 0.5 + d._ph) * 18}px,${-t * d._v}px,${d._z}px)`;
      d.style.opacity = d._o * prog(t, 0, 0.8);
    });
    const L = s1len();
    const dp = lerp(0.2, 0.68, E.inOutSine(prog(t, 0.15, 4.75)));
    s1trace.style.strokeDasharray = `${L} ${L}`;
    s1trace.style.strokeDashoffset = L * (1 - dp);
    s1glow.style.strokeDasharray = `${L} ${L}`;
    s1glow.style.strokeDashoffset = L * (1 - dp);
    const pt = s1trace.getPointAtLength(Math.max(0.01, L * dp));
    s1dot.style.left = px(pt.x - TX); s1dot.style.top = px(300 + pt.y);
    s1dot.style.opacity = prog(t, 0.15, 0.4);
    const pu = (t * 1.1) % 1;
    s1pulse.style.left = px(pt.x - TX); s1pulse.style.top = px(300 + pt.y);
    s1pulse.style.transform = `scale(${1 + pu * 2.6})`;
    s1pulse.style.opacity = (1 - pu) * 0.8 * prog(t, 0.3, 0.6);
    revealWords(s1l1, t, 0.45, { out: 4.25 });
    revealWords(s1l2, t, 1.9, { stagger: 0.08, out: 4.35 });
    s1.hud.style.transform = `translate3d(${(c.ry || 0) * -2}px,0,0)`;
  }

  /* ======================================================================
     Scene 2: logo reveal
     ====================================================================== */
  const s2 = makeScene("s2");
  s2.bg.style.background = "linear-gradient(180deg,#f3fafc 0%,#e6f4f9 100%)";
  const s2blobs = blobs(s2.bg, [
    { x: 300, y: 220, r: 320, c: "rgba(24,186,218,.28)" },
    { x: 1660, y: 860, r: 360, c: "rgba(24,186,218,.22)" },
    { x: 1500, y: 140, r: 220, c: "rgba(10,109,138,.10)" },
  ]);
  const s2rings = [];
  for (let i = 0; i < 4; i++) {
    const r = 420 + i * 230;
    s2rings.push(el("div", "abs", s2.world, {
      left: px(960 - r), top: px(470 - r), width: px(r * 2), height: px(r * 2), borderRadius: "50%",
      border: "2px solid rgba(24,186,218,.22)", transform: `translateZ(${-260 - i * 220}px)`,
    }));
  }
  const s2logoBox = el("div", "abs", s2.world, { left: px(960 - 500), top: px(470 - 225), width: "1000px", height: "450px" });
  el("img", "", s2logoBox, { width: "1000px", height: "450px", display: "block" }).src = "../../public/brand/medville-logo.svg";
  const s2shine = el("div", "abs", s2logoBox, {
    inset: "0", WebkitMaskImage: "url(../../public/brand/medville-logo.svg)", WebkitMaskSize: "100% 100%",
    background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,.85) 50%, transparent 60%)",
    backgroundSize: "300% 100%",
  });
  const s2tag = words(s2.world, "Your CGM supplier, from the first call to every resupply.", {
    position: "absolute", left: "0", width: "1920px", top: "735px", textAlign: "center",
    font: "500 42px Poppins", color: "#1d4a5e",
  });
  const s2rule = el("div", "abs", s2.world, { left: "960px", top: "818px", height: "5px", borderRadius: "3px", background: "#18bada" });
  const burst = el("div", "", stage);
  burst.id = "ring-burst";

  function renderS2(t) {
    const on = t >= 4.7 && t < 10.4;
    show(s2, on);
    if (!on) { burst.style.display = "none"; return; }
    // Circle wipe out of the head of the trend line.
    const wp = E.inOutQuart(prog(t, 4.75, 5.45));
    let cx = 1300, cy = 600;
    if (s1.root.style.display !== "none") {
      const r = s1dot.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      s2._cx = cx; s2._cy = cy;
    } else if (s2._cx) { cx = s2._cx; cy = s2._cy; }
    const rad = wp * 2400;
    s2.root.style.clipPath = wp < 1 ? `circle(${rad}px at ${cx}px ${cy}px)` : "none";
    if (wp > 0 && wp < 1) {
      const br = rad + 24;
      burst.style.display = "block";
      Object.assign(burst.style, { width: px(br * 2), height: px(br * 2), left: px(cx - br), top: px(cy - br), opacity: 1 - wp * 0.6, borderWidth: px(4 + wp * 10) });
    } else burst.style.display = "none";

    const c = kf(t, [
      [5.0, { z: -260, rx: 16, ry: -34, rz: 3, x: 0 }],
      [6.7, { z: 0, rx: 0, ry: 0, rz: 0 }, E.outExpo],
      [9.6, { z: 110, rx: -3, ry: -5 }, E.linear],
    ]);
    // Whip pan to scene 3.
    const wpan = prog(t, 9.6, 10.25);
    const ex = E.inOutQuart(wpan);
    s2.root.style.transform = wpan > 0 ? `translate3d(${-ex * W}px,0,0)` : "none";
    const blur = speed(E.inOutQuart, wpan) * (wpan > 0 && wpan < 1 ? 26 : 0);
    setBlur(s2, "mb2", blur, 0);
    setCam(s2.world, c);
    driftBlobs(s2blobs, t);
    const lo = E.outQuart(prog(t, 5.15, 6.2));
    s2logoBox.style.opacity = lo;
    s2logoBox.style.transform = `scale(${lerp(0.82, 1, lo)})`;
    s2shine.style.backgroundPosition = `${lerp(100, -10, E.inOutSine(prog(t, 6.6, 7.8)))}% 0`;
    s2rings.forEach((r, i) => { r.style.opacity = prog(t, 5.3 + i * 0.12, 6.0 + i * 0.12) * 0.9; });
    revealWords(s2tag, t, 6.55, { stagger: 0.07 });
    const rw = E.outQuart(prog(t, 7.5, 8.3)) * 240;
    s2rule.style.width = px(rw); s2rule.style.marginLeft = px(-rw / 2);
  }

  /* Motion blur through an SVG filter, horizontal or vertical. */
  function setBlur(s, id, bx, by) {
    const f = document.querySelector(`#${id} feGaussianBlur`);
    if (bx > 0.3 || by > 0.3) {
      f.setAttribute("stdDeviation", `${bx.toFixed(1)} ${by.toFixed(1)}`);
      s.root.style.filter = `url(#${id})`;
    } else s.root.style.filter = "none";
  }

  /* ======================================================================
     Scene 3: products on a carousel
     ====================================================================== */
  const s3 = makeScene("s3");
  s3.bg.style.background = "radial-gradient(1200px 760px at 68% 52%, #0b3a52 0%, #00293b 52%, #001824 100%)";
  const s3blobs = blobs(s3.bg, [{ x: 1330, y: 560, r: 380, c: "rgba(24,186,218,.16)" }]);
  const PRODUCTS = [
    { name: "FreeStyle Libre 3", kind: "CGM system", img: "freestyle-libre-3-front.webp" },
    { name: "Dexcom G7", kind: "CGM system", img: "dexcom-g7-front.webp" },
    { name: "Stelo by Dexcom", kind: "Glucose biosensor", img: "stelo-by-dexcom-front.webp" },
    { name: "Tandem t:slim X2", kind: "Insulin pump", img: "tandem-tslim-x2-front.webp" },
    { name: "FreeStyle Libre 2", kind: "CGM system", img: "freestyle-libre-2-front.webp" },
  ];
  const RING_X = 1390, RING_Y = 520, RING_R = 640, STEP_A = 38;
  const s3ring = el("div", "abs p3d", s3.world, { left: px(RING_X), top: px(RING_Y), width: "0", height: "0" });
  const s3floor = el("div", "abs", s3.world, {
    left: px(RING_X - 700), top: px(RING_Y + 250 - 700), width: "1400px", height: "1400px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(24,186,218,.30) 0%, rgba(24,186,218,.08) 40%, transparent 68%)",
    transform: "rotateX(90deg)",
  });
  const s3cards = PRODUCTS.map((p, i) => {
    const card = el("div", "abs", s3ring, {
      left: "-200px", top: "-225px", width: "400px", height: "450px", borderRadius: "30px", overflow: "hidden",
      background: "#f3fafc", boxShadow: "0 40px 80px rgba(0,10,18,.45)", backfaceVisibility: "hidden",
    });
    const imgBox = el("div", "abs", card, { left: "0", top: "0", width: "400px", height: "320px", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" });
    el("img", "", imgBox, { maxWidth: "350px", maxHeight: "280px", display: "block" }).src = `${ASSET}/products/${p.img}`;
    el("div", "abs disp", card, { left: "30px", top: "340px", font: "600 30px Poppins", color: "#00293b", whiteSpace: "nowrap" }, p.name);
    el("div", "abs", card, { left: "30px", top: "388px", font: "500 22px Inter", color: "#3d6273" }, p.kind);
    card._shade = el("div", "abs", card, { inset: "0", background: "#001824" });
    card._a = i * STEP_A;
    return card;
  });
  const s3text = el("div", "abs", s3.hud, { left: "130px", top: "290px", width: "660px" });
  const s3eye = el("div", "eyebrow", s3text, { color: "#6fc4e0" }, "What we supply");
  const s3h = words(s3text, "Leading diabetes technology", { marginTop: "18px", font: "700 78px/1.06 Poppins", color: "#ffffff" });
  const s3p = el("div", "", s3text, { marginTop: "26px", font: "400 32px/1.4 Inter", color: "#c5e3ee" }, "CGM systems, sensors and insulin pumps.");
  const s3chips = el("div", "", s3text, { marginTop: "36px", display: "flex", gap: "16px" });
  const s3chipEls = ["FreeStyle Libre", "Dexcom", "Tandem"].map(b => el("div", "", s3chips, {
    padding: "12px 26px", borderRadius: "999px", border: "2px solid rgba(24,186,218,.55)",
    background: "rgba(11,58,82,.75)", font: "500 24px Inter", color: "#ffffff", whiteSpace: "nowrap",
  }, b));

  function renderS3(t) {
    const on = t >= 9.6 && t < 15.6;
    show(s3, on);
    if (!on) return;
    const wpan = prog(t, 9.6, 10.25);
    const ex = E.inOutQuart(wpan);
    const zoomOut = prog(t, 14.85, 15.45);
    let tr = wpan < 1 ? `translate3d(${(1 - ex) * W}px,0,0)` : "none";
    s3.root.style.transform = tr;
    if (zoomOut <= 0) setBlur(s3, "mb3", wpan < 1 ? speed(E.inOutQuart, wpan) * 26 : 0, 0);
    const c = kf(t, [
      [9.7, { x: -40, y: 20, z: -120, rx: -14, ry: 18, rz: 0 }],
      [11.2, { x: 0, y: 0, z: 0, rx: -8, ry: 6 }, E.outCubic],
      [14.85, { z: 60, rx: -4, ry: -8 }, E.linear],
      [15.5, { z: 1300, rx: -2, ry: -10 }, E.inCubic],
    ]);
    setCam(s3.world, c);
    s3.root.style.opacity = 1 - E.inOutSine(prog(t, 14.95, 15.25));
    if (zoomOut > 0) { const b = 6 + zoomOut * 40; setBlur(s3, "mb3", b, b); }
    s3.hud.style.opacity = 1 - prog(t, 14.8, 15.2);
    driftBlobs(s3blobs, t, 30);
    // Ring: hold on a product, then turn to the next one.
    const steps = [[10.95, 11.55], [12.2, 12.8], [13.45, 14.05]];
    let k = 0;
    steps.forEach(([a, b]) => { k += E.inOutCubic(prog(t, a, b)); });
    const ringA = -k * STEP_A + Math.sin(t * 0.9) * 1.5;
    const intro = E.outCubic(prog(t, 9.9, 11.0));
    s3ring.style.transform = `translate3d(0,0,${-RING_R}px) rotateY(${ringA + (1 - intro) * 50}deg)`;
    s3cards.forEach((card, i) => {
      const a = card._a + ringA + (1 - intro) * 50; // 0 is the front
      const side = clamp(Math.abs(a) / STEP_A);
      card.style.transform = `rotateY(${card._a}deg) translateZ(${RING_R}px)`;
      card._shade.style.opacity = side * 0.5;
      card.style.opacity = intro * clamp((70 - Math.abs(a)) / 25);
      card.style.display = Math.abs(a) > 72 ? "none" : "block";
    });
    s3floor.style.opacity = intro;
    s3eye.style.opacity = prog(t, 10.1, 10.6);
    revealWords(s3h, t, 10.2, { stagger: 0.08 });
    rise(s3p, t, 10.7);
    s3chipEls.forEach((c2, i) => rise(c2, t, 11.0 + i * 0.12, { dy: 24, scale: 0.85 }));
  }

  /* ======================================================================
     Scene 4: how it works, three steps
     ====================================================================== */
  const s4 = makeScene("s4");
  s4.bg.style.background = "linear-gradient(180deg,#f3fafc 0%,#e6f4f9 100%)";
  const s4blobs = blobs(s4.bg, [
    { x: 200, y: 900, r: 330, c: "rgba(24,186,218,.20)" },
    { x: 1700, y: 180, r: 300, c: "rgba(24,186,218,.18)" },
  ]);
  const SPACING = 2000;
  el("div", "abs", s4.world, {
    left: "-1200px", top: "-900px", width: "8000px", height: "2900px",
    backgroundImage: "radial-gradient(circle, rgba(0,41,59,.13) 2.2px, transparent 2.8px)",
    backgroundSize: "52px 52px", transform: "translateZ(-320px)",
  });
  const STEPS = [
    { icon: "clipboard-check", title: "Check your eligibility", desc: "Complete a short online form with your basic information.", img: "/photography/woman-phone-home.webp" },
    { icon: "shield-check", title: "We review your coverage", desc: "Our team reviews your information and explains your options.", img: "/photography/doctor-documents.webp" },
    { icon: "truck", title: "Delivered to your door", desc: "We ship your CGM and supplies directly to your home.", img: "/photography/home-delivery.webp" },
  ];
  const s4panels = STEPS.map((s, i) => {
    const panel = el("div", "abs p3d", s4.world, { left: px(i * SPACING + 160), top: "290px", width: "1600px", height: "620px" });
    const photo = el("div", "abs", panel, {
      left: "0", top: "0", width: "760px", height: "540px", borderRadius: "36px", overflow: "hidden",
      boxShadow: "0 40px 90px rgba(0,41,59,.28)", background: "#cdeaf3",
    });
    const img = el("img", "", photo, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
    img.src = ASSET + s.img;
    const num = el("div", "abs disp", panel, {
      left: "1230px", top: "-60px", font: "800 240px/1 Poppins", color: "transparent",
      WebkitTextStroke: "3px rgba(24,186,218,.55)",
    }, "0" + (i + 1));
    const tile = iconTile(panel, s.icon, {
      x: 860, y: 70, size: 136, radius: 36, color: "#00293b", sw: 1.9,
      bg: "linear-gradient(140deg,#18bada 0%,#5fd0e8 100%)", shadow: "0 22px 44px rgba(24,186,218,.42)",
    });
    const copy = el("div", "abs", panel, { left: "860px", top: "246px", width: "720px" });
    const label = el("div", "eyebrow", copy, { color: "#0a6d8a", marginLeft: "2px" }, "Step " + (i + 1));
    const title = words(copy, s.title, { marginTop: "12px", font: "700 64px/1.08 Poppins", color: "#00293b" });
    const desc = el("div", "", copy, { marginTop: "20px", width: "640px", font: "400 33px/1.45 Inter", color: "#3d6273", marginLeft: "2px" }, s.desc);
    return { panel, photo, img, num, tile, label, title, desc };
  });
  // The rail that joins the steps.
  const RAIL_Y = 940, RAIL_X0 = 160 + 380, RAIL_X1 = 2 * SPACING + 160 + 380;
  el("div", "abs", s4.world, { left: px(RAIL_X0), top: px(RAIL_Y - 2), width: px(RAIL_X1 - RAIL_X0), height: "4px", borderRadius: "2px", background: "rgba(0,41,59,.12)" });
  const s4fill = el("div", "abs", s4.world, { left: px(RAIL_X0), top: px(RAIL_Y - 3), height: "6px", borderRadius: "3px", background: "linear-gradient(90deg,#0d99bb,#18bada)", boxShadow: "0 0 18px rgba(24,186,218,.6)" });
  const s4dots = STEPS.map((s, i) => {
    const d = el("div", "abs", s4.world, {
      left: px(RAIL_X0 + i * SPACING - 28), top: px(RAIL_Y - 28), width: "56px", height: "56px", borderRadius: "50%",
      background: "#f3fafc", border: "4px solid rgba(0,41,59,.18)", display: "flex", alignItems: "center", justifyContent: "center",
    });
    d._ic = icon("check", 28, "#00293b", 3, d);
    return d;
  });
  const s4head = el("div", "abs", s4.hud, { left: "130px", top: "86px" });
  const s4eye = el("div", "eyebrow", s4head, { color: "#0a6d8a" }, "How it works");
  const s4h = words(s4head, "Three simple steps", { marginTop: "10px", font: "700 58px/1.1 Poppins", color: "#00293b" });

  // Arrival time at each step, and the moves between them.
  const ARRIVE = [15.9, 19.95, 24.05];
  const MOVES = [[19.05, 19.95], [23.15, 24.05]];
  const VIEW = [ // the camera angle each step is seen from
    { rx: 4, ry: 11, rz: 0 },
    { rx: 13, ry: -1, rz: 0 },
    { rx: 3, ry: -11, rz: 0 },
  ];
  function camS4(t) {
    if (t < ARRIVE[0]) {
      const p = E.outCubic(prog(t, 15.0, ARRIVE[0]));
      return { x: lerp(-320, 0, p), y: 0, z: lerp(-760, 0, p), rx: lerp(10, VIEW[0].rx, p), ry: lerp(30, VIEW[0].ry, p), rz: 0 };
    }
    for (let i = 0; i < 3; i++) {
      const holdEnd = i < 2 ? MOVES[i][0] : 27.6;
      const holdStart = i === 0 ? ARRIVE[0] : MOVES[i - 1][1];
      if (t <= holdEnd) {
        const h = prog(t, holdStart, holdEnd);
        return { x: i * SPACING + h * 50, y: 0, z: h * 70, rx: VIEW[i].rx - h * 2, ry: VIEW[i].ry - h * 3, rz: 0 };
      }
      if (i < 2 && t <= MOVES[i][1]) {
        const raw = prog(t, MOVES[i][0], MOVES[i][1]);
        const p = E.inOutCubic(raw);
        const arc = Math.sin(Math.PI * raw);
        const a = VIEW[i], b = VIEW[i + 1];
        return {
          x: lerp(i * SPACING + 50, (i + 1) * SPACING, p), y: 0,
          z: lerp(70, 0, p) - arc * 300,
          rx: lerp(a.rx - 2, b.rx, p), ry: lerp(a.ry - 3, b.ry, p) - arc * 10, rz: arc * -2.5,
        };
      }
    }
    return { x: 2 * SPACING + 50, z: 70, rx: VIEW[2].rx - 2, ry: VIEW[2].ry - 3 };
  }

  function renderS4(t) {
    const on = t >= 14.9 && t < 28.0;
    show(s4, on);
    if (!on) return;
    s4.root.style.opacity = E.outCubic(prog(t, 15.0, 15.4));
    const c = camS4(t);
    setCam(s4.world, c);
    driftBlobs(s4blobs, t);
    // Crane up into scene 5: everything slides down out of frame.
    const cr = prog(t, 27.15, 27.85);
    const ce = E.inOutQuart(cr);
    s4.root.style.transform = cr > 0 ? `translate3d(0,${ce * H}px,0)` : "none";
    setBlur(s4, "mb4", 0, cr > 0 && cr < 1 ? speed(E.inOutQuart, cr) * 22 : 0);

    revealWords(s4h, t, 15.5, { stagger: 0.07 });
    s4eye.style.opacity = prog(t, 15.35, 15.8);
    s4panels.forEach((p, i) => {
      const a = ARRIVE[i] - 0.35;
      const ph = E.outQuart(prog(t, a - 0.25, a + 0.75));
      p.photo.style.opacity = ph;
      p.photo.style.transform = `translate3d(${(1 - ph) * -80}px,0,${lerp(-200, 40, ph)}px) rotateY(${(1 - ph) * 18}deg)`;
      p.img.style.transform = `scale(${1.14 - prog(t, a - 0.25, a + 5) * 0.1})`;
      const np = E.outQuart(prog(t, a + 0.1, a + 1.0));
      p.num.style.opacity = np;
      p.num.style.transform = `translate3d(${(1 - np) * 120}px,0,-80px)`;
      popTile(p.tile, t, a + 0.15, { base: "translateZ(90px)" });
      rise(p.label, t, a + 0.3, { dy: 20 });
      revealWords(p.title, t, a + 0.4, { stagger: 0.07 });
      rise(p.desc, t, a + 0.85, { dy: 26 });
    });
    // Rail fills with the camera and ticks each step as it is reached.
    const fillX = clamp(c.x + 0, 0, 2 * SPACING);
    s4fill.style.width = px(fillX * prog(t, 15.4, 16.0));
    s4dots.forEach((d, i) => {
      const reached = ARRIVE[i] - 0.1;
      const p = E.outBack(prog(t, reached, reached + 0.5));
      d.style.background = p > 0.02 ? "#18bada" : "#f3fafc";
      d.style.borderColor = p > 0.02 ? "#18bada" : "rgba(0,41,59,.18)";
      d.style.transform = `translateZ(20px) scale(${lerp(0.85, 1, p)})`;
      d.style.boxShadow = p > 0.02 ? `0 0 ${24 * p}px rgba(24,186,218,.7)` : "none";
      drawIcon(d._ic, prog(t, reached + 0.1, reached + 0.6));
    });
  }

  /* ======================================================================
     Scene 5: services
     ====================================================================== */
  const s5 = makeScene("s5");
  s5.bg.style.background = "radial-gradient(1200px 600px at 50% 0%, rgba(24,186,218,.22) 0%, transparent 70%), linear-gradient(160deg,#00293b 0%,#001824 100%)";
  const SERVICES = [
    { icon: "shield-check", title: "Insurance verification", desc: "We check your coverage and benefits." },
    { icon: "stethoscope", title: "Doctor coordination", desc: "We work directly with your clinic." },
    { icon: "file-check-2", title: "Documentation review", desc: "We confirm each form is complete." },
    { icon: "badge-check", title: "Prior authorization", desc: "We request approval when it is needed." },
    { icon: "refresh-cw", title: "Ongoing resupply", desc: "We help keep your supplies coming." },
    { icon: "headset", title: "Customer support", desc: "Real people answer your questions." },
  ];
  const TW = 500, TH = 240, GAP = 36;
  const gx0 = (W - (3 * TW + 2 * GAP)) / 2, gy0 = 350;
  const s5tiles = SERVICES.map((s, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const tile = el("div", "abs", s5.world, {
      left: px(gx0 + col * (TW + GAP)), top: px(gy0 + row * (TH + GAP)), width: px(TW), height: px(TH),
      borderRadius: "30px", background: "linear-gradient(180deg, rgba(14,66,92,.96) 0%, rgba(0,41,59,.96) 100%)",
      border: "2px solid rgba(111,196,224,.28)", boxShadow: "0 30px 60px rgba(0,10,18,.45)", transformOrigin: "50% 100%",
      overflow: "hidden",
    });
    const it = iconTile(tile, s.icon, { x: 34, y: 30, size: 84, radius: 24, bg: "#18bada", color: "#00293b", sw: 2 });
    el("div", "abs disp", tile, { left: "34px", top: "134px", font: "600 31px Poppins", color: "#ffffff", whiteSpace: "nowrap" }, s.title);
    el("div", "abs", tile, { left: "34px", top: "182px", font: "400 23px Inter", color: "#a3c6d4", whiteSpace: "nowrap" }, s.desc);
    const sheen = el("div", "abs", tile, { inset: "0", background: "linear-gradient(110deg, transparent 35%, rgba(255,255,255,.10) 50%, transparent 65%)", backgroundSize: "300% 100%" });
    return { tile, it, sheen };
  });
  const s5head = el("div", "abs", s5.hud, { left: "0", right: "0", top: "110px", textAlign: "center" });
  const s5eye = el("div", "eyebrow", s5head, { color: "#6fc4e0" }, "Our services");
  const s5h = words(s5head, "One team handles every step for you.", { marginTop: "14px", font: "700 64px/1.1 Poppins", color: "#ffffff" });

  function renderS5(t) {
    const on = t >= 27.1 && t < 34.4;
    show(s5, on);
    if (!on) return;
    const cr = prog(t, 27.15, 27.85);
    const ce = E.inOutQuart(cr);
    s5.root.style.transform = cr < 1 ? `translate3d(0,${(ce - 1) * H}px,0)` : "none";
    setBlur(s5, "mb5", 0, cr > 0 && cr < 1 ? speed(E.inOutQuart, cr) * 22 : 0);
    const c = kf(t, [
      [27.4, { x: 0, y: -60, z: -620, rx: 52, ry: 0, rz: -9 }],
      [29.4, { y: 0, z: 0, rx: 7, ry: 0, rz: 0 }, E.outCubic],
      [33.75, { z: 80, rx: 2, ry: -6 }, E.linear],
    ]);
    setCam(s5.world, c);
    s5eye.style.opacity = prog(t, 27.9, 28.3);
    revealWords(s5h, t, 28.0, { stagger: 0.06 });
    s5tiles.forEach((o, i) => {
      const t0 = 28.0 + i * 0.13;
      const p = E.outCubic(prog(t, t0, t0 + 0.8));
      o.tile.style.opacity = prog(t, t0, t0 + 0.3);
      o.tile.style.transform = `translateZ(${(1 - p) * -260}px) rotateX(${(1 - p) * 85}deg)`;
      const ip = E.outBack(prog(t, t0 + 0.45, t0 + 1.0));
      o.it.style.transform = `scale(${lerp(0.5, 1, ip)})`;
      o.it.style.opacity = prog(t, t0 + 0.45, t0 + 0.65);
      drawIcon(o.it._icon, prog(t, t0 + 0.55, t0 + 1.45));
      o.sheen.style.backgroundPosition = `${lerp(100, -20, prog(t, 31.0 + i * 0.1, 32.0 + i * 0.1))}% 0`;
    });
  }

  /* Cube turn between scenes 5 and 6. */
  function cube(s, angle) {
    s.root.style.transform = `translateZ(-960px) rotateY(${angle}deg) translateZ(960px)`;
  }

  /* ======================================================================
     Scene 6: patients and providers
     ====================================================================== */
  const s6 = makeScene("s6");
  s6.bg.style.background = "linear-gradient(180deg,#f3fafc 0%,#e6f4f9 100%)";
  const s6blobs = blobs(s6.bg, [
    { x: 260, y: 200, r: 300, c: "rgba(24,186,218,.24)" },
    { x: 1680, y: 900, r: 340, c: "rgba(24,186,218,.20)" },
  ]);
  const s6head = el("div", "abs", s6.hud, { left: "0", right: "0", top: "118px", textAlign: "center" });
  const s6h = words(s6head, "Looking for a CGM supplier?", { font: "700 72px/1.1 Poppins", color: "#00293b" });
  const s6sub = el("div", "", s6head, { marginTop: "18px", font: "400 34px Inter", color: "#3d6273" }, "We work with patients and healthcare providers.");
  function audienceCard(x, o) {
    const card = el("div", "abs p3d", s6.world, {
      left: px(x), top: "380px", width: "720px", height: "440px", borderRadius: "36px", background: o.bg,
      boxShadow: o.shadow,
    });
    const it = iconTile(card, o.icon, { x: 50, y: 50, size: 104, radius: 28, bg: o.tileBg, color: o.iconColor, sw: 2 });
    el("div", "abs disp", card, { left: "50px", top: "182px", font: "700 46px Poppins", color: o.fg }, o.title);
    el("div", "abs", card, { left: "50px", top: "250px", width: "620px", font: "400 30px/1.4 Inter", color: o.fg2 }, o.desc);
    const link = el("div", "abs", card, { left: "50px", top: "368px", display: "flex", alignItems: "center", gap: "12px", font: "600 26px Inter", color: o.fg });
    el("span", "", link, null, o.link);
    icon("arrow-right", 28, o.fg, 2.4, link);
    return { card, it };
  }
  const s6a = audienceCard(190, {
    bg: "#00293b", fg: "#ffffff", fg2: "#c5e3ee", tileBg: "#18bada", iconColor: "#00293b",
    shadow: "0 40px 90px rgba(0,41,59,.35)", icon: "user-round",
    title: "For patients", desc: "Check your eligibility with a short online form.", link: "medvillediabetes.com/qualify",
  });
  const s6b = audienceCard(1010, {
    bg: "#18bada", fg: "#00293b", fg2: "#00293b", tileBg: "#00293b", iconColor: "#ffffff",
    shadow: "0 40px 90px rgba(24,186,218,.40)", icon: "hospital",
    title: "For healthcare providers", desc: "Refer a patient to us. We take it from here.", link: "medvillediabetes.com/refer-a-patient",
  });

  function renderS6(t) {
    const on = t >= 33.4 && t < 38.2;
    show(s6, on);
    if (!on) return;
    const c = kf(t, [
      [33.8, { x: 0, y: 30, z: -320, rx: 8, ry: -14, rz: -5 }],
      [35.4, { y: 0, z: 0, rx: 2, ry: 0, rz: 0 }, E.outCubic],
      [37.9, { z: 90, rx: -1, ry: 5, rz: 0.6 }, E.linear],
    ]);
    setCam(s6.world, c);
    driftBlobs(s6blobs, t);
    revealWords(s6h, t, 33.95, { stagger: 0.07 });
    rise(s6sub, t, 34.4);
    [[s6a, -1, 34.4], [s6b, 1, 34.6]].forEach(([o, side, t0]) => {
      const p = E.outCubic(prog(t, t0, t0 + 0.9));
      o.card.style.opacity = prog(t, t0, t0 + 0.3);
      o.card.style.transform = `translate3d(${(1 - p) * side * 520}px,0,${(1 - p) * -300}px) rotateY(${(1 - p) * side * -55}deg)`;
      popTile(o.it, t, t0 + 0.45);
    });
    // Diagonal wipe into scene 7: scene 6 eases left as it is covered.
    const wp = E.inOutQuart(prog(t, 37.4, 38.05));
    if (t > 34.2) s6.root.style.transform = wp > 0 ? `translate3d(${-wp * 260}px,0,0)` : "none";
  }

  /* ======================================================================
     Scene 7: call to action
     ====================================================================== */
  const s7 = makeScene("s7");
  s7.bg.style.background = "radial-gradient(1100px 620px at 50% 30%, rgba(24,186,218,.20) 0%, transparent 70%), linear-gradient(135deg,#00293b 0%,#001824 100%)";
  const s7svg = svgEl("svg", { width: 1920, height: 300, viewBox: "0 0 1920 300" }, null);
  el("div", "abs", s7.bg, { left: "0", top: "800px", width: "1920px", height: "300px" }).appendChild(s7svg);
  const wavePts = [[-40, 190], [160, 170], [340, 205], [520, 140], [700, 165], [880, 110], [1060, 150], [1240, 120], [1420, 160], [1600, 125], [1780, 150], [1960, 135]];
  const s7wave = svgEl("path", { d: smoothPath(wavePts), fill: "none", stroke: "rgba(24,186,218,.38)", "stroke-width": 5, "stroke-linecap": "round" }, s7svg);
  const s7band = el("div", "abs", stage, { top: "-200px", width: "140px", height: "1480px", background: "linear-gradient(90deg, transparent, #18bada 40%, #18bada 60%, transparent)", display: "none", boxShadow: "0 0 60px rgba(24,186,218,.6)" });
  const s7logo = el("img", "abs", s7.world, { left: px(960 - 290), top: "100px", width: "580px", height: "261px" });
  s7logo.src = "../../public/brand/medville-logo-on-dark.svg";
  const s7h = words(s7.world, "Check your eligibility today.", { position: "absolute", left: "0", width: "1920px", top: "388px", textAlign: "center", font: "700 80px/1.1 Poppins", color: "#ffffff" });
  const s7sub = el("div", "abs", s7.world, { left: "0", width: "1920px", top: "490px", textAlign: "center", font: "400 34px Inter", color: "#c5e3ee" }, "Our team is ready to help you get started.");
  const s7btnWrap = el("div", "abs", s7.world, { left: px(960 - 290), top: "572px", width: "580px", height: "100px" });
  const s7ripple = el("div", "abs", s7btnWrap, { inset: "0", borderRadius: "999px", border: "4px solid #18bada" });
  const s7btn = el("div", "abs", s7btnWrap, {
    inset: "0", borderRadius: "999px", background: "#18bada", display: "flex", alignItems: "center", justifyContent: "center",
    gap: "16px", font: "600 34px Poppins", color: "#00293b", boxShadow: "0 20px 50px rgba(24,186,218,.45)",
  });
  el("span", "", s7btn, null, "Check Your Eligibility");
  const s7arrow = icon("arrow-right", 36, "#00293b", 2.6, s7btn);
  const s7contacts = el("div", "abs", s7.world, { left: "0", width: "1920px", top: "730px", display: "flex", justifyContent: "center", gap: "26px" });
  const CONTACTS = [["globe", "medvillediabetes.com"], ["phone", "888-564-2595"], ["mail", "info@medvillediabetes.com"]];
  const s7pills = CONTACTS.map(([ic, label]) => {
    const pill = el("div", "", s7contacts, {
      display: "flex", alignItems: "center", gap: "16px", padding: "12px 30px 12px 12px", borderRadius: "999px",
      background: "rgba(11,58,82,.85)", border: "2px solid rgba(24,186,218,.38)", font: "500 30px Inter", color: "#ffffff", whiteSpace: "nowrap",
    });
    const circ = el("div", "", pill, { width: "60px", height: "60px", borderRadius: "50%", background: "#18bada", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" });
    pill._ic = icon(ic, 30, "#00293b", 2.1, circ);
    el("span", "", pill, null, label);
    return pill;
  });
  const s7hours = el("div", "abs", s7.world, { left: "0", width: "1920px", top: "850px", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", font: "500 26px Inter", color: "#a3c6d4" });
  icon("clock", 28, "#6fc4e0", 2, s7hours);
  el("span", "", s7hours, null, "Monday to Friday, 8AM to 5PM Pacific Time");
  // Cursor: Lucide's pointer, filled white so it reads as a cursor.
  const s7cursor = el("div", "abs", s7.world, { left: "0", top: "0", width: "64px", height: "64px", filter: "drop-shadow(0 8px 14px rgba(0,0,0,.45))" });
  const cur = icon("mouse-pointer-2", 64, "#00293b", 1.6, s7cursor);
  cur.setAttribute("fill", "#ffffff");

  function renderS7(t) {
    const on = t >= 37.35;
    show(s7, on);
    if (!on) { s7band.style.display = "none"; return; }
    // Diagonal wipe from the right edge, led by a cyan band.
    const wp = E.inOutQuart(prog(t, 37.4, 38.05));
    const edge = lerp(W + 420, -520, wp);
    s7.root.style.clipPath = wp < 1 ? `polygon(${edge}px 0, ${W + 600}px 0, ${W + 600}px ${H}px, ${edge - 400}px ${H}px)` : "none";
    if (wp > 0 && wp < 1) {
      s7band.style.display = "block";
      s7band.style.left = px(edge - 270);
      s7band.style.transform = "rotate(20.3deg)";
      s7band.style.opacity = 1;
    } else s7band.style.display = "none";

    const c = kf(t, [
      [37.6, { x: 0, y: 40, z: -380, rx: -16, ry: 10, rz: 0 }],
      [39.5, { y: 0, z: 0, rx: 0, ry: 0 }, E.outCubic],
      [43.75, { z: 60, rx: 1.5, ry: -2 }, E.linear],
    ]);
    setCam(s7.world, c);
    const wl = s7wave.getTotalLength();
    s7wave.style.strokeDasharray = `${wl} ${wl}`;
    s7wave.style.strokeDashoffset = wl * (1 - E.inOutSine(prog(t, 37.9, 41.0)));

    rise(s7logo, t, 38.0, { dy: 30, scale: 0.9 });
    revealWords(s7h, t, 38.35, { stagger: 0.07 });
    rise(s7sub, t, 38.85);
    // Button pops in, the cursor arrives and clicks it.
    const bp = E.outBack(prog(t, 39.0, 39.6));
    const click = 40.05;
    const press = t < click ? 1 : lerp(0.94, 1, E.outBack(prog(t, click, click + 0.35)));
    s7btnWrap.style.opacity = prog(t, 39.0, 39.25);
    s7btn.style.transform = `scale(${lerp(0.6, 1, bp) * (t >= click && t < click + 0.35 ? press : 1)})`;
    s7arrow.style.transform = `translateX(${Math.max(0, Math.sin((t - 40.4) * 4)) * 6 * prog(t, 40.4, 40.6)}px)`;
    const rp = prog(t, click, click + 0.8);
    s7ripple.style.opacity = rp > 0 && rp < 1 ? (1 - rp) * 0.9 : 0;
    s7ripple.style.transform = `scale(${1 + E.outCubic(rp) * 0.14}, ${1 + E.outCubic(rp) * 0.5})`;
    const cp = E.inOutCubic(prog(t, 39.35, 39.95));
    const cxp = lerp(1500, 960 + 150, cp), cyp = lerp(1020, 640, cp) + Math.sin(cp * Math.PI) * -60;
    const cOut = prog(t, 40.6, 41.0);
    s7cursor.style.opacity = prog(t, 39.35, 39.5) * (1 - cOut);
    const cs = t >= click && t < click + 0.2 ? 0.86 : 1;
    s7cursor.style.transform = `translate3d(${cxp - 12}px,${cyp - 8}px,40px) scale(${cs})`;

    s7pills.forEach((p, i) => {
      rise(p, t, 40.4 + i * 0.14, { dy: 30, scale: 0.85 });
      drawIcon(p._ic, prog(t, 40.55 + i * 0.14, 41.2 + i * 0.14));
    });
    rise(s7hours, t, 41.0, { dy: 18 });
  }

  /* ---------- frame ---------- */
  const vignette = el("div", "", stage);
  vignette.id = "vignette";
  function renderAt(t) {
    t = clamp(t, 0, DURATION);
    // Cube turn between scenes 5 and 6.
    const cp = E.inOutQuart(prog(t, 33.4, 34.15));
    renderS1(t);
    renderS2(t);
    renderS3(t);
    renderS4(t);
    renderS5(t);
    if (t >= 33.4 && t < 34.4) cube(s5, -90 * cp);
    renderS6(t);
    if (t >= 33.4 && t <= 34.2) cube(s6, 90 * (1 - cp));
    else if (t > 34.2 && t < 37.4) s6.root.style.transform = "none";
    renderS7(t);
  }
  window.render = renderAt;
  window.DURATION = DURATION;

  /* ---------- boot ---------- */
  async function ready() {
    await document.fonts.ready;
    await Promise.all(["Poppins", "Inter"].flatMap(f => [400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px ${f}`))));
    const imgs = [...document.images];
    await Promise.all(imgs.map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; }))));
    await Promise.all(imgs.map(i => i.decode().catch(() => {})));
    document.getElementById("loading").remove();
    window.__ready = true;
  }
  window.__readyPromise = ready();

  const params = new URLSearchParams(location.search);
  if (params.has("t")) {
    window.__readyPromise.then(() => renderAt(parseFloat(params.get("t"))));
  } else if (!params.has("render")) {
    // Live preview: loops in the browser. Click to restart with sound.
    window.__readyPromise.then(() => {
      let start = performance.now();
      const audio = new Audio("medville-ad-music.wav");
      document.body.addEventListener("click", () => { start = performance.now(); audio.currentTime = 0; audio.play().catch(() => {}); });
      const loop = now => {
        renderAt(((now - start) / 1000) % (DURATION + 1));
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }
})();
