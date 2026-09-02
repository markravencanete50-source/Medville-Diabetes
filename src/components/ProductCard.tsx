import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye } from "lucide-react";
import type { Product } from "../data/products";

/*
  Product card for the redesign.

  With a mouse, hovering crossfades the front photograph into the back
  photograph over 420ms, and the corner label follows. On touch there is no
  hover, so a tap on the photograph turns it over instead, and a second tap
  turns it back. The Quick view button remains the fuller way to inspect
  either face, and the keyboard way.

  The hover listens to pointer events rather than mouse events on purpose. A
  tap on a touch screen also fires the browser's compatibility mouseenter,
  which used to flip the card to its back and leave it there: that emulated
  hover only moves on to the next thing tapped, so tapping the same card
  again did nothing. Pointer events say which kind of pointer they came
  from, so the hover path can be kept for the mouse alone.
*/

/*
  Every product sits on the same tinted stage and its brand pill takes the
  same colour. Tinting per brand left the grid looking mismatched, so the
  cards now follow one treatment whatever the brand.
*/
export const PRODUCT_TINT = "tint-product";
export const PRODUCT_PILL = "text-brand";

export default function ProductCard({
  product,
  delay = 0,
  motion = "",
  priority = false,
  eager = false,
  onQuickView,
}: {
  product: Product;
  delay?: number;
  /* True for the one card whose front photograph is the page's largest
     paint. High priority on more than one picture is no priority at all. */
  priority?: boolean;
  /* True for the cards in the first row. A picture above the fold marked
     lazy is not fetched until layout has run, which delays the paint it is
     part of. The back photograph stays lazy either way: it is only ever
     seen on hover. */
  eager?: boolean;
  /* Which scroll-reveal shape this card arrives with. A grid picks one so
     the cards do not repeat the arrival of the section above them. */
  motion?: string;
  onQuickView: (slug: string) => void;
}) {
  const [showBack, setShowBack] = useState(false);
  /* The kind of pointer behind the click that is about to arrive. A mouse
     click leaves the card alone, because its hover already shows the back;
     a tap toggles. Read from pointerdown, since not every browser hands a
     pointer type to the click event itself. */
  const pointerType = useRef("mouse");

  const hoverOnly = (show: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setShowBack(show);
  };

  return (
    <div
      data-reveal={delay}
      onPointerEnter={hoverOnly(true)}
      onPointerLeave={hoverOnly(false)}
      className={`${motion} flex flex-col overflow-hidden rounded-card bg-surface-raised shadow-raised transition-all duration-(--duration-slow) ease-(--ease-out-quart) hover:-translate-y-1.5 hover:shadow-raised-hover`}
    >
      <div
        className={`relative p-7 ${PRODUCT_TINT}`}
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
        }}
        onClick={() => {
          if (pointerType.current !== "mouse") setShowBack((show) => !show);
        }}
      >
        <div className="relative aspect-square w-full">
          <img
            src={product.imageFront}
            alt={`${product.name}, front`}
            loading={priority || eager ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            draggable={false}
            className="absolute inset-0 h-full w-full rounded-md object-contain transition-opacity duration-[420ms] ease-(--ease-out-quart)"
            style={{ opacity: showBack ? 0 : 1 }}
          />
          <img
            src={product.imageBack}
            alt={`${product.name}, back`}
            loading="lazy"
            draggable={false}
            className="absolute inset-0 h-full w-full rounded-md object-contain transition-opacity duration-[420ms] ease-(--ease-out-quart)"
            style={{ opacity: showBack ? 1 : 0 }}
          />
        </div>
        <span
          className={`absolute left-4 top-4 rounded-full bg-canvas/90 px-3.5 py-1.5 text-caption font-semibold shadow-[0_1px_2px_rgb(0_41_59/0.08)] ${PRODUCT_PILL}`}
        >
          {product.brand}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-ink/60 px-3.5 py-1.5 text-caption font-semibold text-on-dark backdrop-blur-[4px]">
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
            className="group inline-flex items-center gap-1.5 py-1 text-small font-semibold text-brand"
          >
            {/* The product name is read out but not shown, so the card stays
                clean while "Learn more" stops being the whole link text. */}
            Learn more<span className="sr-only"> about {product.name}</span>
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
