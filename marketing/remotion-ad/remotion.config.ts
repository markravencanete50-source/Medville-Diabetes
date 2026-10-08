import { Config } from "@remotion/cli/config";

// JPEG frames are smaller and faster; quality 95 is visually lossless here.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setConcurrency(4);
// A browser that is already on the machine can be used instead of the one
// Remotion downloads: set REMOTION_BROWSER to its path.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
