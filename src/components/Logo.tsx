/*
  Medville Diabetes logo.

  This renders the client's own artwork (supplied 2026-08-28; the original is
  brand/MD_Logo_Transparent.svg) rather than a wordmark rebuilt in markup. It
  is an SVG, so it is drawn from vectors at whatever size the page asks for and
  can never blur, on a phone or on a 5K display.

  The delivered file has a transparent background and a navy wordmark, which is
  right for the light header and the mobile drawer. The footer gradient ends on
  #00293b, all but the wordmark's own navy, so `onDark` swaps in the reversed
  variant whose only difference is a white wordmark. The cyan leaves and the
  cyan "DIABETES" line are the same in both.
*/
export default function Logo({
  className = "h-11",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <img
      src={onDark ? "/brand/medville-logo-on-dark.svg" : "/brand/medville-logo.svg"}
      alt="Medville Diabetes"
      /* The intrinsic ratio of the cropped lockup. Giving it here reserves the
         right box before the file loads, so the header never jumps. */
      width={400}
      height={180}
      className={`w-auto ${className}`}
    />
  );
}
