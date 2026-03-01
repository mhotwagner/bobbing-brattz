import React, { useRef, useEffect } from "react";
import { register, unregister, HEAD_SIZE } from "./physics";

const TAP_THRESHOLD = 8; // max px movement to count as a tap

export default function BobbingHead({
  id,
  type,
  src,
  startX,
  startY,
  onTap,
}) {
  const elRef = useRef(null);
  const state = useRef({
    x: startX,
    y: startY,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 12,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    prevPointerX: 0,
    prevPointerY: 0,
    angle: 0,
    spin: ((Math.random() - 0.5) * 12 + (Math.random() - 0.5) * 12) * 4,
  });

  useEffect(() => {
    register(id, state, elRef);
    return () => unregister(id);
  }, [id]);

  const getPointerPos = (e) => {
    const touch = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
    return { px: touch.clientX, py: touch.clientY };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const s = state.current;
    const { px, py } = getPointerPos(e);

    s.downX = px;
    s.downY = py;
    s.dragging = true;
    s.dragOffsetX = px - s.x;
    s.dragOffsetY = py - s.y;
    s.lastPointerX = px;
    s.lastPointerY = py;
    s.prevPointerX = px;
    s.prevPointerY = py;
    s.vx = 0;
    s.vy = 0;
  };

  const onPointerMove = (e) => {
    e.preventDefault();
    const s = state.current;
    if (!s.dragging) return;
    const { px, py } = getPointerPos(e);

    s.prevPointerX = s.lastPointerX;
    s.prevPointerY = s.lastPointerY;
    s.lastPointerX = px;
    s.lastPointerY = py;
    s.x = px - s.dragOffsetX;
    s.y = py - s.dragOffsetY;
  };

  const onPointerUp = (e) => {
    e.preventDefault();
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;

    const { px, py } = getPointerPos(e);
    const dx = px - s.downX;
    const dy = py - s.downY;

    if (Math.sqrt(dx * dx + dy * dy) < TAP_THRESHOLD) {
      // Tap — spawn new head; only nudge this one if it was already moving
      onTap(type, s.x, s.y);
      const wasMoving = Math.abs(s.vx) > 0.5 || Math.abs(s.vy) > 0.5;
      if (wasMoving) {
        s.vx = (Math.random() - 0.5) * 10;
        s.vy = (Math.random() - 0.5) * 10;
        s.spin = (s.vx + s.vy) * 4;
      }
    } else {
      // Drag — fling velocity from last movement
      s.vx = (s.lastPointerX - s.prevPointerX) * 0.5;
      s.vy = (s.lastPointerY - s.prevPointerY) * 0.5;
      s.spin = (s.vx + s.vy) * 4;
    }
  };

  useEffect(() => {
    const move = (e) => onPointerMove(e);
    const up = (e) => onPointerUp(e);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, []);

  return (
    <div
      ref={elRef}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      style={{
        position: "absolute",
        width: HEAD_SIZE,
        height: HEAD_SIZE,
        cursor: "grab",
        willChange: "transform",
        top: 0,
        left: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
      }}
    >
      <img
        src={src}
        alt={type}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
