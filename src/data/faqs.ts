/*
  The questions on the home page, as shipped.

  Two readers, which is why they live here rather than inside the page:
  Home.tsx renders them when the client has published none of their own, and
  scripts/prerender.mjs turns them into FAQPage structured data so Google can
  show them as expandable answers in a results page. A copy in each place
  would drift, and the wrong answer in a search result is worse than none.

  Wording is the client's, from their website copy document.
*/

export interface FaqItem {
  question: string;
  answer: string;
}

export const FALLBACK_FAQS: FaqItem[] = [
  {
    question: "Does insurance cover continuous glucose monitors?",
    answer:
      "Many insurance plans offer CGM coverage for eligible members, but coverage requirements and out-of-pocket costs vary by plan and individual circumstances. We can review your information to help you understand your potential eligibility.",
  },
  {
    question: "How do I check if I may qualify?",
    answer:
      "Start by completing our short eligibility form. We will review the information you provide and contact you to explain potential next steps.",
  },
  {
    question: "Does submitting the form mean I am approved?",
    answer:
      "No. Submitting the form does not guarantee eligibility, insurance coverage, payment, or receipt of a CGM. Final coverage depends on your insurance plan, applicable requirements, documentation, and other factors.",
  },
  {
    question: "What happens after I submit my information?",
    answer:
      "Our team reviews your information and may contact you to discuss potential eligibility, answer questions, request additional information if needed, and explain what comes next.",
  },
];
