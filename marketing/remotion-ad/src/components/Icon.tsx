import React from "react";
import { ICONS } from "../icons";
import { clamp } from "../anim";

/*
  A Lucide line icon. `draw` (0 to 1) draws its strokes one after another,
  so an icon can write itself onto the screen when it arrives.
*/
export const Icon: React.FC<{
  name: string;
  size: number;
  color?: string;
  strokeWidth?: number;
  draw?: number;
  fill?: string;
  style?: React.CSSProperties;
}> = ({ name, size, color = "currentColor", strokeWidth = 2, draw = 1, fill = "none", style }) => {
  const shapes = ICONS[name];
  if (!shapes) throw new Error(`Unknown icon ${name}`);
  const n = shapes.length;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", overflow: "visible", ...style }}>
      {shapes.map(([tag, attrs], i) => {
        const off = n > 1 ? (0.45 * i) / (n - 1) : 0;
        const q = clamp((draw - off) / 0.55);
        const props: Record<string, unknown> = { ...attrs, key: i };
        if (draw < 1) {
          props.pathLength = 1;
          props.strokeDasharray = "1 2";
          props.strokeDashoffset = 1 - q;
          props.opacity = q > 0.001 ? 1 : 0;
        }
        return React.createElement(tag, props);
      })}
    </svg>
  );
};

/* The one icon treatment used across the ad: a rounded tile holding an icon. */
export const IconTile: React.FC<{
  name: string;
  size: number;
  bg?: string;
  color?: string;
  draw?: number;
  radius?: number;
  shadow?: string;
  style?: React.CSSProperties;
}> = ({ name, size, bg = "#18bada", color = "#00293b", draw = 1, radius, shadow, style }) => (
  <div style={{
    width: size, height: size, borderRadius: radius ?? size * 0.28, background: bg,
    display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shadow, flex: "none", ...style,
  }}>
    <Icon name={name} size={Math.round(size * 0.52)} color={color} draw={draw} />
  </div>
);
