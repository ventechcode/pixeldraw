"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";
import ChatBox from "@/components/ChatBox";
import { useRouter } from "next/navigation";
import { BoxesContainer } from "@/components/ui/background-boxes";
import PlayerList from "@/components/PlayerList";
import { Grid } from "@/components/Grid";

interface Player {
  name: string;
  sessionId: string;
  leader: boolean;
  guessed?: boolean;
  score?: number;
}

export default function Game() {
  const { room, reconnect } = useRoom();
  const [players, setPlayers] = useState<Map<string, Player>>();
  const [leader, setLeader] = useState<boolean>(false);
  const [time, setTime] = useState<number>(0);
  const [drawerSessionId, setDrawerSessionId] = useState<string>("");
  const [isDrawer, setIsDrawer] = useState<boolean>(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [round, setRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(3);

  const router = useRouter();

  useEffect(() => {
    if (!room) return;

    const $ = getStateCallbacks(room);

    // Initial state setup
    setPlayers(new Map(room.state.players));
    setLeader(room.state.players.get(room.sessionId)?.leader || false);
    setTime(room.state.time || 0);
    setDrawerSessionId(room.state.drawerSessionId || "");
    setIsDrawer(room.state.drawerSessionId === room.sessionId);
    setCurrentWord(room.state.currentWord || "");
    setRound(room.state.round || 1);
    setTotalRounds(room.state.settings?.rounds || 3);

    // Player updates
    $(room.state).players.onAdd((player: Player) => {
      setPlayers(new Map(room.state.players));
      setLeader(room.state.players.get(room.sessionId)?.leader || false);
    });

    $(room.state).players.onRemove((player: Player) => {
      setPlayers(new Map(room.state.players));
    });

    // Game state updates
    $(room.state).listen("time", (value: number) => {
      setTime(value);
    });

    $(room.state).listen("drawerSessionId", (value: string) => {
      setDrawerSessionId(value);
      setIsDrawer(value === room.sessionId);
    });

    $(room.state).listen("currentWord", (value: string) => {
      setCurrentWord(value);
    });

    $(room.state).listen("round", (value: number) => {
      setRound(value);
    });

    $(room.state).listen("ended", (ended: boolean) => {
      if (ended) {
        console.log("Game ended!");
        router.push("/");
      }
    });
  }, [room, router]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">⚠️ Connection Lost</h1>
          <button
            onClick={() => reconnect()}
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  const drawerName = players?.get(drawerSessionId)?.name || "Player";

  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-slate-900 flex flex-col md:flex-row items-center justify-evenly text-[#DDE6ED] p-4 md:p-0">
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-0[mask-image:radial-gradient(transparent,white)] pointer-events-none" />
      <BoxesContainer />

      {/* Game Info Panel */}
      <div className="flex flex-col space-y-4 z-10 h-3/4 w-full md:w-1/5 mb-4 md:mb-0">
        {/* Game Status */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
          <h1 className="text-center text-lg md:text-xl font-semibold mb-2">
            Round {round}/{totalRounds}
          </h1>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-md text-center mb-2">
            {isDrawer ? (
              <div>
                <div className="font-bold text-lg">Your turn to draw!</div>
                <div className="text-yellow-200 text-xl mt-1">
                  {currentWord}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium">{drawerName} is drawing</div>
                <div className="text-sm mt-1">
                  Word:{" "}
                  <span className="font-mono tracking-wider">
                    {currentWord ? "_".repeat(currentWord.length) : ""}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="text-center text-xl bg-gray-700 p-2 rounded-md">
            Time: <span className="font-bold">{time}</span>
          </div>
        </div>

        {/* Player list */}
        <PlayerList
          players={players ? players : new Map<string, any>()}
          room={room}
          isDrawing={isDrawer}
        />
      </div>

      {/* Drawing Grid with Word and Controls */}
      <div className="z-10">
        <Grid size={32} isDrawer={isDrawer} currentWord={currentWord} />
      </div>

      {/* Chat */}
      <ChatBox />
    </div>
  );
}
