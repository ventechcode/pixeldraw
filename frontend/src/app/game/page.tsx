"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";
import ChatBox from "@/components/ChatBox";
import { useRouter } from "next/navigation";
import { BoxesContainer } from "@/components/ui/background-boxes";
import PlayerList from "@/components/PlayerList";
import { Grid } from "@/components/Grid";
import { AnimatePresence, motion } from "framer-motion";

interface Player {
  name: string;
  sessionId: string;
  leader: boolean;
  guessed?: boolean;
  score?: number;
}

export default function Game() {
  const { room, reconnect } = useRoom();
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [time, setTime] = useState<number>(0);
  const [drawerSessionId, setDrawerSessionId] = useState<string>("");
  const [isDrawer, setIsDrawer] = useState<boolean>(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [gridSize, setGridSize] = useState<number>(32);
  const [allGuessed, setAllGuessed] = useState<boolean>(false);

  // Fixed grid size for both Grid component and overlays
  const FIXED_GRID_SIZE = 800;

  const [showTimeIsUpOverlay, setShowTimeIsUpOverlay] =
    useState<boolean>(false);

  const router = useRouter();

  // Function to check if all players have guessed
  const checkAllPlayersGuessed = useCallback(
    (playerMap: Map<string, Player>) => {
      if (!playerMap || !drawerSessionId || playerMap.size < 2) return false;

      let allNonDrawersGuessed = true;
      playerMap.forEach((player, id) => {
        // Skip the drawer in this check
        if (id !== drawerSessionId && !player.guessed) {
          allNonDrawersGuessed = false;
        }
      });

      return allNonDrawersGuessed;
    },
    [drawerSessionId]
  );

  // Function to find player(s) with highest score
  const findWinners = useCallback(() => {
    let highestScore = -1;
    let winners: Player[] = [];

    players.forEach((player) => {
      if (player.score && player.score > highestScore) {
        highestScore = player.score;
        winners = [player];
      } else if (player.score && player.score === highestScore) {
        winners.push(player);
      }
    });

    return winners;
  }, [players]);

  useEffect(() => {
    if (!room) return;

    const $ = getStateCallbacks(room);

    // Initial state setup
    const initialPlayers = new Map<string, Player>();
    room.state.players.forEach((player: Player, id: string) => {
      initialPlayers.set(id, player);
    });

    setPlayers(initialPlayers);
    // Initialize time with protection against game end state and overlay state
    setTime(
      room.state.ended ? 0 : room.state.time < 0 ? 0 : room.state.time || 0
    );
    setDrawerSessionId(room.state.drawerSessionId || "");
    setIsDrawer(
      room.state.drawerSessionId === room.sessionId && !room.state.ended
    );
    setCurrentWord(room.state.currentWord || "");
    setGridSize(room.state.settings?.gridSize || 32);
    setAllGuessed(checkAllPlayersGuessed(initialPlayers));

    // Player updates
    $(room.state).players.onAdd((player: Player, sessionId: string) => {
      setPlayers((prevPlayers) => {
        const newPlayers = new Map(prevPlayers);
        newPlayers.set(sessionId, player);
        return newPlayers;
      });
    });

    $(room.state).players.onRemove((player: Player, sessionId: string) => {
      setPlayers((prevPlayers) => {
        const newPlayers = new Map(prevPlayers);
        newPlayers.delete(sessionId);
        return newPlayers;
      });
    });

    // This section handles individual player state updates from the server
    $(room.state.players).onChange((player: Player, sessionId: string) => {
      // Handle individual player state updates, especially guessed state
      setPlayers((prevPlayers) => {
        const newPlayers = new Map(prevPlayers);
        newPlayers.set(sessionId, player);
        return newPlayers;
      });

      // Check if current player has guessed
      if (sessionId === room.sessionId && player.guessed) {
        console.log("Current player guessed the word correctly!");
      }
    });

    // Watch for general state changes to update player status
    room.onStateChange(() => {
      // Only update state if game is not ended to prevent flickering at game end
      if (!room.state.ended) {
        const updatedPlayers = new Map<string, Player>();
        room.state.players.forEach((player: Player, id: string) => {
          updatedPlayers.set(id, player);
        });
        setPlayers(updatedPlayers);

        // Also update allGuessed status on each state change
        setAllGuessed(checkAllPlayersGuessed(updatedPlayers));
      }
    });

    // Game state updates - Handle time updates directly here
    $(room.state).listen("time", (value: number) => {
      if (value >= 0) setTime(value);

      if (room.state.ended) {
        // If game has ended, force time to 0
        setTime(0);
      }
    });

    room.onMessage("time_up", () => {
      if (room.state.ended) {
        return;
      }

      setShowTimeIsUpOverlay(true);
    });

    $(room.state).listen("currentWord", (value: string) => {
      // Simply update the word - don't show overlay or expose word info
      setCurrentWord(value);
    });

    $(room.state).listen("round", (value: number) => {});

    // Listen for game end
    $(room.state).listen("ended", (ended: boolean) => {});

    // Settings updates
    $(room.state.settings).listen("gridSize", (value: number) => {
      setGridSize(value);
    });

    $(room.state).listen("drawerSessionId", (value: string) => {
      setShowTimeIsUpOverlay(false);
      console.log("Drawer session ID changed:", value);
      setDrawerSessionId(value);
      setIsDrawer(value === room.sessionId);
    });
  }, [room]);

  // Render connection lost message if room is not available
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

  // Create masked word for guessers (show blanks for each letter)
  const maskedWord = currentWord ? "_".repeat(currentWord.length) : "";

  // Sort players by score for the scoreboard
  const sortedPlayers = Array.from(players.values()).sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-slate-900 flex flex-col md:flex-row items-center justify-evenly text-[#DDE6ED] p-4 md:p-0">
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-0[mask-image:radial-gradient(transparent,white)] pointer-events-none" />
      <BoxesContainer />

      {/* Game Info Panel */}
      <div className="flex flex-col space-y-4 z-10 h-3/4 w-full md:w-1/5 mb-4 md:mb-0">
        {/* Game Status */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
          <h1 className="text-center text-lg md:text-xl font-semibold mb-2">
            Round {room.state.round}/{room.state.settings?.rounds || 3}
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
                  <span className="font-mono tracking-wider text-base">
                    {maskedWord}
                  </span>{" "}
                  <span className="text-xs">({maskedWord.length} letters)</span>
                </div>
              </div>
            )}
          </div>
          <div className="text-center text-xl bg-gray-700 p-2 rounded-md flex justify-between items-center">
            <span>Time:</span>
            <span
              className={`font-bold ${
                time < 10 ? "text-red-400" : time < 20 ? "text-yellow-300" : ""
              }`}
            >
              {time}
            </span>
          </div>
        </div>

        {/* Player list */}
        <PlayerList players={players} room={room} isDrawing={isDrawer} />
      </div>

      {/* Drawing Grid with Word and Controls */}
      <div className="z-10 relative">
        <div className="relative">
          <Grid
            size={gridSize}
            isDrawer={isDrawer && !room.state.ended}
            currentWord={currentWord}
          />

          {/* Round and Time's Up Transition Overlay */}
          <AnimatePresence>
            {showTimeIsUpOverlay && (
              <motion.div
                className="absolute top-0 left-0 right-0 bottom-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center rounded-lg overflow-hidden"
                style={{ height: `${FIXED_GRID_SIZE}px` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="text-center px-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <div className={"text-3xl font-bold mb-4"}>Time is up!</div>

                  {
                    <div className="text-xl text-yellow-300 mb-6">
                      The word was:{" "}
                      <span className="font-bold">
                        {room.state.currentWord}
                      </span>
                    </div>
                  }
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Turn Transition Overlay - Shows when drawer changes */}
          {/* <AnimatePresence>
          {showTurnTransitionOverlay &&
            !showRoundOverlay &&
            !showGameEndOverlay &&
            !isTimeUp && (
              <motion.div
                className="absolute top-0 left-0 right-0 bottom-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center rounded-lg overflow-hidden"
                style={{ height: `${FIXED_GRID_SIZE}px` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="text-center px-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <div className="text-3xl font-bold text-white mb-4">
                    {turnTransitionMessage}
                  </div>
                  {isDrawer && currentWord && (
                    <div className="text-xl text-yellow-200 mb-6">
                      Your word is:{" "}
                      <span className="font-bold">{currentWord}</span>
                    </div>
                  )}
                  {!isDrawer && (
                    <div className="text-xl text-yellow-200 mb-6">
                      <span className="font-bold">{drawerName}</span> is
                      drawing now
                    </div>
                  )}
                  <div className="text-base text-gray-300 mt-6">
                    Get ready...
                  </div>
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence> */}

          {/* Game End Overlay with Scoreboard - Also only covers the grid */}
          {/* <AnimatePresence>
            {showGameEndOverlay && (
              <motion.div
                className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-indigo-900/90 to-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center rounded-lg overflow-hidden"
                style={{ height: `${FIXED_GRID_SIZE}px` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                <motion.div
                  className="text-center px-8 py-6 rounded-xl bg-gray-800/80 shadow-xl backdrop-blur-sm border border-indigo-500/20 max-w-[700px]"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <h2 className="text-4xl font-bold text-white mb-6">
                    Game Over!
                  </h2>
                  <div className="text-2xl text-yellow-300 mb-8">
                    Game ended
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-200">
                      Final Scores
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto px-4">
                      {sortedPlayers.map((player, index) => (
                        <div
                          key={player.sessionId}
                          className={`flex justify-between items-center p-2 rounded-md ${
                            winners.includes(player)
                              ? "bg-yellow-500/20 border border-yellow-400/30"
                              : "bg-gray-700/40"
                          } ${
                            player.sessionId === room.sessionId
                              ? "border-l-4 border-blue-500"
                              : ""
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="text-lg font-bold w-6 text-right mr-3 text-gray-400">
                              {index + 1}.
                            </div>
                            <div className="font-medium">
                              {player.name}
                              {player.sessionId === room.sessionId && (
                                <span className="ml-2 text-xs bg-blue-500/30 px-1.5 py-0.5 rounded text-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xl font-bold">
                            {player.score || 0}
                            <span className="text-xs ml-1 text-gray-400">
                              pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 mt-6">
                    Returning to lobby in a few seconds...
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence> */}
        </div>
      </div>

      {/* Chat */}
      <ChatBox />
    </div>
  );
}
