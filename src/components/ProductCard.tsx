import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Product } from "../data/products";

/* Shopify-style product card: clean surface, product first, quiet chrome. */
export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface-raised transition-shadow duration-(--duration-micro) hover:shadow-raised"
    >
      <div className="relative bg-surface p-6">
        <img
          src={product.imageFront}
          alt={product.name}
          loading="lazy"
          className="aspect-square w-full object-contain transition-transform duration-(--duration-base) ease-(--ease-out-quart) group-hover:scale-[1.045]"
        />
        <span className="absolute left-4 top-4 rounded-full bg-surface-raised px-3 py-1 text-caption font-medium text-accent-deep shadow-raised">
          {product.brand}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-body font-semibold leading-snug text-ink">
          {product.name}
        </h3>
        <p className="text-small leading-relaxed text-ink-muted">
          {product.shortDescription}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-small font-semibold text-accent-deep">
          Learn more
          <ArrowRight size={15} className="transition-transform duration-(--duration-micro) group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
