import { usePageText } from "./useSiteData";

export function useCompanyDetails() {
  const { text } = usePageText("contact");
  const phone = text("details.phone");
  const email = text("details.email");
  const [line1, ...remaining] = text("details.address").split("\n");
  return {
    PHONE_DISPLAY: phone,
    PHONE_TEL: `tel:${phone.replace(/[^+0-9]/g, "")}`,
    EMAIL: email,
    EMAIL_HREF: `mailto:${encodeURIComponent(email)}`,
    ADDRESS_LINE_1: line1,
    ADDRESS_LINE_2: remaining.join(", "),
    HOURS_SHORT: text("details.hours"),
  };
}
