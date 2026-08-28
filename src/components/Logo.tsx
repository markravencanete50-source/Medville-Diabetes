/*
  Medville Diabetes logo.

  The client's own artwork, supplied 2026-08-28 with a transparent background.
  The original is brand/MD_Logo_Transparent.svg. It is an SVG, so it is drawn
  from vectors at whatever size the page asks for and can never blur.

  The delivered file has a navy wordmark, which is right for the light header
  and the mobile drawer. The footer gradient ends on #00293b, all but that same
  navy, so `onDark` swaps in a variant whose only difference is a white
  wordmark. The cyan leaves and the cyan "DIABETES" line are identical in both.

  The only other change to either file is a cropped viewBox: the delivered
  canvas is 400 by 350 and the artwork occupies the middle 180 units, so
  without the crop most of the logo's height on screen would be empty space.
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
