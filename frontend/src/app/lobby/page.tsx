"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";

interface Player {
  name: string;
  sessionId: string;
  leader: boolean;
}

export default function Lobby() {
  const { room, reconnect } = useRoom();
  const [players, setPlayers] = useState<Map<string, Player>>();

  useEffect(() => {
    if (room) {
      const $ = getStateCallbacks(room);

      $(room.state).players.onAdd(() => {
        setPlayers(new Map(room.state.players));
      });

      $(room.state).players.onRemove(() => {
        setPlayers(new Map(room.state.players));
      });
    }
  }, [room]);

  // If no room, allow the user to rejoin
  if (!room) {
    return (
      <div>
        <h1>⚠️ Connection lost</h1>
        <button onClick={() => reconnect()}>Reconnect</button>
      </div>
    );
  }

  return (
    <div>
      <h1>🎮 Lobby {room.roomId}</h1>
      <ul>
        {Array.from(players?.values() || []).map((player, i) => (
          <li key={i}>👤 {
            player.sessionId === room.sessionId
              ? player.leader ? `${player.name} (You) (Leader)` : player.name + " (You)"
              : player.leader ? `${player.name} (Leader)` : player.name
          }</li>
        ))}
      </ul>
    </div>
  );
}
