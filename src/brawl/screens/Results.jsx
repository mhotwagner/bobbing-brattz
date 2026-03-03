import React from "react";
import { CHARACTER_MAP } from "../lib/characters";
import crownSrc from "/assets/glamour-ring.webp";

export default function Results({ winner, players, myId, isRandom, onRematch, onBack }) {
  const winnerPlayer = players.find((p) => p.id === winner);
  const winnerChar = winnerPlayer ? CHARACTER_MAP[winnerPlayer.character] : null;
  const isMe = winner === myId;

  return (
    <div className="brawl-results">
      <h2>{isMe ? "You Win!" : winnerChar ? `${winnerChar.name} Wins!` : "Draw!"}</h2>

      {winnerChar && (
        <div className="brawl-results__winner">
          <img className="brawl-results__crown" src={crownSrc} alt="crown" />
          <img className="brawl-results__face" src={winnerChar.src} alt={winnerChar.name} />
          <span className="brawl-results__name">{winnerChar.name}</span>
        </div>
      )}

      <div className="brawl-results__actions">
        {isRandom ? (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
            Next round starting soon...
          </p>
        ) : (
          <button className="brawl-btn" onClick={onRematch}>
            Rematch
          </button>
        )}
        <button className="brawl-btn brawl-btn--secondary" onClick={onBack}>
          Leave
        </button>
      </div>
    </div>
  );
}
