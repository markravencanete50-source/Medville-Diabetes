import LegalLayout, { LegalHeading, LegalText } from "../components/LegalLayout";
import { usePageMeta } from "../lib/usePageMeta";

/*
  The client's privacy policy, reproduced verbatim from the document
  delivered on 2026-08-26 (Privacypolicymedville.docx). Only paragraph
  breaks and headings from the source document are reconstructed; the
  wording is not edited. Changes to this text must come from the client.
*/
export default function PrivacyPolicy() {
  usePageMeta(
    "Privacy Policy | Medville Diabetes",
    "The Medville Diabetes privacy policy: how we collect, use, and protect your information.",
  );

  return (
    <LegalLayout title="Privacy Policy">
      <LegalText>
        Medville recognizes and respects the importance of customers&rsquo; privacy and
        security. To guarantee our customers a safe and confidential shopping
        experience, Medville uses CXS Plugin By Server to safeguard their personal
        information. More specifically, McAfee Secure actively employs Secure Sockets
        Layer, SSL, technology on the credit card and personal information pages of
        our website. SSL technology functions by managing server and client
        authentication, and encrypting both server and client communication. This
        means that McAfee Secure encrypts your credit card information and keeps it
        safe by routing payment only to Medville. Your credit card information is
        never stored or visible to Medville when you purchase online. Due to this
        safety feature, each time you place an order online, you will need to provide
        your credit card information.
      </LegalText>
      <LegalText>
        Some browsers and firewalls do not permit communication through secure
        servers. If you access Medville through an insecure connection you will not
        be able to place an order online. If you cannot access our shopping cart,
        please print out our order form and place your order by phone at
        1-800-394-3917.
      </LegalText>

      <LegalHeading>How we use the information we collect</LegalHeading>
      <LegalText>
        <strong>Services:</strong> When you make a purchase from Medville, we use the
        information you provide to us (name, address, phone, etc.) to process your
        order. We do not share or sell this information to third parties. All
        information is considered private and confidential, and is only used to help
        us better serve you and improve your shopping experience while online with
        Medville. All credit card numbers are routed through McAfee Secure and are
        never visible to Medville for online purchases.
      </LegalText>
      <LegalText>
        <strong>Website:</strong> We may use information we collect to improve
        themedsupply.com and our services.
      </LegalText>
      <LegalText>
        <strong>Promotional:</strong> We may use your personal information to contact
        you with newsletters, sms, online promotions that may be of interest to you.
        You may opt-out of any communication we send you.
      </LegalText>
      <LegalText>
        <strong>Analytics:</strong> We collect general browsing data and device
        information to optimize our services and improve our offerings.
      </LegalText>
      <LegalText>
        <strong>Communication:</strong> If you reach out to use via email, sms,
        phone, or mail we will retain that communication information to respond to
        your inquiry.
      </LegalText>

      <LegalHeading>Use of cookies</LegalHeading>
      <LegalText>
        Medville uses a browser feature known as a cookie. A cookie is a simple file
        that stores your personalized information on your hard drive so you
        don&rsquo;t have to re-enter it a second time when revisiting our website.
        Cookies help to improve and personalize your shopping experience by
        increasing our web pages responsiveness and decreasing time between
        downloading as you browse or surf through our website.
      </LegalText>

      <LegalHeading>California privacy rights under the CCPA</LegalHeading>
      <LegalText>
        The following information is regarding the personal data we collect on
        consumers from the state of California and their rights supplied to them due
        to the California Consumer Act.
      </LegalText>
      <LegalText>
        We understand that the CCPA or the California Consumer Act allows consumers
        to opt-out of any data collection strategies, to ask for details regarding
        specific pieces of personal information, and request to have certain personal
        information deleted. We do not discriminate against consumers for using these
        afforded rights.
      </LegalText>
      <LegalText>We have collected the following types of data:</LegalText>
      <ul className="mb-4 list-disc pl-6 text-body leading-relaxed text-grey-dark">
        <li className="mb-2">
          Identifiers (such as name, email address, postal address, phone number, IP
          Address)
        </li>
        <li>
          Commercial information (transactional information, purchase history,
          payment info)
        </li>
      </ul>
      <LegalText>
        We use and disclose the categories of personal information we collect from
        and about you consistent with the business purposes discussed in the section
        &ldquo;How We Use the Information We Collect&rdquo;.
      </LegalText>
      <LegalText>
        The CCPA also sets forth obligations for businesses that &ldquo;sell&rdquo;
        personal information to third parties. We do not &ldquo;sell&rdquo; personal
        information and have not sold any personal information in the past 12 months.
      </LegalText>
      <LegalText>
        If you are a California resident, you may have the following consumer rights
        under the CCPA:
      </LegalText>
      <ul className="mb-4 list-disc pl-6 text-body leading-relaxed text-grey-dark">
        <li className="mb-3">
          <strong>Right to know about personal information collected, used,
          disclosed, or sold.</strong> You have the right to request that we disclose
          to you the categories of personal information we collect or disclose (or
          have collected or disclosed in the past 12 months) about you, the
          categories of sources of such information, the business or commercial
          purpose for collecting your personal information, and the categories of
          third parties with whom we share/disclose personal information. This
          information is also explained throughout this Privacy Policy.
        </li>
        <li className="mb-3">
          <strong>Right to request deletion of personal information.</strong> You
          have the right to request the deletion of your personal information we have
          collected from you, subject to certain conditions and limitations under the
          law.
        </li>
        <li className="mb-3">
          <strong>Right to Opt-Out of the sale of personal information.</strong> The
          CCPA provides consumers with the right to opt-out of the sale of their
          personal information. We do not share, sell, rent, or trade User Personal
          Information with third parties for their commercial purposes as defined
          under the CCPA.
        </li>
        <li>
          <strong>Right to non-discrimination for exercising a consumer privacy
          right.</strong> We will not discriminate against you for exercising any of
          your rights under the CCPA.
        </li>
      </ul>
      <LegalText>
        To exercise any of your rights as set out above on or after January 1, 2020,
        and are a California resident, please contact us by submitting a request at
        DSAR Form or by contacting us at 800-394-3917. You will be required to verify
        your identity before we are able to fulfill your request.
      </LegalText>

      <LegalHeading>About credit card transactions</LegalHeading>
      <LegalText>
        <strong>Can I safely transmit information such as credit card
        numbers?</strong>
      </LegalText>
      <LegalText>
        You can enter your credit card number on a secure (https) form and transmit
        the form over the Internet to a secure server without risk of an intermediary
        obtaining your credit card information. The security features offered by your
        web browser technology protects commercial transactions, as well as all other
        communications, from misappropriation and fraud that could otherwise occur as
        information passes through the internet.
      </LegalText>
      <LegalText>
        Furthermore, with SSL implemented on both the client and server, your
        internet communications are transmitted in an encrypted form. Information you
        send can be trusted to arrive privately and unaltered to the server you
        specify (and no other).
      </LegalText>
      <LegalText>
        SSL uses authentication and encryption technology. For example, your browsers
        export implementation of SSL (U.S. government approved) uses a high-grade,
        128-bit key size. The encryption established between you and a server remains
        valid over multiple connections, yet the effort expended to defeat the
        encryption of one message cannot be leveraged to defeat the next message.
      </LegalText>
      <LegalText>
        Your browser and secure servers deliver server authentication using signed
        digital certificates issued by trusted third parties known as certificate
        authorities, via McAfee Secure. A digital certificate verifies the connection
        between a server&rsquo;s public key and the server&rsquo;s identification
        (just as a driver&rsquo;s license verifies the connection between your
        photograph and your personal identification.) Cryptographic checks, using
        digital signatures, ensure that information within a certificate can be
        trusted.
      </LegalText>
    </LegalLayout>
  );
}
