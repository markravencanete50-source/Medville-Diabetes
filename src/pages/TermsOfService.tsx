import LegalLayout, { LegalHeading, LegalText } from "../components/LegalLayout";
import { usePageMeta } from "../lib/usePageMeta";

/*
  The client's terms of service, reproduced verbatim from the document
  delivered on 2026-08-26 (termofuseMedville.docx). The client confirmed on
  2026-08-27 that the document should be published as sent, including the
  "Rights & Restrictions" clauses about an online course. Changes to this
  text must come from the client.
*/
export default function TermsOfService() {
  usePageMeta(
    "Terms of Service | Medville Diabetes",
    "The Medville Diabetes terms of service.",
  );

  return (
    <LegalLayout title="Terms of Service">
      <LegalHeading>Legal Disclaimer</LegalHeading>
      <LegalText>
        Seller hereby expressly disclaims all warranties either expressed or implied
        warranty of merchantability or fitness for a particular purpose. This
        disclaimer by the seller in no way affects the terms of the
        manufacturer&rsquo;s warranty if any. Title to goods herein being purchased
        is retained by the seller until goods are paid for in full by the purchaser
        and at that time title passes to purchaser. If goods herein being purchased
        are being purchased for purposes of export, purchaser must obtain from the
        Federal Government certain export documentation before shipping to a foreign
        country. In addition, manufacturers&rsquo; warranties for exported goods may
        vary or even be null and void. If you have questions, please inquire. Any and
        all liability is only for the products purchased.
      </LegalText>

      <LegalHeading>Basic Terms</LegalHeading>
      <LegalText>
        For all prices and products, we reserve the right to make adjustments due to
        errors, changing market conditions, product discontinuation or typographical
        errors in advertisements. Medville is not responsible for manufacturer price
        changes, which may occur at any time without notice. The product images on
        this web site may not exactly reflect the product you receive. Design
        revisions and color variations may exist. Please keep all packing material
        and documentation in the event that your equipment has to be serviced or
        returned. Before returning any product, you must obtain a Return Merchandise
        Authorization (RMA) number. NO returns, of any type, will be accepted without
        an RMA number. Please have the following information on hand when calling for
        an RMA number: customer name, invoice number, serial number and the nature of
        the problem.
      </LegalText>

      <LegalHeading>Rights &amp; Restrictions</LegalHeading>
      <ul className="mb-4 list-disc pl-6 text-body leading-relaxed text-grey-dark">
        <li className="mb-3">Members must be at least 18 years of age.</li>
        <li className="mb-3">
          Members are granted a time-limited, non-exclusive, revocable,
          nontransferable, and non-sublicensable right to access that portion of the
          online course corresponding to the purchase.
        </li>
        <li className="mb-3">
          The portion of the online course corresponding to the purchase will be
          available to the Member as long as the course is maintained by the Company,
          which will be a minimum of one year after Member&rsquo;s purchase.
        </li>
        <li className="mb-3">
          The videos in the course are provided as a video stream and are not
          downloadable.
        </li>
        <li>
          By agreeing to grant such access, the Company does not obligate itself to
          maintain the course, or to maintain it in its present form.
        </li>
      </ul>
    </LegalLayout>
  );
}
