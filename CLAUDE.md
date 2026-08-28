# Medville Diabetes — project brief for Claude Code

Read this file completely before making any change.

## What this project is

A product catalog and lead-qualification website for Medville Diabetes, a
United States supplier of continuous glucose monitors (CGMs). The client is
Kryll Ann Amarante. The site is modeled on questhealthsolutions.com (about 70
percent of the content substance, rewritten) with an original, better design.

The signed agreement commits to a specific stack and to HIPAA-compliant
handling of the qualification form. Both are contractual, not preferences.

## The agreed stack (contractual — do not substitute)

| Layer | Product | Why |
|---|---|---|
| Marketing site + shop hosting | Firebase Hosting | Free, allows commercial use |
| Form intake | Cloud Run function (`functions/index.js`) | On Google's HIPAA covered list |
| Database | Cloud Firestore, `leads` collection | Covered |
| Admin login (later milestone) | Identity Platform, NOT plain Firebase Auth | Covered; plain Firebase Auth is not |
| Plan | Blaze (pay as you go) | Required for functions and for the BAA |

Do not deploy this site to Vercel. Vercel's free tier does not permit
commercial client work, and the agreement names Firebase Hosting.

## HIPAA rules (contractual — Section 3 of the signed agreement)

The qualify form asks whether the visitor injects insulin daily, next to
name, email, phone, city, and state. That combination is Protected Health
Information (PHI). The PHI pathway is: Qualify page -> Cloud Run function ->
Firestore `leads` collection. Rules that must survive every future change:

1. A dedicated Google Cloud project for this site, in the client's account.
   The client must accept the Google Cloud BAA on it before launch:
   https://cloud.google.com/security/compliance/hipaa (covered products list)
   https://support.google.com/cloud/answer/6329727 (how to accept the BAA)
2. Only BAA-covered products may touch PHI: Firestore, Cloud Run functions,
   Identity Platform, Cloud Storage. Nothing Firebase-branded beyond Hosting
   (which never sees PHI), and nothing in Preview or Beta.
3. Never add Google Analytics, Meta Pixel, Hotjar, chat widgets, session
   recording, or any third-party script to /qualify or its success state.
   Ideally add none of these anywhere without a compliance review.
4. PHI never appears in: URLs or query strings, console output, application
   logs, error messages, document IDs, resource names or labels, cache
   (responses that return lead data must be Cache-Control: no-store),
   email notifications (a notification may say a new lead exists; it must
   never contain the answers), or test fixtures (invent test data).
5. Data Access audit logs must be enabled for Firestore in the Google Cloud
   console (they are off by default). Admin Activity logs are on by default.
6. The form POSTs JSON. Never convert it to GET. Never echo submitted values
   in error messages.
7. At handover, produce a one-page record: where PHI is stored, what is
   encrypted, who has admin access, which BAAs are signed. Section 3.6 of the
   agreement promises this document.

## Copy rules (client requirement)

All site copy is plain English: no idioms, no contractions ("do not", never
"don't"), short sentences, one idea per sentence. Keep this in every new
string. Product descriptions must stay original — never paste text from the
reference site.

Since 2026-08-28 the wording of every public page comes from the client's
own document, `MEDVILLE_DIABETES__Website_Copy.docx`. That document is the
source of truth for copy; the rules above govern anything written outside
it. Where the client's text used a contraction it was expanded, which is the
only change made to their wording.

## What is already done

- Full React + TypeScript + Vite + Tailwind v4 site: Home, Products (landing,
  CGM listing, insulin pump listing), Product detail, Our Services, Refer a
  Patient, Qualify form, About, Contact, Privacy Policy, Terms of Service,
  404, and the /admin dashboard.
- Design token system in `src/index.css` derived from `brand/Medville_Brand.svg`
  (navy #00293B, cyan #18BADA, orange #FF9E1B, Poppins + Inter). No raw hex
  in components; extend tokens, do not bypass them.
- Logo: the client's own artwork, delivered 2026-08-28. The untouched original
  is `brand/MD_Logo_Transparent.svg`; the site renders
  `public/brand/medville-logo.svg`, the same file with its viewBox cropped to
  the artwork (the delivered canvas is 400x350 and the artwork occupies the
  middle 180 units). One file everywhere, on the client's instruction, so
  `src/components/Logo.tsx` takes no variant. `public/favicon.svg` and
  `public/apple-touch-icon.png` are the logo's own "M" path in its navy on a
  white tile: a browser draws a favicon at 16 px, the wordmark is 2.2 times
  wider than tall, and fitting the whole lockup into a square left the type
  unreadable. White because the navy mark vanished against a dark tab bar. All vector, so nothing
  blurs at any size. `brand/Medville_Logo.svg` is the earlier cyan-tile lockup,
  kept for reference.
- Known contrast issue, raised with the client and their call: the logo's
  wordmark is navy #002a3b and the footer gradient runs #0a3d2e to #00293b, so
  the wordmark measures 1.19:1 against the footer and is effectively invisible
  there. The cyan "DIABETES" line and the leaves still read. A reversed logo
  from the client, or a light panel behind it, fixes it whenever they want.
- Administrator invitations. An owner invites by email from the dashboard's
  Administrators screen. `admins.invite` in `functions/admin/index.js` creates
  the Identity Platform account and sets the role claim but never a password,
  then the dashboard asks Identity Platform to email the person a link to
  choose one. Two properties to preserve: an invitation is not a credential,
  because the account cannot be signed in to until the invitee proves control
  of the mailbox; and the invitation is written to the audit log before
  anything is returned, so no account can appear without a record of who made
  it. The email is sent by Identity Platform rather than a mail service, which
  keeps the stack inside the BAA-covered products and adds no monthly cost.
  The wording lives in the Google Cloud console under Identity Platform,
  Templates.
- Blog. Articles live in the Firestore `posts` collection, written from the
  dashboard's Blog screen and read by the public site, following the same
  pattern as faqs and testimonials. A post body is a list of typed blocks, not
  HTML: `src/data/blog.ts` holds the shapes, the markdown-lite inline parser
  (**bold**, *italic*, [link](url)) and the decoder, and
  `src/components/PostBody.tsx` is the only thing that renders them. The
  dashboard preview mounts that same component, so a preview cannot drift from
  the published article. Two rules to keep: nothing is ever rendered with
  dangerouslySetInnerHTML, and a block stores a token name for colour and font
  rather than a raw value, so a post cannot introduce type or colour the rest
  of the site does not use. Only http, https, root-relative and mailto links
  survive the parser. Pages are `/blog` and `/blog/:slug`; the home band and
  the footer both point at `/blog`, and the home band is hidden entirely until
  a post is published. The old "Guides" section and its `/#guides` anchor are
  gone, replaced by this at the client's request on 2026-08-28. A picture can
  be uploaded or given as a web address: Firebase only creates the default
  Cloud Storage bucket on the Blaze plan, so on the free tier uploads fail and
  pasting an address is the route that works. Both fields write the same
  value, so nothing changes when Storage is switched on.
- The qualify form has two states, decided by `VITE_QUALIFY_ENDPOINT`. With it
  set, the real form renders and posts to the intake function. With it unset,
  the form is not rendered at all and the card becomes an "Eligibility checks
  open soon" panel offering the phone number and email. There is deliberately
  no path to the success screen without a server: an earlier build faked one,
  which told a visitor "We Received Your Information" while nothing had been
  sent. Never reintroduce that. Setting the variable at launch restores the
  form with no code change.
- Link preview card: `public/og-image.jpg`, a 1200x630 render of the home page
  hero, wired up by the Open Graph and Twitter tags in `index.html`. Rebuild it
  with `npm run build:og` (serve `dist` on :4173 first) whenever the hero
  changes. Crawlers do not run JavaScript, so they only ever read `index.html`
  and every address on the site shares this one card, which is intended.
- Cache rules in `firebase.json`: only `/assets/**` may be immutable, because
  Vite fingerprints those names. Anything with a stable name (the icons, the
  logo, images in `public/`) must revalidate, or a replacement will not reach
  visitors who have been to the site before.
- `ProductViewer` component: drag to rotate front/back, wheel and pinch zoom,
  double-tap zoom, keyboard support, reduced-motion support.
- Scroll-motion system in `src/lib/useReveal.ts` and the reveal block of
  `src/index.css`. `useReveal` reveals anything carrying `data-reveal`;
  a second class picks the shape (`reveal-left`, `reveal-right`, `reveal-drop`,
  `reveal-zoom`, `reveal-push`, `reveal-blur`, `reveal-tilt`,
  `reveal-swing-left`, `reveal-swing-right`, `reveal-curtain`,
  `reveal-curtain-left`, `reveal-expand`, `reveal-settle`) and a third the pace
  (`reveal-swift`, `reveal-slow`, `reveal-glacial`). `useParallax` drifts
  anything carrying `data-parallax` against the scroll. Rules for new work:
  give consecutive sections different shapes, never put `data-reveal` and
  `data-parallax` on the same element, and keep every starting state inside
  the hook so nothing is stranded invisible under reduced motion.
- 11 products in `src/data/products.ts` with plain-English copy.
- Placeholder vector product art in `public/products/`.
- PHI-safe intake function source in `functions/`.
- `firebase.json`, `firestore.rules`, `.firebaserc` (placeholder project id).

## What remains (in order)

1. `npm install && npm run dev` — confirm the site runs, review all pages.
2. Replace placeholders, searchable by these strings:
   - Done 2026-08-26: real phone 888-564-2595 is in place (Footer, Contact,
     Qualify error, Header drawer; the header top strip was removed).
   - Done 2026-08-26: the client's consent language is live on Qualify, and
     the client's Privacy Policy and Terms of Service pages are published at
     /privacy-policy and /terms-of-service. That text is verbatim legal copy;
     changes to it must come from the client.
   - Done 2026-08-28: the client's website copy document is live across every
     page, the real address (28863 Industry Dr, Valencia, CA 91355) and the
     phone number 800-394-3917 are in place, and the Refer a Patient page
     exists at /refer-a-patient. Shared facts live in `src/data/company.ts`.
   - Done 2026-08-28: `info@medvillediabetes.com` is confirmed correct. The
     domain's MX record points at
     `medvillediabetes-com.mail.protection.outlook.com`, so mail runs on
     Microsoft 365, and the mail domain is spelled "diabetes". The
     `info@medvillediabetics.com` in the client's copy document is a typo.
     Still worth asking the client whether anyone actually reads the `info@`
     mailbox: an MX record proves the domain receives mail, not that that
     particular address exists.
   - `REPLACE-WITH-REFERRAL-PACKET-PDF` (`src/data/company.ts`) — the referral
     form and requirements PDF. Until it is set, the referral buttons ask
     providers to request the packet by email instead of offering a download
     that would not resolve.
   - `REPLACE-WITH-REFERRAL-VIDEO-EMBED` (`src/data/company.ts`) — the 30 to
     60 second referral explainer video. Until it is set, the video frame
     shows a placeholder panel.
   - Verified customer testimonials. The home page testimonials band renders
     only when the client publishes a testimonial from the dashboard, so no
     placeholder quote ever reaches a visitor.
   - A provider photograph for the Refer a Patient hero, which currently
     borrows a services photograph.
   - Done 2026-08-28: the production domain is www.medvillediabetes.com,
     bought through GoDaddy. It is written into robots.txt, sitemap.xml, and
     the canonical, og:url, og:image and twitter:image tags in index.html,
     which have to be absolute. The apex medvillediabetes.com should redirect
     to the www host so one address is canonical. Adding the custom domain in
     the Firebase console and the DNS records at GoDaddy are console jobs and
     are not done from this repository.
   - `REPLACE-WITH-CLIENT-GCP-PROJECT-ID` (.firebaserc)
3. Replace placeholder product art with real supplier photos (front and back
   per product) once the client provides them. Keep the same file paths or
   update `src/data/products.ts`.
4. Client accepts the Google Cloud BAA on the dedicated project (Blaze plan).
5. Deploy the intake function (from `functions/`):
   ```
   gcloud functions deploy qualifyIntake \
     --gen2 --runtime=nodejs20 --region=us-central1 \
     --source=. --entry-point=qualifyIntake \
     --trigger-http --allow-unauthenticated \
     --set-env-vars=^|^ALLOWED_ORIGIN=https://medville-diabetes.web.app,https://www.medvillediabetes.com
   ```
   Put the resulting URL in `.env` as `VITE_QUALIFY_ENDPOINT` (this variable
   is safe to expose; it is only a URL).
6. Deploy Firestore rules: `firebase deploy --only firestore:rules`.
7. Enable Data Access audit logs for Firestore in the console.
8. Build and deploy hosting: `npm run build && firebase deploy --only hosting`.
9. Set a Google Cloud budget alert (10 USD) on the project, per Section 7.3
   of the agreement.
10. Later milestone: admin dashboard for reading leads, authenticated with
    Identity Platform and an `admin` custom claim, audit-logging every view
    (write an `auditLog` entry per read; see firestore.rules comments).

## Contract facts that shape decisions

- Fee: 1,600 USD total; milestones 30 / 50 / 20.
- Client's recurring costs: domain 8 to 15 USD per year; Google Cloud
  estimated 0 to 5 USD per month. Do not add services that break this.
- Timeline: 7 days from receipt of client materials (logo, content, brand
  colors — already in hand, see `brand/`).
- One round of consolidated revisions at the review stage before launch.

## Design system rules

- Tokens live in `src/index.css` under `@theme`. Never write raw hex or
  arbitrary pixel values in components.
- One container (`src/components/Container.tsx`); never re-declare widths.
- Orange (`--color-cta`) is reserved for the qualify call to action only.
- Radius stance: soft consumer (`--radius-*`); do not mix in sharp corners.
- Respect `prefers-reduced-motion` in any new animation.
- Mobile first: build at 375 px, enhance upward; touch targets 44 px minimum.
