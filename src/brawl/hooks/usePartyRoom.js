import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";

function getPartyHost() {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    // Allow override via VITE_PARTY_HOST for ngrok/tunnel setups
    if (import.meta.env.VITE_PARTY_HOST) return import.meta.env.VITE_PARTY_HOST;
    return `${window.location.hostname}:1999`;
  }
  return "bobbing-brattz-brawl.mhotwagner.partykit.dev";
}
const PARTY_HOST = getPartyHost();

export default function usePartyRoom(roomCode, onMessage) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!roomCode) return;

    const ws = new PartySocket({
      host: PARTY_HOST,
      room: roomCode.toUpperCase(),
      party: "main",
    });

    ws.addEventListener("open", () => setConnected(true));
    ws.addEventListener("close", () => setConnected(false));
    ws.addEventListener("message", (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        onMessageRef.current(msg);
      } catch {
        // ignore malformed messages
      }
    });

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [roomCode]);

  const send = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected, ws: wsRef };
}
