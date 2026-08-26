import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import type { Product } from "../data/products";
import { PRODUCT_TINT } from "./ProductCard";
import Button from "./Button";

/*
  Quick view: a bottom sheet that shows one product without leaving the grid.

  It is the touch equivalent of the card hover, so the Front and Back toggle
  is the important control here. Escape closes it, the page behind is locked
  while it is open, and focus moves to the close button on open and returns
  to the page afterwards.
*/
export default function QuickView({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const [face, setFace] = useState<"front" | "back">("front");
  const closeRef = useRef<HTMLButtonElement | null>(null);

  /* Every newly opened product starts on its front face. */
  useEffect(() => {
    if (product) setFace("front");
  }, [product]);

  useEffect(() => {
    if (!product) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  const image = face === "back" ? product.imageBack : product.imageFront;

  const toggle = (value: "front" | "back") => {
    const selected = face === value;
    return `min-h-[42px] rounded-full border-[1.5px] px-6 py-2 font-display text-[0.84rem] font-semibold transition-all duration-(--duration-micro) ${
      selected
        ? "border-brand bg-brand text-on-dark"
        : "border-line-filter bg-canvas text-grey-dark hover:border-brand"
    }`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} quick view`}
      className="fixed inset-0 z-[60] flex items-end justify-center"
    >
      <button
        type="button"
        aria-label="Close the quick view"
        onClick={onClose}
        className="fade-in absolute inset-0 cursor-pointer border-none bg-[rgb(0_26_18/0.55)] backdrop-blur-[3px]"
      />

      <div className="sheet-up relative max-h-[88vh] w-[min(100%,880px)] overflow-auto rounded-t-sheet bg-surface-raised shadow-sheet">
        <div
          aria-hidden="true"
          className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-surface-raised to-transparent pt-2.5"
        >
          <span className="h-[5px] w-11 rounded-full bg-line-brand" />
        </div>

        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-grey-light text-ink transition-colors duration-(--duration-micro) hover:bg-line-brand"
        >
          <X size={18} />
        </button>

        <div className="grid gap-7 px-7 pb-8 pt-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          <div>
            <div className={`relative rounded-well p-5 ${PRODUCT_TINT}`}>
              <img
                src={image}
                alt={`${product.name}, ${face}`}
                className="aspect-square w-full rounded-sm object-contain"
              />
              <span className="absolute left-3.5 top-3.5 rounded-full bg-canvas/90 px-3.5 py-1.5 text-[0.78rem] font-semibold text-brand">
                {face === "back" ? "Back" : "Front"}
              </span>
            </div>
            <div className="mt-3.5 flex justify-center gap-2">
              <button type="button" onClick={() => setFace("front")} className={toggle("front")}>
                Front
              </button>
              <button type="button" onClick={() => setFace("back")} className={toggle("back")}>
                Back
              </button>
            </div>
          </div>

          <div>
            <p className="m-0 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-brand">
              {product.brand} · {product.category}
            </p>
            <h3 className="mt-2 font-display text-[1.5rem] font-bold leading-tight text-ink">
              {product.name}
            </h3>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-grey-dark">
              {product.shortDescription}
            </p>
            <ul className="mt-4 flex list-none flex-col gap-2.5 p-0">
              {product.keyFacts.map((fact) => (
                <li key={fact} className="flex items-start gap-2.5 text-small text-grey-dark">
                  <Check size={15} className="mt-0.5 flex-none text-brand-bright" strokeWidth={2.4} />
                  {fact}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button to="/qualify" variant="cta" className="text-[0.875rem]">
                Check if you Qualify
              </Button>
              <Link
                to={`/products/${product.slug}`}
                className="inline-flex min-h-[46px] items-center justify-center rounded-full border-[1.5px] border-brand-mint px-6 py-2.5 font-display text-[0.875rem] font-semibold text-brand transition-colors duration-(--duration-micro) hover:border-brand"
              >
                Full details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
