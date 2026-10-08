import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import "./theme";
import { C } from "./theme";
import { LINES, L, wordTime, WIPE } from "./timeline";
import { Hook, EXPAND } from "./scenes/Hook";
import { Brand } from "./scenes/Brand";
import { Choose, PULLBACK, CLICK_PRODUCT, CLICK_CTA, MORPH } from "./scenes/Choose";
import { Form, SUBMIT, SENT, WHIP } from "./scenes/Form";
import { Review, STAMP, DROP, CONNECT, REPLY } from "./scenes/Review";
import { Deliver, CLOSE, MAP, DOORS } from "./scenes/Deliver";
import { Support, FLIP } from "./scenes/Support";
import { Services, SERVICE_AT } from "./scenes/Services";
import { Providers } from "./scenes/Providers";
import { Cta, CLICK } from "./scenes/Cta";
import { Captions } from "./components/Captions";
import { StepTracker } from "./components/StepTracker";
import { Sfx } from "./components/Sfx";

/*
  The whole advertisement. Scenes are drawn in story order, each deciding
  for itself when it is on screen, so a scene can overlap the next one for
  its transition. The voice leads; music sits under it and lifts in the gaps.
*/
export const MedvilleAd: React.FC<{ captions: boolean }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Music ducks under the voice and lifts in the pauses and at the end.
  const musicVolume = (f: number) => {
    const s = f / fps;
    const speaking = LINES.some((l) => s > l.start - 0.15 && s < l.end + 0.1);
    const near = LINES.reduce((m, l) => Math.min(m, Math.max(0, l.start - 0.15 - s, s - l.end - 0.1)), 9);
    const duck = speaking ? 0.07 : interpolate(near, [0, 0.35], [0.1, 0.3], { extrapolateRight: "clamp" });
    return duck;
  };

  return (
    <AbsoluteFill style={{ background: C.abyss }}>
      <Hook t={t} />
      <Brand t={t} />
      <Choose t={t} />
      <Form t={t} />
      <Review t={t} />
      <Deliver t={t} />
      <Support t={t} />
      <Services t={t} />
      <Providers t={t} />
      <Cta t={t} />
      <StepTracker t={t} />
      {captions && <Captions />}

      <Audio src={staticFile("voiceover.wav")} volume={1} />
      <Audio src={staticFile("music.wav")} volume={musicVolume} />

      {/* Sound effects, placed on the actions they belong to. */}
      <Sfx at={0.35} name="pop" volume={0.25} />
      <Sfx at={EXPAND[0] - 0.1} name="whoosh-up" volume={0.35} />
      <Sfx at={EXPAND[1] - 0.05} name="impact" volume={0.45} />
      <Sfx at={wordTime("brand", "United")} name="pop" volume={0.22} />
      <Sfx at={wordTime("brand", "CGMs") - 0.15} name="pop" volume={0.22} />
      <Sfx at={wordTime("brand", "sensors") - 0.15} name="pop" volume={0.22} />
      <Sfx at={wordTime("brand", "insulin") - 0.15} name="pop" volume={0.22} />
      <Sfx at={PULLBACK[0]} name="whoosh-short" volume={0.3} />
      <Sfx at={12.75} name="whoosh-short" volume={0.2} />
      <Sfx at={CLICK_PRODUCT} name="click" volume={0.5} />
      <Sfx at={CLICK_CTA} name="click" volume={0.5} />
      <Sfx at={MORPH[0]} name="whoosh-up" volume={0.3} />
      <Sfx at={18.85} name="typing" volume={0.3} />
      <Sfx at={19.72} name="typing" volume={0.25} />
      <Sfx at={20.24} name="tap" volume={0.35} />
      <Sfx at={20.5} name="tap" volume={0.35} />
      <Sfx at={20.82} name="tap" volume={0.35} />
      <Sfx at={21.08} name="tap" volume={0.35} />
      <Sfx at={SUBMIT} name="tap" volume={0.4} />
      <Sfx at={SENT} name="chime" volume={0.3} />
      <Sfx at={WHIP[0]} name="whoosh-up" volume={0.4} />
      {(["reviews", "checks", "works"] as const).map((w) => <Sfx key={w} at={wordTime("review", w) + 0.15} name="pop" volume={0.25} />)}
      <Sfx at={CONNECT} name="chime" volume={0.35} />
      <Sfx at={REPLY} name="pop" volume={0.3} />
      <Sfx at={STAMP} name="stamp" volume={0.55} />
      <Sfx at={DROP[0]} name="whoosh-short" volume={0.25} />
      <Sfx at={DROP[1] - 0.05} name="box" volume={0.4} />
      <Sfx at={CLOSE[1] - 0.05} name="box" volume={0.5} />
      <Sfx at={MAP[0]} name="engine" volume={0.3} />
      <Sfx at={DOORS[0]} name="whoosh-short" volume={0.25} />
      <Sfx at={DOORS[1]} name="doorbell" volume={0.4} />
      <Sfx at={DOORS[3] - 0.05} name="chime" volume={0.25} />
      <Sfx at={FLIP[0]} name="whoosh-down" volume={0.35} />
      <Sfx at={wordTime("support", "ongoing")} name="pop" volume={0.22} />
      <Sfx at={wordTime("support", "real") - 0.1} name="pop" volume={0.22} />
      <Sfx at={wordTime("support", "real") + 0.65} name="pop" volume={0.22} />
      <Sfx at={WIPE.supportOut[0]} name="whoosh-short" volume={0.3} />
      {SERVICE_AT.map((at) => <Sfx key={at} at={at} name="pop" volume={0.25} />)}
      <Sfx at={WIPE.servicesOut[0]} name="whoosh-short" volume={0.3} />
      {(["refer", "patient", "takes"] as const).map((w) => <Sfx key={w} at={wordTime("providers", w) + 0.1} name="pop" volume={0.25} />)}
      <Sfx at={wordTime("providers", "takes") + 0.25} name="chime" volume={0.3} />
      <Sfx at={WIPE.providersOut[0]} name="whoosh-up" volume={0.4} />
      <Sfx at={CLICK} name="click" volume={0.55} />
      <Sfx at={CLICK + 0.02} name="chime" volume={0.25} />
    </AbsoluteFill>
  );
};
