/*
  Medville Diabetes logo.

  The client's own artwork, supplied 2026-08-28 with a transparent background.
  The original is brand/MD_Logo_Transparent.svg. It is an SVG, so it is drawn
  from vectors at whatever size the page asks for and can never blur.

  One file is used everywhere, on the client's instruction. The only change
  made to it is a cropped viewBox: the delivered canvas is 400 by 350 and the
  artwork occupies the middle 180 units, so without the crop most of the
  logo's height on screen would be empty space. No path is touched and nothing
  is recoloured.
*/
export default function Logo({ className = "h-11" }: { className?: string }) {
  return (
    <img
      src="/brand/medville-logo.svg"
      alt="Medville Diabetes"
      /* The intrinsic ratio of the cropped lockup. Giving it here reserves the
         right box before the file loads, so the header never jumps. */
      width={400}
      height={180}
      className={`w-auto ${className}`}
    />
  );
}
