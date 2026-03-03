import React, { useState } from "react";
import { generateRoomCode, isValidRoomCode } from "../lib/roomCode";

export default function Lobby({ initialRoom, onJoin, onBack, myCharacter }) {
  const [roomCode, setRoomCode] = useState(initialRoom || "");
  const [mode, setMode] = useState(initialRoom ? "join" : null); // null | "create" | "join"

  const handleCreate = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setMode("create");
  };

  const handleJoinMode = () => {
    setMode("join");
  };

  const handleGo = () => {
    if (!isValidRoomCode(roomCode)) return;
    onJoin(roomCode, myCharacter);
  };

  const canGo = isValidRoomCode(roomCode);

  return (
    <div className="brawl-lobby">
      <h2>Private Room</h2>

      {!mode && (
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button className="brawl-btn" onClick={handleCreate}>
            Create Room
          </button>
          <button className="brawl-btn brawl-btn--secondary" onClick={handleJoinMode}>
            Join Room
          </button>
        </div>
      )}

      {mode && (
        <>
          <div className="brawl-lobby__section">
            <h3>Room Code</h3>
            {mode === "create" ? (
              <div className="brawl-room-code" style={{ fontSize: 36, letterSpacing: 8 }}>
                {roomCode}
              </div>
            ) : (
              <div className="brawl-room-input">
                <input
                  type="text"
                  maxLength={4}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="XXXX"
                  autoFocus
                />
              </div>
            )}
          </div>

          <button className="brawl-btn" onClick={handleGo} disabled={!canGo}>
            {mode === "create" ? "Create & Join" : "Join"}
          </button>

          <button
            className="brawl-btn brawl-btn--secondary"
            onClick={() => { setMode(null); setRoomCode(""); }}
            style={{ marginTop: 4 }}
          >
            Back
          </button>
        </>
      )}

      <button
        className="brawl-btn brawl-btn--secondary"
        onClick={onBack}
        style={{ marginTop: 8 }}
      >
        Back to Menu
      </button>
    </div>
  );
}
