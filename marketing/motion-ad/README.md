# Medville Diabetes motion ad

A 43.75 second motion graphics advertisement for Medville Diabetes, 1920 x 1080
at 60 frames per second, with an original soundtrack.

The finished file is `medville-diabetes-ad-1080p.mp4`. This folder is outside
`public/`, so nothing here is deployed with the website.

## What it shows

| Time | Scene | Camera |
| --- | --- | --- |
| 0 to 5 s | Hook: "Managing diabetes takes work every day. Getting your CGM should be simple." A glucose trend draws across a grid. | Low angle, rising and swinging right |
| 5 to 10 s | Logo reveal through a circle wipe from the head of the trend line, then the tagline. | Turns from a side angle to face the logo, then drifts |
| 10 to 15 s | What we supply: FreeStyle Libre 3, Dexcom G7, Stelo, Tandem t:slim X2, FreeStyle Libre 2 on a 3D carousel. | Whip pan in, looking down on the carousel, zoom through |
| 15 to 27.5 s | How it works: check your eligibility, we review your coverage, delivered to your door. | Tracks along the three steps, each seen from its own angle |
| 27.5 to 33.75 s | Our services: insurance verification, doctor coordination, documentation review, prior authorization, ongoing resupply, customer support. | Crane down from overhead |
| 33.75 to 37.5 s | Looking for a CGM supplier: one card for patients, one for healthcare providers. | Cube turn in, Dutch angle that levels out |
| 37.5 to 43.75 s | Call to action: Check Your Eligibility, website, phone 888-564-2595, email, hours. | Diagonal wipe in, looking up, then settling |

Copy follows the project rules: plain English, no contractions, no dashes, and
no claim that is not on the website. The contact details match
`src/data/company.ts`. Icons are Lucide line icons (the set the website uses)
that draw themselves, always navy on cyan or white on navy.

## Files

- `index.html`, `ad.js`: the ad. `window.render(t)` draws the frame at `t`
  seconds. Open `index.html` through a local web server from the repository
  root to watch it live; click to restart it with sound.
- `icons.js`: the Lucide icons used, from `lucide-static` 0.468.0 (ISC).
- `fonts/`: Poppins and Inter (SIL Open Font Licence), stored locally.
- `music.py`: synthesises `medville-ad-music.wav`. Nothing licensed.
- `render.cjs`: renders frames with Playwright and encodes them with ffmpeg.
  `--stills 1,5.5,12` writes review stills instead.
- `build.sh`: music, parallel render, join and mux.

Photographs and product images are read from `public/` and are the same ones
the website uses (see `public/photography/SOURCES.md`).

## Rebuild

```sh
cd marketing/motion-ad
npm i --no-save --prefix /tmp/ad-tools playwright-core@1.56.1
NODE_PATH=/tmp/ad-tools/node_modules ./build.sh          # 60 fps
NODE_PATH=/tmp/ad-tools/node_modules FPS=30 ./build.sh   # quicker review
```

To change a word, edit it in `ad.js` and rebuild. Scene timings are listed at
the top of `ad.js`; the sound effects in `music.py` are placed on the same
times, so move both together.
