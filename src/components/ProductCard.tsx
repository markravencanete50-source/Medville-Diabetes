import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye } from "lucide-react";
import type { Product } from "../data/products";

/*
  Product card for the redesign.

  Hovering crossfades the front photograph into the back photograph over
  420ms, and the corner label follows. On touch, where there is no hover, the
  Quick view button is the way to see the back, so nothing is lost.
*/

export function brandTint(brand: Product["brand"]) {
  if (brand === "Dexcom") return "tint-dexcom";
  if (brand === "Tandem") return "tint-tandem";
  return "tint-libre";
}

export function brandPillColour(brand: Product["brand"]) {
  if (brand === "Dexcom") return "text-brand";
  if (brand === "Tandem") return "text-ink";
  return "text-accent-deep";
}

export default function ProductCard({
  product,
  delay = 0,
  onQuickView,
}: {
  product: Product;
  delay?: number;
  onQuickView: (slug: string) => void;
}) {
  const [showBack, setShowBack] = useState(false);

  return (
    <div
      data-reveal={delay}
      onMouseEnter={() => setShowBack(true)}
      onMouseLeave={() => setShowBack(false)}
      className="flex flex-col overflow-hidden rounded-card bg-surface-raised shadow-raised transition-all duration-(--duration-slow) ease-(--ease-out-quart) hover:-translate-y-1.5 hover:shadow-raised-hover"
    >
      <div className={`relative p-7 ${brandTint(product.brand)}`}>
        <div className="relative aspect-square w-full">
          <img
            src={product.imageFront}
            alt={`${product.name}, front`}
            loading="lazy"
            className="absolute inset-0 h-full w-full rounded-md object-contain transition-opacity duration-[420ms] ease-(--ease-out-quart)"
            style={{ opacity: showBack ? 0 : 1 }}
          />
          <img
            src={product.imageBack}
            alt={`${product.name}, back`}
            loading="lazy"
            className="absolute inset-0 h-full w-full rounded-md object-contain transition-opacity duration-[420ms] ease-(--ease-out-quart)"
            style={{ opacity: showBack ? 1 : 0 }}
          />
        </div>
        <span
          className={`absolute left-4 top-4 rounded-full bg-canvas/90 px-3.5 py-1.5 text-caption font-semibold shadow-[0_1px_2px_rgb(0_41_59/0.08)] ${brandPillColour(product.brand)}`}
        >
          {product.brand}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-ink/60 px-3.5 py-1.5 text-[0.72rem] font-semibold text-on-dark backdrop-blur-[4px]">
          {showBack ? "Back" : "Front"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-6 pb-6 pt-5">
        <h3 className="m-0 font-display text-[1.08rem] font-semibold leading-snug text-ink">
          {product.name}
        </h3>
        <p className="m-0 text-small leading-relaxed text-grey-dark">
          {product.shortDescription}
        </p>
        <div className="mt-auto flex items-center gap-2.5 pt-3">
          <button
            type="button"
            onClick={() => onQuickView(product.slug)}
            className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-brand-soft px-5 py-2.5 font-display text-[0.84rem] font-semibold text-brand transition-colors duration-(--duration-micro) hover:bg-brand-mint"
          >
            <Eye size={15} />
            Quick view
          </button>
          <Link
            to={`/products/${product.slug}`}
            className="group inline-flex items-center gap-1.5 text-small font-semibold text-brand"
          >
            Learn more
            <ArrowRight
              size={15}
              className="transition-transform duration-(--duration-micro) group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
