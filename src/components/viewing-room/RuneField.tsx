import type { CSSProperties } from "react";

import { RUNE_GLYPHS, RUNE_OVERHANG, RUNE_PLACEMENTS, RUNE_VIEWBOX } from "@/lib/viewing-room-runes";

export function RuneField() {
  return (
    <div
      aria-hidden
      data-rune-field
      className="rune-field pointer-events-none absolute -z-10"
      style={{
        left: `${-RUNE_OVERHANG.x * 100}%`,
        right: `${-RUNE_OVERHANG.x * 100}%`,
        top: `${-RUNE_OVERHANG.y * 100}%`,
        bottom: `${-RUNE_OVERHANG.y * 100}%`,
      }}
    >
      {RUNE_PLACEMENTS.map((placement, index) => (
        <svg
          key={index}
          viewBox={`0 0 ${RUNE_VIEWBOX.width} ${RUNE_VIEWBOX.height}`}
          className="rune-field__rune absolute"
          style={{
            left: `${placement.x}%`,
            top: `${placement.y}%`,
            width: `calc(var(--rune-base) * ${placement.scale})`,
            aspectRatio: `${RUNE_VIEWBOX.width}/${RUNE_VIEWBOX.height}`,
            translate: "-50% -50%",
            rotate: `${placement.rotate}deg`,
            "--delay": `${placement.delay}s`,
            "--dur": `${placement.duration}s`,
          } as CSSProperties}
        >
          <path
            d={RUNE_GLYPHS[placement.rune]}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  );
}
