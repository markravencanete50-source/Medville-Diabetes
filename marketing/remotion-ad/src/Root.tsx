import { Composition } from "remotion";
import { MedvilleAd } from "./MedvilleAd";
import { FPS, DURATION_FRAMES } from "./timeline";

export const Root: React.FC = () => (
  <Composition
    id="MedvilleAd"
    component={MedvilleAd}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ captions: true }}
  />
);
