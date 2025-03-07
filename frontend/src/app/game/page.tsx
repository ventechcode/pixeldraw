"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";
import ChatBox from "@/components/ChatBox";
import GameBoard from "@/components/GameBoard";
import { useRouter } from "next/navigation";

interface Player {
  name: string;
  sessionId: string;
  leader: boolean;
}

export default function Game() {
  const { room, reconnect } = useRoom();
  const [players, setPlayers] = useState<Map<string, Player>>();
  const [leader, setLeader] = useState<boolean>(false);
  const [time, setTime] = useState<number>(0);
  const [drawerSessionId, setDrawerSessionId] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const router = useRouter();

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

      $(room.state).listen("time", (value: number) => {
        setTime(value);
      });

      // Update to use drawerSessionId instead of drawer
      $(room.state).listen("drawerSessionId", (value: string) => {
        console.log("New drawer session ID:", value);
        setDrawerSessionId(value);
        setIsDrawing(value === room.sessionId);
      });

      $(room.state).listen("ended", (ended: boolean) => {
        if (ended) {
          console.log("Game ended!");
          router.push("/");
        }
      });
    }
  }, [room]);

  // Get the current drawer from the players map
  const getCurrentDrawer = () => {
    if (!players || !drawerSessionId) return null;
    return players.get(drawerSessionId);
  };

  const currentDrawer = getCurrentDrawer();

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
        <h1>
          {currentDrawer
            ? `${currentDrawer.name} is drawing!`
            : "Waiting for drawer..."}
        </h1>
        <h1>
          Round: {room?.state.round} / {room?.state.maxRounds}
        </h1>
        <h1>Time: {time}</h1>
        <h1>Word: {room?.state.currentWord}</h1>

        {room?.state.ended ? <h1>Game Ended!</h1> : <GameBoard />}
      </div>
      <ChatBox />
    </div>
  );
}
