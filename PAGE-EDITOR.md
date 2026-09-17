# Page editing

Edit pages now presents the actual public page beside section controls. The desktop
preview uses a 1280 pixel viewport, and the phone preview uses 390 pixels. Both
scale to fit the available dashboard space. Click matching text or a photograph
in the preview to select its editor field.

Draft values remain in React state. Save changes writes the selected page document
through the existing authenticated Firestore path. Failed loads disable saving,
late loads cannot replace another page, and switching pages asks before discarding
unsaved changes. Product records, article bodies, FAQs, and reviews retain their
dedicated editors; Edit pages provides guidance and a link to article editing.
Built-in articles now appear in the Blog editor. Publishing an edit overrides the
bundled article. Restoring the original removes the override.

The shared schema and additional field definitions cover the page copy, section
photographs, process cards, eligibility labels and product guidance, referral
packet and video addresses, and search metadata. Contact details feed the header,
footer, contact, and referral pages. Image uploads use the existing signed
Cloudinary upload service. Forms keep their validation and server launch gates.
Saved search metadata also feeds the next deployment's prerendered HTML. Browser
titles update from live content; crawler snapshots are refreshed at deployment.

The preview receives only known content fields from its same-origin parent window.
Draft values never enter the public content cache. Preview form submissions and
referral counting are disabled, and links cannot leave the preview. Hidden pages
can be inspected inside the preview. The public site permits same-origin framing;
the admin dashboard continues to deny framing. Text renders as React text and media
addresses are validated on save and again when resolved on the public site.

Verification includes rendering tests for the three previously uneditable pages,
text escaping, image validation, required form inputs, and section visibility.
Local browser checks cover editing, save/reload using isolated sample documents,
image replacement and discard, click-to-edit, rejected foreign messages, blocked
preview submissions, and phone overflow. The authenticated production dashboard
could not be exercised through the disconnected browser extension.
