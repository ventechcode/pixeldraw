"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";
import ChatBox from "@/components/ChatBox";
import GameBoard from "@/components/GameBoard";
import { redirect } from "next/dist/server/api-utils";

interface Player {
  name: string;
  sessionId: string;
  leader: boolean;
}

export default function Game() {
  const { room, reconnect } = useRoom();
  const [players, setPlayers] = useState<Map<string, Player>>();
  const [leader, setLeader] = useState<boolean>(false);

  useEffect(() => {
    if (room) {
      const $ = getStateCallbacks(room);

      $(room.state).players.onAdd((player: Player) => {
        const playersMap = new Map<string, Player>(room.state.players);
        setPlayers(playersMap);
        setLeader(playersMap.get(room.sessionId)?.leader || false);
      });

      $(room.state).players.onRemove((player: Player) => {
        setPlayers(new Map(room.state.players));
      });
    }
  }, [room]);

  // If no room, allow the user to rejoin
  // if (!room) {
  //   return (
  //     <div>
  //       <h1>⚠️ NO CONNECTION </h1>
  //       <button onClick={() => reconnect()}>Reconnect</button>
  //     </div>
  //   );
  // }

  if (!room) {
    const res = reconnect();
    console.log(res);
  }

  return (
    <div className="w-full flex flex-row justify-around gap-4 px-16 h-3/4">
      <div className="border rounded-md px-8">
        <h1 className="py-4">🎮 Lobby {room?.roomId}</h1>
        <ul>
          {Array.from(players?.values() || []).map((player, i) => (
            <li key={i}>
              👤{" "}
              {player.sessionId === room?.sessionId
                ? player.leader
                  ? `${player.name} (You) (Leader)`
                  : player.name + " (You)"
                : player.leader
                ? `${player.name} (Leader)`
                : player.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col items-center justify-around border rounded-md w-3/5">
        <GameBoard />
      </div>
      <ChatBox />
    </div>
  );
}
