import React, { useRef, useEffect, useCallback } from "react";
import { CHARACTER_MAP } from "../lib/characters";
import { getPointerPos } from "../engine/inputHandler";

const HEAD_SIZE = 80;

export default function PlayerHead({ state, character, onDragStart, onDragMove, onDragEnd, shielded, speedBoost }) {
  const elRef = useRef(null);
  const char = CHARACTER_MAP[character];

  // Update DOM transform directly for performance (bypass React render)
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    let rafId;
    function update() {
      if (state) {
        el.style.transform = `translate(${state.x - HEAD_SIZE / 2}px, ${state.y - HEAD_SIZE / 2}px) rotate(${state.angle}deg)`;
      }
      rafId = requestAnimationFrame(update);
    }
    update();
    return () => cancelAnimationFrame(rafId);
  }, [state]);

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const { px, py } = getPointerPos(e);
      onDragStart?.(px, py);
    },
    [onDragStart]
  );

  const handlePointerMove = useCallback(
    (e) => {
      e.preventDefault();
      const { px, py } = getPointerPos(e);
      onDragMove?.(px, py);
    },
    [onDragMove]
  );

  const handlePointerUp = useCallback(
    (e) => {
      e.preventDefault();
      const { px, py } = getPointerPos(e);
      onDragEnd?.(px, py);
    },
    [onDragEnd]
  );

  // Window-level listeners for drag
  useEffect(() => {
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("touchcancel", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("touchcancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  if (!char) return null;

  return (
    <div
      ref={elRef}
      className={`brawl-player-head brawl-player-head--local${shielded ? " brawl-player-head--shielded" : ""}${speedBoost ? " brawl-player-head--speed" : ""}`}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <img src={char.src} alt={char.name} draggable={false} />
      <div className="brawl-you-arrow" />
    </div>
  );
}
