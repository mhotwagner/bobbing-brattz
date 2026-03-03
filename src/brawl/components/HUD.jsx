import React from "react";
import { CHARACTER_MAP } from "../lib/characters";

const MAX_HP = 5;

export default function HUD({ players }) {
  return (
    <div className="brawl-hud">
      {players.map((p) => {
        const char = CHARACTER_MAP[p.character];
        const hp = p.hp ?? MAX_HP;
        return (
          <div
            key={p.id}
            className={`brawl-hud__player${!p.alive ? " brawl-hud__player--ko" : ""}`}
          >
            {char && <img src={char.src} alt={char.name} />}
            <div className="brawl-hud__info">
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
                {char?.name || "?"}
              </span>
              <div className="brawl-hud__pips">
                {Array.from({ length: MAX_HP }, (_, i) => (
                  <span
                    key={i}
                    className={`brawl-hud__pip${i < hp ? " brawl-hud__pip--active" : ""}`}
                  />
                ))}
              </div>
              {(p.shield || p.speedBoost) && (
                <div className="brawl-hud__powerups">
                  {p.shield && <span className="brawl-hud__powerup brawl-hud__powerup--shield" />}
                  {p.speedBoost && <span className="brawl-hud__powerup brawl-hud__powerup--speed" />}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
