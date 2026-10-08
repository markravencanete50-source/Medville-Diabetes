import React from "react";
import { AbsoluteFill } from "remotion";
import { ease, ep, lerp } from "../anim";
import { Hero } from "../components/Website";
import { EXPAND } from "./Hook";
import { PULLBACK } from "./Choose";

/*
  Scene 2, "Medville Diabetes is a United States supplier of CGMs, sensors,
  and insulin pumps." The website hero, full screen. Scene 3 picks up this
  exact frame inside a browser and pulls back from it.
*/
export const Brand: React.FC<{ t: number }> = ({ t }) => {
  if (t < EXPAND[1] - 0.02 || t >= PULLBACK[0]) return null;
  return (
    <AbsoluteFill style={{ transform: `scale(${lerp(1.07, 1, ep(t, EXPAND[1], PULLBACK[0], ease.soft))})`, transformOrigin: "50% 40%" }}>
      <Hero t={t} />
    </AbsoluteFill>
  );
};
