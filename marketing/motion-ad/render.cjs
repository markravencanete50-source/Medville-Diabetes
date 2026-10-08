/*
  Renders the motion ad to video, or to still frames for review.

    node render.cjs                         full video, 30 fps, no sound
    node render.cjs --fps 60 --out ad.mp4   another frame rate or file name
    node render.cjs --stills 1,5.5,12       PNG stills at these seconds

  Needs playwright-core (npm i --no-save playwright-core) and ffmpeg.
  The page is served over a small local web server from the repository root
  so it can load the product photographs from public/ without copying them.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright-core");

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : def;
};
const FPS = Number(opt("fps", 30));
const OUT = opt("out", path.join(__dirname, "medville-ad-silent.mp4"));
const STILLS = opt("stills", "");
const STILL_DIR = opt("still-dir", path.join(__dirname, "stills"));
const FROM = Number(opt("from", 0));
const TO = opt("to", null);
const EXEC = process.env.CHROMIUM_PATH || undefined;

const ROOT = path.resolve(__dirname, "..", "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav" };

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

(async () => {
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/marketing/motion-ad/index.html?render`;
  const browser = await chromium.launch({ executablePath: EXEC, args: ["--disable-gpu-vsync", "--force-color-profile=srgb", "--hide-scrollbars"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("console", m => console.log("[page]", m.text()));
  page.on("pageerror", e => { console.error("[page error]", e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const duration = await page.evaluate(() => window.DURATION);

  if (STILLS) {
    fs.mkdirSync(STILL_DIR, { recursive: true });
    for (const s of STILLS.split(",").map(Number)) {
      await page.evaluate(t => window.render(t), s);
      await page.screenshot({ path: path.join(STILL_DIR, `t${s.toFixed(2).padStart(6, "0")}.png`) });
    }
  } else {
    const end = TO === null ? duration : Number(TO);
    const frames = Math.round((end - FROM) * FPS);
    const ff = spawn("ffmpeg", [
      "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-movflags", "+faststart", OUT,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    const started = Date.now();
    for (let f = 0; f < frames; f++) {
      const t = FROM + f / FPS;
      await page.evaluate(x => window.render(x), t);
      const buf = await page.screenshot({ type: "png" });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      if (f % (FPS * 2) === 0) process.stdout.write(`frame ${f}/${frames}  ${((Date.now() - started) / 1000).toFixed(0)}s\n`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on("close", r));
    console.log("wrote", OUT);
  }
  await browser.close();
  server.close();
})();
