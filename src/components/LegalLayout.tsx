import Container from "./Container";
import { Eyebrow, Grain } from "./Decor";
import { useReveal } from "../lib/useReveal";

/*
  Shared frame for the legal pages. The body copy on these pages is the
  client's own legal text and is reproduced verbatim; the plain-English
  copy rules do not apply to it and it must not be reworded here.
*/
export default function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <div ref={revealRef}>
      <section className="bg-wash relative overflow-hidden">
        <Grain opacity={0.05} />
        <Container className="relative py-12 md:py-16">
          <p className="rise-in m-0">
            <Eyebrow>Legal</Eyebrow>
          </p>
          <h1
            className="rise-in mt-3 font-display text-h1 font-bold text-ink"
            style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          >
            {title}
          </h1>
        </Container>
      </section>
      <section className="py-12 md:py-16">
        <Container className="max-w-[820px]">{children}</Container>
      </section>
    </div>
  );
}

export function LegalHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-10 font-display text-h3 font-bold text-ink first:mt-0">
      {children}
    </h2>
  );
}

export function LegalText({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-body leading-relaxed text-grey-dark">{children}</p>;
}
