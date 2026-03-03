import React from "react";
import { CHARACTER_MAP } from "../lib/characters";
import ArenaPicker from "../components/ArenaPicker";
import { ARENAS } from "../lib/arenas";

export default function WaitingRoom({
  roomCode,
  players,
  isHost,
  arena,
  onSetArena,
  onStart,
  connected,
}) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/brawl?room=${roomCode}`
      : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Brat Brawl", text: "Join my brawl!", url: shareUrl });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      // Could show a toast here
    }
  };

  const canStart = players.length >= 2 && arena;

  return (
    <div className="brawl-waiting">
      <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 2 }}>
        Room Code
      </p>
      <div className="brawl-room-code">{roomCode}</div>

      <button className="brawl-btn brawl-btn--secondary" onClick={handleShare}>
        Share Link
      </button>

      <div className="brawl-player-list">
        {players.map((p, i) => {
          const char = CHARACTER_MAP[p.character];
          return (
            <div key={p.id} className={`brawl-player-slot ${i === 0 ? "brawl-player-slot--host" : ""}`}>
              {char && <img src={char.src} alt={char.name} />}
              <span>{char?.name || "?"}</span>
              {i === 0 && (
                <span style={{ fontSize: 10, color: "#f7c948" }}>HOST</span>
              )}
            </div>
          );
        })}
        {players.length < 4 &&
          Array.from({ length: 4 - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="brawl-player-slot" style={{ opacity: 0.2 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: "3px dashed rgba(255,255,255,0.3)",
                }}
              />
              <span>...</span>
            </div>
          ))}
      </div>

      {isHost && (
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 2 }}>
            Pick Arena
          </p>
          <ArenaPicker arenas={ARENAS} selected={arena} onSelect={onSetArena} />
        </div>
      )}

      {!isHost && arena && (
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
          Arena: {ARENAS.find((a) => a.id === arena)?.name || arena}
        </p>
      )}

      {isHost ? (
        <button className="brawl-btn" onClick={onStart} disabled={!canStart}>
          {!canStart
            ? players.length < 2
              ? "Waiting for players..."
              : "Pick an arena"
            : "Start Brawl"}
        </button>
      ) : (
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)" }}>
          Waiting for host to start...
        </p>
      )}

      <div className={`brawl-connection ${connected ? "brawl-connection--connected" : "brawl-connection--disconnected"}`} />
    </div>
  );
}
