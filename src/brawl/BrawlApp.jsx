import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import usePartyRoom from "./hooks/usePartyRoom";
import Landing from "./screens/Landing";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";
import Results from "./screens/Results";
import { generateRoomCode } from "./lib/roomCode";
import { ARENAS } from "./lib/arenas";
import "./styles/brawl.css";

// Phases: landing → (lobby for private) → warmup → countdown → playing → results
export default function BrawlApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [phase, setPhase] = useState("landing");
  const [roomCode, setRoomCode] = useState(searchParams.get("room") || "");
  const [myCharacter, setMyCharacter] = useState(null);
  const [arena, setArena] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [myId, setMyId] = useState(null);
  const [winner, setWinner] = useState(null);
  const [spawns, setSpawns] = useState(null);
  const [error, setError] = useState(null);
  const [arenaRadius, setArenaRadius] = useState(300);
  const [isRandom, setIsRandom] = useState(false);

  const joinPayloadRef = useRef(null); // { character, random }
  const joinSentRef = useRef(false);

  const { send, connected } = usePartyRoom(roomCode, (msg) => {
    switch (msg.type) {
      case "room":
        setPlayers(msg.players);
        setIsHost(msg.host === msg.you);
        setMyId(msg.you);
        if (msg.arena) setArena(msg.arena);
        if (msg.isRandom != null) setIsRandom(msg.isRandom);
        if (msg.spawns) setSpawns(msg.spawns);
        // Forward items to Game via event
        if (msg.items) {
          window.dispatchEvent(new CustomEvent("brawl-msg", { detail: { type: "room_items", items: msg.items } }));
        }
        // Sync phase from server
        if (msg.phase === "warmup" && (phase === "landing" || phase === "lobby" || phase === "waiting" || phase === "results")) {
          setPhase("warmup");
        }
        if (msg.phase === "playing" && phase !== "playing") {
          setPhase("playing");
        }
        break;
      case "countdown":
        setPhase("countdown");
        break;
      case "go":
        setSpawns(msg.spawns);
        if (msg.arena) setArena(msg.arena);
        setPhase("playing");
        // Clear items for fresh game start
        window.dispatchEvent(new CustomEvent("brawl-msg", { detail: { type: "room_items", items: [] } }));
        break;
      case "pos":
      case "bump":
      case "ko":
      case "hit":
      case "item_spawn":
      case "item_collect":
      case "item_despawn":
      case "powerup_end":
        window.dispatchEvent(new CustomEvent("brawl-msg", { detail: msg }));
        break;
      case "result":
        setWinner(msg.winner);
        setPlayers(msg.players);
        setPhase("results");
        break;
      case "left":
        setPlayers(msg.players);
        if (msg.host) {
          setIsHost(msg.host === myId);
        }
        break;
      case "error":
        setError(msg.message);
        setTimeout(() => setError(null), 3000);
        break;
    }
  });

  // Send join message once connected
  useEffect(() => {
    if (connected && joinPayloadRef.current && !joinSentRef.current) {
      const { character, random } = joinPayloadRef.current;
      send({ type: "join", character, name: character, random });
      joinSentRef.current = true;
    }
  }, [connected, send]);

  // Reset join sent when room changes
  useEffect(() => {
    joinSentRef.current = false;
  }, [roomCode]);

  // --- Quick Play ---
  const handleQuickPlay = useCallback(
    (character) => {
      setMyCharacter(character);
      setIsRandom(true);
      const code = "RANDOM";
      setRoomCode(code);
      joinPayloadRef.current = { character, random: true };
      setSearchParams({ room: code });
      // Phase will move to warmup when server responds with room state
    },
    [setSearchParams]
  );

  // --- Private Room ---
  const handlePrivateRoom = useCallback(
    (character) => {
      setMyCharacter(character);
      setIsRandom(false);
      setPhase("lobby");
    },
    []
  );

  const handleJoinRoom = useCallback(
    (code, character) => {
      setRoomCode(code);
      setMyCharacter(character);
      joinPayloadRef.current = { character, random: false };
      setSearchParams({ room: code });
      // Phase will move to warmup when server responds
    },
    [setSearchParams]
  );

  const handleSetArena = useCallback(
    (arenaId) => {
      setArena(arenaId);
      send({ type: "arena", arena: arenaId });
    },
    [send]
  );

  const handleStart = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const smallerDim = Math.min(vw, vh);
    const radius = smallerDim * 0.42;
    setArenaRadius(radius);
    send({ type: "start", arenaRadius: radius });
  }, [send]);

  const handleRematch = useCallback(() => {
    setWinner(null);
    setSpawns(null);
    send({ type: "rematch" });
    // Phase will move to warmup when server responds
  }, [send]);

  const handleBackToLanding = useCallback(() => {
    setPhase("landing");
    setRoomCode("");
    setMyCharacter(null);
    setArena(null);
    setPlayers([]);
    setIsHost(false);
    setWinner(null);
    setSpawns(null);
    setIsRandom(false);
    joinPayloadRef.current = null;
    joinSentRef.current = false;
    setSearchParams({});
  }, [setSearchParams]);

  // If URL has ?room= on first load, go to lobby to let them pick character
  const initialRoomFromUrl = searchParams.get("room");

  return (
    <div className="brawl-root">
      {error && <div className="brawl-error">{error}</div>}

      {phase === "landing" && (
        <Landing
          onQuickPlay={handleQuickPlay}
          onPrivateRoom={handlePrivateRoom}
        />
      )}

      {phase === "lobby" && (
        <Lobby
          initialRoom={initialRoomFromUrl || ""}
          onJoin={handleJoinRoom}
          onBack={handleBackToLanding}
          takenCharacters={[]}
          myCharacter={myCharacter}
        />
      )}

      {(phase === "warmup" || phase === "countdown" || phase === "playing") && (
        <Game
          roomCode={roomCode}
          myId={myId}
          myCharacter={myCharacter}
          players={players}
          arena={arena}
          spawns={spawns}
          arenaRadius={arenaRadius}
          send={send}
          phase={phase}
          isHost={isHost}
          isRandom={isRandom}
          onStart={handleStart}
          onSetArena={handleSetArena}
        />
      )}

      {phase === "results" && (
        <Results
          winner={winner}
          players={players}
          myId={myId}
          isRandom={isRandom}
          onRematch={handleRematch}
          onBack={handleBackToLanding}
        />
      )}
    </div>
  );
}
