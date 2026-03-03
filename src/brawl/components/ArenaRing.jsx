import React from "react";
import { ARENA_MAP } from "../lib/arenas";

export default function ArenaRing({ arenaId, radius, centerX, centerY, children }) {
  const arena = ARENA_MAP[arenaId];
  if (!arena) return null;

  const diameter = radius * 2;

  return (
    <div className="brawl-game">
      {/* Background */}
      <div
        className="brawl-arena-bg"
        style={{ backgroundImage: `url(${arena.bg})` }}
      />

      {/* Circular arena ring */}
      <div
        className="brawl-arena-ring"
        style={{
          left: centerX,
          top: centerY,
          width: diameter,
          height: diameter,
          backgroundColor: arena.ringColor,
          borderColor: arena.ringBorder,
        }}
      />

      {/* Players and other content rendered inside */}
      {children}
    </div>
  );
}
