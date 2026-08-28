/*
  Medville Diabetes logo.

  This renders the client's own artwork (supplied 2026-08-28, original kept at
  brand/Medville_Logo.svg) rather than a wordmark rebuilt in markup. It is an
  SVG, so it is drawn from vectors at whatever size the page asks for and can
  never blur, on a phone or on a 5K display.

  The delivered lockup is white type on a solid brand-cyan field. That field is
  part of the logo, so it is kept: the logo reads as its own tile on the light
  header and on the dark footer alike, and nothing is recoloured. The only
  change made to the file is a cropped viewBox, because the delivered canvas
  is 400 by 350 with the artwork occupying the middle 182 units; without the
  crop, well over half of the logo's height on screen would be empty cyan.

  If the client has a version of the logo with a transparent background, drop
  it in at public/brand/ and point this component at it.
*/
export default function Logo({ className = "h-11" }: { className?: string }) {
  return (
    <img
      src="/brand/medville-logo.svg"
      alt="Medville Diabetes"
      /* The intrinsic ratio of the cropped lockup. Giving it here reserves the
         right box before the file loads, so the header never jumps. */
      width={400}
      height={182}
      className={`w-auto rounded-[10px] ${className}`}
    />
  );
}
