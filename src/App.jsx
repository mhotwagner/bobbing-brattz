import React, { useState, useCallback, useRef } from "react";
import BobbingHead from "./BobbingHead";
import bg from "../assets/bg.webp";
import mattSrc from "../assets/matt.webp";
import brianSrc from "../assets/brian.webp";
import ruSrc from "../assets/ru.webp";
import drinkSrc from "../assets/drink.webp";
import sandwichSrc from "../assets/sandwich.webp";
import beachballSrc from "../assets/beachball.webp";

const SRC_BY_TYPE = {
  matt: mattSrc,
  brian: brianSrc,
  ru: ruSrc,
  drink: drinkSrc,
  sandwich: sandwichSrc,
  beachball: beachballSrc,
};

const MILESTONES = {
  1: "ru",
  5: "drink",
  20: "sandwich",
  40: "beachball",
};

let nextId = 0;

function makeHead(type, x, y) {
  return { key: nextId++, type, src: SRC_BY_TYPE[type], x, y };
}

function randomPosition() {
  return {
    x: Math.random() * (window.innerWidth - 100) + 50,
    y: Math.random() * (window.innerHeight - 100) + 50,
  };
}

export default function App() {
  const tapCount = useRef(0);

  const [heads, setHeads] = useState(() => {
    return ["matt", "brian"].map((id) => {
      const pos = randomPosition();
      return makeHead(id, pos.x, pos.y);
    });
  });

  const handleTap = useCallback((type, x, y) => {
    tapCount.current += 1;
    const milestoneType = MILESTONES[tapCount.current];
    const spawnType = milestoneType || type;
    setHeads((prev) => [...prev, makeHead(spawnType, x + 20, y + 20)]);
  }, []);

  const removeHead = useCallback((key) => {
    setHeads((prev) => prev.filter((h) => h.key !== key));
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        background: `url(${bg}) center/cover no-repeat`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          zIndex: 10,
          pointerEvents: "none",
          textAlign: "center",
          filter: "drop-shadow(2px 2px 1px rgba(0,0,0,0.5))",
        }}
      >
        <h1
          className="rainbow-text"
          style={{
            fontSize: "3rem",
            fontFamily: "'Helvetica', 'Arial', sans-serif",
            fontWeight: "bold",
            letterSpacing: "-0.025em",
          }}
        >
          Bobbing Bratts
        </h1>
        <p
          className="rainbow-text"
          style={{ fontSize: "1.1rem", marginTop: 8, fontFamily: "'Helvetica', 'Arial', sans-serif", fontWeight: "bold" }}
        >
          Click to duplicate, drag to toss!
        </p>
        <p
          className="rainbow-text"
          style={{ fontSize: "1.1rem", marginTop: 4, fontFamily: "'Helvetica', 'Arial', sans-serif", fontWeight: "bold" }}
        >
          Happy Wedding Day, Brian and Matt!
        </p>
      </div>
      {heads.map((h) => (
        <BobbingHead
          key={h.key}
          id={h.key}
          type={h.type}
          src={h.src}
          startX={h.x}
          startY={h.y}
          onTap={handleTap}
          onRemove={removeHead}
        />
      ))}
    </div>
  );
}
