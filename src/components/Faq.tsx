import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/*
  Accordion with one panel open at a time.

  The design prototype used a fixed 220px max-height for the open panel. That
  clips any answer longer than about four lines on a narrow phone, so the open
  height is measured from the panel content instead. The transition still runs
  over 320ms because max-height has a real number on both ends.
*/

export interface FaqItem {
  question: string;
  answer: string;
}

export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <div className="mt-9 flex flex-col gap-3">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div
            key={item.question}
            className={`rounded-lg border transition-colors duration-(--duration-base) ${
              isOpen ? "border-brand-mint bg-brand-tint" : "border-line-brand bg-surface-raised"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : index)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent px-6 py-5 text-left font-display text-body font-semibold text-ink"
            >
              {item.question}
              <ChevronDown
                size={18}
                strokeWidth={2.2}
                className="flex-none text-brand transition-transform duration-(--duration-slow) ease-(--ease-out-quart)"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            <div
              ref={(el) => {
                panels.current[index] = el;
              }}
              className="overflow-hidden transition-[max-height] duration-(--duration-slow) ease-(--ease-out-quart)"
              style={{
                maxHeight: isOpen ? `${panels.current[index]?.scrollHeight ?? 400}px` : "0px",
              }}
            >
              <p className="m-0 px-6 pb-5 text-[0.9rem] leading-relaxed text-grey-dark">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
