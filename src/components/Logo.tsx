/*
  Medville Diabetes wordmark, rebuilt from brand/Medville_Brand.svg.
  Poppins wordmark with the brand leaf accent above the letter "i".

  The leaf keeps the brand cyan in both themes. The rules and the "Diabetes"
  line moved to the green system in the 2026-08-26 redesign.
*/
export default function Logo({ dark = false }: { dark?: boolean }) {
  const wordColour = dark ? "text-on-dark" : "text-ink";

  return (
    <span className="inline-flex flex-col leading-none" aria-label="Medville Diabetes">
      <span className="relative font-display text-[1.45rem] font-bold tracking-[-0.025em]">
        <span className={wordColour}>Medv</span>
        <span className="relative">
          <span className={wordColour}>i</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 20"
            className="absolute -top-2.5 left-0.5 h-3 w-4 text-accent"
            fill="currentColor"
          >
            <ellipse cx="6" cy="14" rx="4.5" ry="3.4" transform="rotate(-35 6 14)" />
            <ellipse cx="14" cy="8" rx="4" ry="3" transform="rotate(-35 14 8)" opacity="0.85" />
            <ellipse cx="20.5" cy="3" rx="3" ry="2.3" transform="rotate(-35 20.5 3)" opacity="0.7" />
          </svg>
        </span>
        <span className={wordColour}>lle</span>
      </span>
      <span className="mt-0.5 flex items-center gap-1.5">
        <span className="h-px w-4 bg-green-bright" aria-hidden="true" />
        <span
          className={`text-[0.62rem] font-semibold uppercase tracking-[0.32em] ${
            dark ? "text-on-dark-accent" : "text-green"
          }`}
        >
          Diabetes
        </span>
        <span className="h-px w-4 bg-green-bright" aria-hidden="true" />
      </span>
    </span>
  );
}
