"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";
import ChatBox from "@/components/ChatBox";
import { useRouter } from "next/navigation";
import { BoxesContainer } from "@/components/ui/background-boxes";
import LobbySettings from "@/components/LobbySettings"; // Adjust the import path as needed
import { FaLink } from "react-icons/fa";

interface Player {
  name: string;
  sessionId: string;
  leader: boolean;
}

export default function Lobby() {
  const { room, reconnect } = useRoom();
  const [players, setPlayers] = useState<Map<string, Player>>();
  const [leader, setLeader] = useState<boolean>(false);
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

      $(room.state).listen("started", (started: boolean) => {
        if (started) router.push("/game");
      });
    }
  }, [room]);

  if (!room) {
    return (
      <div>
        <h1>⚠️ NO CONNECTION </h1>
        <button onClick={() => reconnect()}>Reconnect</button>
      </div>
    );
  }

  return (
    <div className="h-screen relative w-full overflow-hidden bg-slate-900 flex flex-row items-center justify-evenly text-[#DDE6ED]">
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-0[mask-image:radial-gradient(transparent,white)] pointer-events-none" />
      <BoxesContainer />
      <div className="px-8 z-10 bg-[#27374D] h-3/4 w-1/6 shadow-lg">
        <h1 className="py-4">Scoreboard</h1>
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
      <LobbySettings leader={leader} />
      <ChatBox />
    </div>
  );
}
