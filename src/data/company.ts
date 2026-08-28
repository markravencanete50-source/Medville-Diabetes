/*
  The company facts that appear in more than one place.

  Header, footer, contact page, referral page and the qualify error message all
  quote the same phone number and address. Keeping them here means a change
  arrives everywhere at once, and there is no second copy to go stale.

  Source: the client's website copy document, 2026-08-28.

  One note for the client's reviewer. That document gives the email address as
  info@medvillediabetics.com in the footer, and as info@medvillediabetes.com on
  the contact page and the referral page. The site uses the second spelling,
  which matches the company name and two of the three mentions. If the first
  spelling is the correct mailbox, change EMAIL below and nothing else.
*/

export const PHONE_DISPLAY = "800-394-3917";
export const PHONE_TEL = "tel:+18003943917";

export const EMAIL = "info@medvillediabetes.com";
export const EMAIL_HREF = `mailto:${EMAIL}`;

export const ADDRESS_LINE_1 = "28863 Industry Dr";
export const ADDRESS_LINE_2 = "Valencia, CA 91355";

export const HOURS_SHORT = "Monday to Friday 8AM to 5PM";
export const HOURS_LONG = "Monday to Friday 8AM to 5PM Pacific Standard Time";

/*
  Shown near the bottom of the product pages. The client's document calls for
  it on every page that describes a product.
*/
export const PRODUCT_DISCLAIMER =
  "Product availability, prescription requirements, insurance coverage, device compatibility, indications, and features vary by product and individual circumstances. Always follow current manufacturer instructions and consult your healthcare provider regarding medical decisions.";

/*
  Referral packet for the Refer a Patient page.

  Set this to the path of the client's referral PDF once it is supplied, for
  example "/referral/medville-diabetes-referral-form.pdf", and drop the file
  into `public/referral/`. While the value is empty the page asks providers to
  request the packet by email instead of offering a download that would not
  resolve. Searchable placeholder: REPLACE-WITH-REFERRAL-PACKET-PDF.
*/
export const REFERRAL_PACKET_URL = "";

/*
  Referral explainer video, 30 to 60 seconds, per the client's copy document.
  Set this to an embed URL once the video exists. While it is empty the page
  shows a placeholder panel in its place rather than an empty frame.
  Searchable placeholder: REPLACE-WITH-REFERRAL-VIDEO-EMBED.
*/
export const REFERRAL_VIDEO_URL = "";
