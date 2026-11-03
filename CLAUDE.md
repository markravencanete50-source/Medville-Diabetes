# Medville Diabetes: project brief for Claude Code

Read this file completely before making any change.

Current launch status and activation requirements are in `LAUNCH-STATUS.md`.
That file supersedes older operational statements here. Production eligibility and
contact intake are enabled on AWS. Staff email alerts (counts only, never patient
details) are sent by the `medville-staff-alerts` Lambda to staff who switch them on;
the protected dashboard holds the details. Each new lead also emails the company
inbox through SES (`aws/src/notification.cjs`, no answers), and the customer's
receipt goes through Resend (`aws/src/confirmation.cjs`); whether Resend is
covered by a BAA is open in LAUNCH-STATUS.md. The function runtime target is Node.js 22.

## What this project is

A product catalog and lead-qualification website for Medville Diabetes, a
United States supplier of continuous glucose monitors (CGMs). The client is
Kryll Ann Amarante. The site is modeled on questhealthsolutions.com (about 70
percent of the content substance, rewritten) with an original, better design.

The client representative approved the AWS PHI pathway on 2026-09-21 after
Google could not make its BAA acceptance control available. HIPAA-compliant
handling of the qualification form remains contractual.

## The agreed stack (contractual, do not substitute)

| Layer | Product | Why |
|---|---|---|
| Marketing site + shop hosting | Firebase Hosting | Free, allows commercial use |
| Form intake | AWS API Gateway and Lambda | Covered by the active AWS BAA |
| Lead database | Amazon DynamoDB with customer-managed KMS encryption | Covered by the active AWS BAA |
| Admin login | Identity Platform for workforce identity only | No patient data is stored in the identity service |
| Non-PHI content | Cloud Firestore and the existing Google functions | Patient records must never enter these services |

Do not deploy this site to Vercel. Vercel's free tier does not permit
commercial client work, and the agreement names Firebase Hosting.

## HIPAA rules (contractual, Section 3 of the signed agreement)

The qualify form asks whether the visitor injects insulin daily, next to
name, email, phone, city, and state. That combination is Protected Health
Information (PHI). The PHI pathway is: Qualify page -> AWS API Gateway -> Lambda -> DynamoDB. Rules that must survive every future change:

1. AWS account `214161651605` has an active AWS Business Associate Addendum,
   effective 2026-09-21. The downloaded agreement is held by the client.
2. Only BAA-covered AWS products may touch PHI. The approved pathway is API
   Gateway, Lambda, DynamoDB and KMS. Firebase Hosting serves static files and
   must never receive a form submission. The legacy Cloud Run and Firestore
   lead pathway must stay disabled.
3. Never add Google Analytics, Meta Pixel, Hotjar, chat widgets, session
   recording, or any third-party script to /qualify or its success state.
   Ideally add none of these anywhere without a compliance review.
4. PHI never appears in: URLs or query strings, console output, application
   logs, error messages, document IDs, resource names or labels, cache
   (responses that return lead data must be Cache-Control: no-store),
   email notifications (a notification may say a new lead exists; it must
   never contain the answers), or test fixtures (invent test data).
5. Every AWS lead read, update, export and dashboard summary must write an
   audit record. DynamoDB point-in-time recovery and deletion protection must
   remain enabled for the lead and audit tables.
6. The form POSTs JSON. Never convert it to GET. Never echo submitted values
   in error messages.
7. At handover, produce a one-page record: where PHI is stored, what is
   encrypted, who has admin access, which BAAs are signed. Section 3.6 of the
   agreement promises this document.

## Copy rules (client requirement)

All site copy is plain English: no idioms, no contractions ("do not", never
"don't"), short sentences, one idea per sentence. Keep this in every new
string. Product descriptions must stay original. Never paste text from the
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
- Design token system in `src/index.css`. Since 2026-09-02, on the client's
  instruction, the palette is three colours only: navy #00293B, cyan #18BADA
  and white, with Poppins + Inter. Orange and green are gone from the whole
  public site, including the 3D care cycle; the dashboard is the one
  exception, described under Dashboard below. Every "grey" text
  token is navy let down towards the cyan tint, and every light ground is a
  cyan tint, so no surface is pure white: white is for type on navy and for
  small marks. Every page opens on the navy hero wash, and the light
  sections below it are the relief. The one colour outside the palette is
  the form error red, which appears only beside a field a visitor got
  wrong, always with an icon and a sentence. No raw hex in components;
  extend tokens, do not bypass them.
- Buttons are cyan or navy, nothing else, and hovering swaps one for the
  other (`src/components/Button.tsx`). Text on cyan is always navy, text on
  navy always white; white on cyan fails contrast and is never paired.
  Filled pills that act as buttons elsewhere (filters, Front and Back
  toggles, the Yes and No answers) follow the same rule: navy fill when
  selected, navy outline when not.
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
- The footer sits on the navy band gradient and renders
  `public/brand/medville-logo-on-dark.svg`, the client's artwork with the
  wordmark fill changed from navy to white and nothing else, because the
  navy wordmark measured 1.19:1 on the footer and was invisible. The cyan
  "DIABETES" line and the leaves are identical in both files.
- Search visibility. This is a single-page app, so a crawler that does not run
  JavaScript would otherwise be served the home page's title on every address.
  `scripts/prerender.mjs` runs after `vite build` and writes a real
  `dist/<path>/index.html` per address, with that page's title, description,
  canonical link, Open Graph and Twitter tags and its JSON-LD. Firebase serves
  a matching static file before applying the catch-all rewrite, so those files
  are what a crawler receives; React boots from the same bundle and takes over.
  Wording is never duplicated: fixed pages come from `src/data/pageMeta.ts`
  (which the pages themselves read through `usePageMeta`), products from
  `src/data/products.ts`, questions from `src/data/faqs.ts`, and articles from
  the published posts in Firestore, fetched best-effort so a network failure
  cannot fail a deploy. Structured data: MedicalBusiness on the home and
  contact pages, FAQPage on the home questions, Product on each product page,
  BlogPosting on each article, Blog on the article index, and a BreadcrumbList
  on everything below the home page. An article published after a deploy has no
  file of its own until the next build; it still renders, only its
  crawler-visible tags wait.
- `dist/sitemap.xml` is written by the same script, from the addresses it just
  emitted, so a new page or a published article cannot reach the site without
  reaching the sitemap. There is deliberately no `public/sitemap.xml` and,
  since 2026-09-02, no `public/robots.txt` either: the hand-kept files they
  replaced drifted from the routes and from the host. Both are written from
  `SITE_ORIGIN` in `src/data/pageMeta.ts`, which makes that constant the one
  line to change when the custom domain is connected.
  `lastmod` appears only where the date is real, which today means
  articles; stamping the build date on every address would claim every page
  changed on every deploy.
- `usePageMeta` writes the title, description, canonical, robots directive and
  the whole Open Graph and Twitter set, on every page, including back to the
  default. That completeness is the point: React Router changes the address
  without reloading, and a tag holding the previous page's value is worse than
  no tag. It also removes `og:image:width`, `og:image:height` and
  `og:image:type` when a page supplies its own picture, because those describe
  `og-image.jpg` and a declared size that does not match the file makes a
  preview crop badly.
- The unknown-address page. Firebase rewrites everything it does not recognise
  to the app, so a mistyped or stale link answers 200 rather than 404. Without
  a directive a search engine would index each of those as another copy of the
  home page. `NotFound` sets `noindex, follow` with a self-referencing
  canonical, which is what Google reads off the rendered page; the no-script
  view still carries the home page's canonical, which consolidates rather than
  duplicates. Narrowing the rewrite to fix this properly is not possible: an
  article published after a deploy has no file, and only the catch-all serves
  it.
- Image loading is decided per position, not per component. The one picture
  that is a page's largest paint carries `fetchPriority="high"`; the rest of a
  first row is `loading="eager"` because a lazy image above the fold is not
  even requested until layout has run; everything below the fold, the footer
  logo included, stays lazy. A product card's back photograph is always lazy:
  it is only seen on hover.
- Administrator access is one login per person, and that is enforced rather
  than advised. A shared mailbox such as `sales@` or `info@` cannot be given a
  role: `functions/admin/index.js` refuses it on invitation and on any later
  role change, and the dashboard says so before the request is sent. The
  reason is the audit log, which names the account that acted; a shared login
  reduces every entry to "somebody at this company". Taking access away is
  never refused, so the rule cannot strand an account that already exists.
  The role each person gets: `owner` for the two business owners, `marketing`
  for anyone writing content, `manager` for the sales team manager, and
  `sales` for each salesperson. (`editor` and `agent` are older names that
  still map to `marketing` and `sales`.)
- The sales team, since 2026-10-27 on the client's instruction. Salespeople
  call leads but must not hold the list, because the owner does not want
  leads taken to competitors. A `sales` account sees only the enquiries
  assigned to it. Both sales roles receive phone and email already removed by
  the AWS lead service, so the numbers are not in the page at all. Call asks
  `leads.dial` for one number, which is audited, counted against a limit of
  60 per person per hour, and handed straight to the computer's dialler
  (Five9 on the client's machines) without being drawn. Neither sales role
  can export, delete, restore or bulk import; the AWS service refuses those
  as well as the dashboard hiding them. The `manager` role assigns leads
  (`leads.assign`, which checks the assignee against the identity service's
  `team.members` list) and reads per-person figures on the Sales team screen
  (`leads.team`, counts only). A salesperson's list is read from the sparse
  `AssigneeTimeline` index on `assignedTo`, sorted by `workSk`: "open#" or
  "done#" followed by the lead's `gsi1sk`. Every write that assigns a lead or
  changes its stage (update, assign, status import) must also write `workSk`
  from the stage it writes, or the alert job will miss or overcount it. Five9 itself can still show the
  dialled number during a call; that is a Five9 setting, not this site.
- Automatic assignment, since 2026-11-03. An Owner or the Sales manager turns
  on "Gets new enquiries" per person on the Sales team screen
  (`assign.auto.set`, which checks the person against `team.members` when they
  join, never when they leave). The rota is one string set, `members`, on the
  item `#auto-assign` in `medville-staff-alerts`, with a `turn` counter; no
  staff id can take that key, so the alert job and the alert list skip it. The
  intake function adds one to `turn` and gives the enquiry to
  `members` sorted, at `(turn - 1) % length`, writing `assignedTo`,
  `assignedBy: system`, `workSk` and a history entry (`source: auto`) and an
  audit entry (`leads.autoAssign`) in the same transaction as the enquiry. An
  empty or unreadable rota means the enquiry arrives unassigned; it is never
  refused for that. The intake role may update only that one item
  (`dynamodb:LeadingKeys`). Revoking or deleting an account on the
  Administrators screen also takes the person off the rota.
- Calls and reshuffles, since 2026-11-03. A call counts only when its outcome
  is recorded: `leads.dial` opens a call (`callOpenBy`, `callOpenAt`), and the
  caller's next stage change in `leads.update` closes it, adding one to
  `callsLogged` and setting `lastCallLoggedAt`. A note alone, or someone
  else's change, does not count it. The Sales team figures read "Calls
  recorded" and "Calls today" from those fields, and show dials still open as
  "Calls not recorded". Reassigning a lead clears its open call.
  `leads.reshuffle` (Owner and Sales manager) takes the open enquiries of
  chosen people, or the unassigned ones, either only those not called yet or
  every open one, and shares them out evenly and oldest first among chosen
  active team members, never back to the person they came from. At most 225
  move per run, in conditional batches of `BATCH_LIMIT` with a history entry
  each (`source: reshuffle`) and one audit entry per batch. Finished leads,
  Do not contact included, never move.
- Lead stages, since 2026-10-28. The list lives in `statuses` in
  `aws/src/admin.cjs` and `LEAD_STATUSES` in `src/admin/api.ts`, and the two
  must agree. Needs verification, Waiting on documents and Not qualified take
  a reason from a fixed list (`stageReasons` / `STAGE_REASONS`), never typed
  text, so a stage cannot carry patient detail. Callback scheduled takes a
  time within 90 days. A stage change sets or clears its own reason and
  callback time on the server. Do not contact is locked: only an Owner can
  move a lead out of it, and Call is refused for it. `contacted` is the
  older stage and stays valid for old records but is not offered. The
  status CSV import cannot set the three stages that need details.
- Per-lead history, since 2026-10-29. `medville-phi-lead-history` (key
  `leadId`, sort `sk` = time and a random id) holds one entry per stage
  change, assignment, call, note edit, delete and restore, written by
  `historyItem` in `aws/src/admin.cjs` inside the same transaction as the
  change. Entries carry fixed fields only (who, when, stage, reason, callback
  time, assignee); a note's text is never copied. It is protected like the
  lead and audit tables (KMS, point-in-time recovery, deletion protection).
  `leads.history` returns it to anyone who can open the lead and is audited.
  Because each lead's history entry shares the transaction, bulk assignment
  and the status import take at most 45 leads (`BATCH_LIMIT`, in
  `aws/src/admin.cjs` and `src/admin/api.ts`), within DynamoDB's 100 writes
  per transaction. The panel closes with the arrival of the enquiry, taken
  from the lead itself.
- Staff email alerts, since 2026-10-28. `aws/src/alerts.cjs` runs every two
  minutes. It reads only open leads (the "open#" part of `workSk`), and only
  their keys, stages, assignment and times, so its cost follows the open work
  rather than the whole history. It emails
  each subscribed person one message of counts: new enquiries waiting to be
  assigned (Owner and Sales manager), enquiries assigned to them, and their
  callbacks now due. A person's watermark moves only after their email is
  accepted, so a failed send retries. Each run that sends writes one
  `alerts.sent` audit entry naming the counted records. Alerts are switched
  on per person by an Owner or the Sales manager on the Sales team screen;
  the address always comes from the identity service, never the browser.
  The staff address and on/off state live in `medville-staff-alerts`, which
  holds no patient data.
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
- Dashboard (`src/admin/`). Redesigned 2026-09-03 on the developer's
  instruction. Its palette lives in `src/admin/admin.css` and is derived from
  the three brand colours only, navy, cyan and orange, plus tints of each
  towards white and shades towards black: no neutral grey, no red, no green.
  The mix and the contrast ratio are written beside every token. Orange is
  the primary action there (Publish, Save, New) and carries warnings and
  danger as a stronger fill; cyan is the rail, the link blend and every
  success state. The sidebar, the top bar and the sign-in page are navy in
  both themes. The shell is mobile first: under 1024px the sidebar becomes a
  drawer, a navy bar names the screen, and a bar at the foot holds the first
  four screens the role allows plus More; every control is 44px on a touch
  screen; under 640px tables stack into labelled cards through `data-label`
  on each cell (a cell without one is the row of actions, and
  `admin-table-keep` opts a table out). `src/admin/ColorPicker.tsx` and
  `src/admin/FontPicker.tsx` are the only places a colour or a font is
  chosen; both open in `src/admin/Popover.tsx`, which is a sheet on a phone.
- Blog. Three client-provided launch articles live in
  `src/data/editorialPosts.ts` so they appear even when Firestore is unavailable
  and receive build-time search metadata. Additional articles live in the
  Firestore `posts` collection, written from the dashboard's Blog screen.
  A published dashboard post with the same slug replaces a bundled article
  on the public site. Bundled articles also appear in the dashboard editor.
  Publishing saves an override; restoring the original removes that override.
  Page editing and preview behavior are documented in PAGE-EDITOR.md.
  A post body is a list of typed blocks, not
  HTML: `src/data/blog.ts` holds the shapes, the markdown-lite inline parser
  (**bold**, *italic*, [link](url)) and the decoder, and
  `src/components/PostBody.tsx` is the only thing that renders them. The
  dashboard preview mounts that same component, so a preview cannot drift from
  the published article. Two rules to keep: nothing is ever rendered with
  dangerouslySetInnerHTML, and nothing that comes back from the database is
  trusted. Since 2026-09-02, on the client's instruction, a paragraph, heading,
  list or quote may carry any colour and any font: the colour is a brand
  swatch name or a six-figure hex code, the font is an id from the list in
  `src/data/fonts.ts` (the site's two faces, the system faces, and 172 Google
  Fonts fetched only on a page that uses them), and the decoder in
  `src/data/blog.ts` drops anything else. This is the one deliberate
  exception to the token rule below, confined to article bodies; nothing
  outside the blog reads those values. Since 2026-09-03 a post also carries
  a `template`, one of five layouts in `POST_TEMPLATES` (absent means
  Classic, so older posts are unchanged), rendered by
  `src/components/ArticleHeader.tsx` for the page and the dashboard preview
  alike; and any block may carry an `animation` (an effect from
  `ANIMATIONS`, a pace, a delay of 0 to 800 ms) that becomes nothing more
  than the site's own reveal classes on the element. The dashboard's motion
  presets only write animations onto blocks; there is no preset at run time.
  The three decoders that must agree on a new post field are `decodeBlocks`
  in `src/data/blog.ts`, `readPosts` in `src/lib/siteContent.ts` and
  `loadPosts` in `src/admin/data.ts`. Only http, https, root-relative and
  mailto links survive the parser. Pages are `/blog` and `/blog/:slug`; the home band and
  the footer both point at `/blog`, and the home band is hidden entirely until
  a post is published. The old "Guides" section and its `/#guides` anchor are
  gone, replaced by this at the client's request on 2026-08-28. A picture can
  be uploaded or given as a web address: Firebase only creates the default
  Cloud Storage bucket on the Blaze plan, so on the free tier uploads fail and
  pasting an address is the route that works. Both fields write the same
  value, so nothing changes when Storage is switched on.
- The qualify form is always visible and interactive for client review, but its
  submit button remains disabled unless `VITE_INTAKE_ENABLED=true` and a valid
  `VITE_QUALIFY_ENDPOINT` is present. The intake server separately requires
  `INTAKE_ENABLED=true`. Every visible field is mandatory, including product
  selection and explicit consent. Selecting a product shows its image and a
  short educational note; it does not change the form questions. There is
  deliberately no path to the success screen without a server: an earlier build
  faked one, which told a visitor "We Received Your Information" while nothing
  had been sent. Never reintroduce that.
- Link preview card: `public/og-image.jpg`, a 1200x630 render of the home page
  hero, wired up by the Open Graph and Twitter tags in `index.html`. Rebuild it
  with `npm run build:og` (serve `dist` on :4173 first) whenever the hero
  changes. Crawlers do not run JavaScript, so they only ever read `index.html`
  and every address on the site shares this one card, which is intended.
- Cache rules in `firebase.json`: only `/assets/**` may be immutable, because
  Vite fingerprints those names. Anything with a stable name (the icons, the
  logo, images in `public/`) must revalidate, or a replacement will not reach
  visitors who have been to the site before. `/brand/**` is deliberately short
  at five minutes: those files change rarely but when they do the change is
  usually being looked at, and a day-long window meant a replaced logo kept
  showing on a phone that had already been to the site. The files are a few
  kilobytes and revalidate as a 304, so the cost is nothing.
- `ProductViewer` component: drag to rotate front/back, wheel and pinch zoom,
  double-tap zoom, keyboard support, reduced-motion support.
- `QuickView` is a centred dialog that settles forward into the middle of
  the screen, on the client's instruction of 2026-09-02. It used to be a
  bottom sheet that slid up from the edge; do not bring that back.
- Our Services, "The process at a glance": the care cycle canvas sits on the
  left and the copy on the right from the two-column width up, on the
  client's instruction of 2026-09-02. The swap is CSS `order` only, so the
  markup keeps the heading first for a screen reader and for a phone.
- The Refer a Patient buttons always say "Download Referral Form &
  Requirements", on the client's instruction of 2026-09-02, even while the
  packet PDF is missing and the button opens an email instead. Supplying the
  PDF (see `REPLACE-WITH-REFERRAL-PACKET-PDF`) makes the label true.
- No em dashes anywhere: not in copy, not in code comments, not in these
  notes. Use a comma, a colon or a full stop.
- Scroll-motion system in `src/lib/useReveal.ts` and the reveal block of
  `src/index.css`. `useReveal` reveals anything carrying `data-reveal`;
  a second class picks the shape (`reveal-left`, `reveal-right`, `reveal-drop`,
  `reveal-zoom`, `reveal-push`, `reveal-blur`, `reveal-tilt`,
  `reveal-swing-left`, `reveal-swing-right`, `reveal-curtain`,
  `reveal-curtain-left`, `reveal-expand`, `reveal-settle`, `reveal-fade`) and
  a third the pace (`reveal-swift`, `reveal-slow`, `reveal-glacial`).
  `useParallax` drifts anything carrying `data-parallax` against the scroll.
  Rules for new work: give consecutive sections different shapes, never put
  `data-reveal` and `data-parallax` on the same element, and keep every
  starting state inside the hook so nothing is stranded invisible under
  reduced motion. An article whose blocks carry their own animation is not
  wrapped in a page-level reveal (`src/pages/BlogPost.tsx`), so no block is
  ever animated twice.
- About page photography. The hero, Our Mission and Our Vision pictures are
  the client's own photographs, delivered 2026-09-02, converted to WebP at
  `public/about/about-hero.webp`, `mission-bg.webp` and `vision-bg.webp`.
  They replaced generated illustrations. The mission and vision cards show
  each photograph whole in a 16:9 band with the text panel pulled up over
  its foot, rather than using it as a full-bleed background: the vision
  photograph is 2.23:1 and a near-square frame cropped the family out of
  it. `scripts/generate-about-placeholders.mjs` still exists but refuses to
  overwrite a file that is already there, so it cannot touch these. The
  three "What You Can Expect From Us" pictures are still illustrations and
  are the remaining About placeholders.
- 11 products in `src/data/products.ts` with plain-English copy.
- Placeholder vector product art in `public/products/`.
- PHI-safe intake function source in `functions/`.
- `firebase.json`, `firestore.rules`, `.firebaserc` (project `medville-diabetes`).

## What remains (in order)

1. `npm install && npm run dev`, then confirm the site runs and review all pages.
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
   - `REPLACE-WITH-REFERRAL-PACKET-PDF` (`src/data/company.ts`): the referral
     form and requirements PDF. Until it is set, the referral buttons ask
     providers to request the packet by email instead of offering a download
     that would not resolve.
   - `REPLACE-WITH-REFERRAL-VIDEO-EMBED` (`src/data/company.ts`): the 30 to
     60 second referral explainer video. Until it is set, the video frame
     shows a placeholder panel.
   - Verified customer testimonials. The home page testimonials band renders
     only when the client publishes a testimonial from the dashboard, so no
     placeholder quote ever reaches a visitor.
   - A provider photograph for the Refer a Patient hero, which currently
     borrows a services photograph.
   - Photographs for the three "What You Can Expect From Us" cards on the
     About page, which are still illustrations.
   - Done 2026-09-02: the About page hero, Our Mission and Our Vision
     photographs are the client's own.
   - Done 2026-08-28: the production domain is www.medvillediabetes.com,
     bought through GoDaddy. It is written into robots.txt, sitemap.xml, and
     the canonical, og:url, og:image and twitter:image tags in index.html,
     which have to be absolute. The apex medvillediabetes.com should redirect
     to the www host so one address is canonical. Adding the custom domain in
     the Firebase console and the DNS records at GoDaddy are console jobs and
     are not done from this repository. The order of operations for that day,
     including the Identity Platform authorized domains and the one-line
     `SITE_ORIGIN` change, is step 7 of ADMIN-SETUP.md.
   - Done 2026-09-02: `.firebaserc` names the live project, `medville-diabetes`.
3. Replace placeholder product art with real supplier photos (front and back
   per product) once the client provides them. Keep the same file paths or
   update `src/data/products.ts`.
4. Follow the current AWS and Firebase deployment procedure in LAUNCH-STATUS.md.
   The old Google patient-intake deployment instructions have been retired.

## Contract facts that shape decisions

- Fee: 1,600 USD total; milestones 30 / 50 / 20.
- Client's recurring costs: domain 8 to 15 USD per year; Google Cloud
  estimated 0 to 5 USD per month. Do not add services that break this.
- Timeline: 7 days from receipt of client materials (logo, content, brand
  colors, already in hand, see `brand/`).
- One round of consolidated revisions at the review stage before launch.

## Design system rules

- Tokens live in `src/index.css` under `@theme`. Never write raw hex or
  arbitrary pixel values in components.
- One container (`src/components/Container.tsx`); never re-declare widths.
- Cyan (`--color-brand-bright`) is the only filled call to action colour, and
  navy the only other button colour. There is no orange token and no green
  token; do not add either back. That rule covers the public site. The
  dashboard has its own palette in `src/admin/admin.css`, derived from all
  three brand colours, where orange is the primary action; nothing in
  `src/index.css` gains an orange token because of it.
- Radius stance: soft consumer (`--radius-*`); do not mix in sharp corners.
- Respect `prefers-reduced-motion` in any new animation.
- Mobile first: build at 375 px, enhance upward; touch targets 44 px minimum.
