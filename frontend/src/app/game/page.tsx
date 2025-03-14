"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";
import ChatBox from "@/components/ChatBox";
import { useRouter } from "next/navigation";
import DrawingBoard from "@/components/DrawingBoard";
import GuessingBoard from "@/components/GuessingBoard";
import { BoxesContainer } from "@/components/ui/background-boxes";
import PlayerList from "@/components/PlayerList";

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
        setDrawerSessionId(value);
        setIsDrawing(value === room.sessionId);
      });

      $(room.state).listen("ended", (ended: boolean) => {
        if (ended) {
          console.log("Game ended!");
          router.push("/");
        }
      });

      $(room.state).listen("board", (board: any) => {
        console.log("board", board);
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
      <div className="flex flex-col space-y-4 z-10 h-3/4 w-1/5">
        <h1 className="text-center">
          Round {room?.state.round}/{room?.state?.settings?.rounds}
        </h1>
        <h1 className="text-center">
          {isDrawing
            ? "Your are drawing!"
            : players?.get(drawerSessionId)?.name + " is drawing."}
        </h1>
        <h1 className="text-center">
          {isDrawing
            ? "Word: " + room?.state.currentWord
            : "Word length: " + room?.state.currentWord?.length}
        </h1>
        <h1 className="text-center">Time left: {time.toString()}</h1>
        <PlayerList
          players={players ? players : new Map<string, any>()}
          room={room}
          isDrawing={isDrawing}
        />
      </div>
      <div className="z-10 bg-white">
        {isDrawing ? <DrawingBoard size={32} /> : <GuessingBoard size={32} />}
      </div>
      <ChatBox />
    </div>
  );
}
