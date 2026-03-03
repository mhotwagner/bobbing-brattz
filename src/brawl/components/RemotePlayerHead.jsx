import React, { useRef, useEffect } from "react";
import { CHARACTER_MAP } from "../lib/characters";

const HEAD_SIZE = 80;

export default function RemotePlayerHead({ playerId, remoteState, character, alive, shielded, speedBoost }) {
  const elRef = useRef(null);
  const char = CHARACTER_MAP[character];

  // Update DOM transform directly for performance
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    let rafId;
    function update() {
      if (remoteState) {
        el.style.transform = `translate(${remoteState.x - HEAD_SIZE / 2}px, ${remoteState.y - HEAD_SIZE / 2}px) rotate(${remoteState.angle}deg)`;
      }
      rafId = requestAnimationFrame(update);
    }
    update();
    return () => cancelAnimationFrame(rafId);
  }, [remoteState]);

  if (!char) return null;

  return (
    <div
      ref={elRef}
      className={`brawl-player-head${!alive ? " brawl-player-head--ko" : ""}${shielded ? " brawl-player-head--shielded" : ""}${speedBoost ? " brawl-player-head--speed" : ""}`}
      data-player-id={playerId}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <img src={char.src} alt={char.name} draggable={false} />
    </div>
  );
}
