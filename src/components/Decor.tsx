import type { CSSProperties } from "react";

/*
  Decorative layers shared by the gradient sections. Every one of these is
  aria-hidden and pointer-events none: they are texture, never content.

  The redesign rule is that no section background is a flat colour. A section
  takes a gradient class from index.css, then adds Grain and usually one or
  two Blobs on top.
*/

export function Grain({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grain pointer-events-none absolute inset-0"
      style={{ opacity }}
    />
  );
}

type BlobTone = "brand" | "cyan";

const TONES: Record<BlobTone, string> = {
  brand: "rgba(24,186,218,",
  cyan: "rgba(11,124,157,",
};

export function Blob({
  tone = "brand",
  strength = 0.22,
  blur = 40,
  size = 460,
  duration,
  reverse = false,
  className = "",
  style,
}: {
  tone?: BlobTone;
  strength?: number;
  blur?: number;
  size?: number;
  duration?: string;
  reverse?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const colour = `${TONES[tone]}${strength})`;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full ${duration ? "blob-drift" : ""} ${className}`}
      style={{
        height: size,
        width: size,
        background: `radial-gradient(circle, ${colour} 0%, ${TONES[tone]}0) 70%)`,
        filter: `blur(${blur}px)`,
        ...(duration
          ? ({
              "--blob-duration": duration,
              "--blob-direction": reverse ? "reverse" : "normal",
            } as CSSProperties)
          : {}),
        ...style,
      }}
    />
  );
}

/* The small uppercase label that sits above every section heading. */
export function Eyebrow({
  children,
  onDark = false,
}: {
  children: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <p
      className={`m-0 text-caption font-semibold uppercase tracking-[0.22em] ${
        onDark ? "text-on-dark-accent" : "text-brand"
      }`}
    >
      {children}
    </p>
  );
}
