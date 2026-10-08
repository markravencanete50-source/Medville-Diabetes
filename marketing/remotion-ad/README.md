# Medville Diabetes video ad (Remotion)

A 44 second advertisement with an AI voiceover, 1920 x 1080 at 30 frames per
second. The finished file is `out/medville-diabetes-ad.mp4`. This folder is
outside `public/`, so nothing here is deployed with the website.

## What it shows

The voice explains the business while the process plays out on screen.

| Time | Voiceover | On screen | Into the next scene |
| --- | --- | --- | --- |
| 0 to 5.6 s | Managing diabetes takes work every day. Getting your CGM should be simple. | A woman at home on her phone, a glucose reading drawing itself beside her. | The reading card grows to fill the frame. |
| 5.6 to 11.4 s | Medville Diabetes is a United States supplier of CGMs, sensors, and insulin pumps. | The logo, then CGM systems, a sensor and an insulin pump, each as it is named. | The camera pulls back: this was the website on a laptop. |
| 11.4 to 18.2 s | Here is how it works. First, choose your device, like the FreeStyle Libre 3 or the Dexcom G7. | The page scrolls to the products. The cursor rests on each product as it is named, picks the Libre 3, then clicks Check Your Eligibility. | The button opens out into a phone. |
| 18.2 to 22.1 s | Next, fill out our short eligibility form online. | The real form fills in on the phone: name, email, phone, city, state, the chosen product, the insulin question, consent, Check My Eligibility, then the confirmation. | The application leaves the phone and the camera follows it. |
| 22.1 to 27.8 s | Our team reviews your information, checks your insurance, and works with your doctor. | A care team member, the application on the desk, three checks ticked as they are named, a call to the clinic. On "qualify", it is stamped QUALIFIED. | The application drops into a Medville box, which closes. |
| 27.8 to 31.4 s | Once you qualify, we ship your CGM and supplies straight to your door. | The box rides a route on a map to "Your home" while an order tracker ticks. On "door", doors close and swing open on the doorstep. | The doorstep picture flips over like a card. |
| 31.4 to 36.6 s | And we stay with you, with ongoing resupply and real people to answer your questions. | The support team with a short chat, and the resupply cycle: reminder, reorder, delivered. | The resupply ring opens into the end card. |
| 36.6 to 44.4 s | Medville Diabetes. Check your eligibility today at medvillediabetes.com. | Logo, Check Your Eligibility clicked, website, phone, email and hours. | |

A step tracker (Choose, Apply, Review, Delivered) sits top left through the
process, and captions follow the voice so the ad works with the sound off.

Facts on screen come from the website: product names from `src/data/products.ts`,
form fields and wording from the qualify page, phone, email and hours from
`src/data/company.ts`. The person in the form is invented (Jordan Rivera,
jordan@example.com, a 555-01xx number), as the project's HIPAA rules require
for any sample data.

## Sound

- Voice: Kokoro text to speech, voice `af_heart`, Apache 2.0 licence, so it can
  be used commercially. `voiceover/voiceover.py` generates it line by line and
  writes `src/voiceover.json`, the timing every scene is placed against.
- Music and effects: synthesised by `voiceover/sound.py` with numpy. No
  licensed audio. The music dips under the voice and lifts in the pauses.
- `scripts/render.sh` normalises the mix to -14 LUFS.

## Licence to check before publishing

Remotion is free for individuals and for companies of up to three people.
A larger company needs a Remotion company licence (remotion.dev/license).
Product photographs are the manufacturers' images already used on the site,
and the lifestyle photographs are the Pexels images listed in
`public/photography/SOURCES.md` of the website.

## Working on it

```sh
cd marketing/remotion-ad
npm install
npx remotion studio            # preview and scrub in the browser
scripts/render.sh              # render out/medville-diabetes-ad.mp4
node scripts/stills.mjs out/stills 6 15.5 28   # review stills at those seconds
```

If Remotion cannot download its browser, set `REMOTION_BROWSER` to an
installed Chrome or headless shell.

To change the script, edit `LINES` in `voiceover/voiceover.py`, then run it
(it needs `pip install kokoro-onnx soundfile` and the two model files from
github.com/thewh1teagle/kokoro-onnx releases, model-files-v1.0), then
`python3 voiceover/sound.py` so the music matches the new length. Scenes
follow the new timing automatically through `src/timeline.ts`; check the
moments placed on particular words with `wordTime`.

## Layout

- `src/MedvilleAd.tsx`: the composition, audio mix and sound effect cues.
- `src/scenes/`: one file per scene, each owning its transition into the next.
- `src/components/`: the website recreation, cursor, icons, captions, step tracker.
- `src/icons.ts`: Lucide icons, the set the website uses, drawn stroke by stroke.
