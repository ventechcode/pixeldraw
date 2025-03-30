import { Room } from "colyseus.js";
import { AnimatedList } from "@/components/magicui/animated-list";

export default function PlayerList({
  players,
  room,
  isDrawing,
}: {
  players: Map<string, any>;
  room: Room;
  isDrawing: boolean;
}) {
  return (
    <div className="bg-[#27374D] shadow-lg h-full w-full rounded-lg overflow-hidden">
      <div className="bg-[#1F2937] py-2 px-4 text-center font-semibold">
        <h2>Players</h2>
      </div>
      <AnimatedList className="w-full gap-0 py-4" delay={0.1}>
        {Array.from(players?.values() || []).map((player, i) => (
          <div
            key={i}
            className={`flex flex-col px-4 py-3 w-full transition-colors duration-300 ${
              player?.guessed && room.state.started
                ? "bg-green-600/30 border-l-4 border-green-500"
                : ""
            }`}
          >
            <div className="flex justify-between items-center w-full">
              {/* Player name and icons */}
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-lg">{player?.leader ? "👑" : "👤"}</span>
                <span className="font-medium truncate max-w-[130px]">
                  {player?.name}
                </span>
                {player?.sessionId === room.sessionId && (
                  <span className="text-xs bg-blue-400/30 px-1.5 py-0.5 rounded-full text-blue-200">
                    You
                  </span>
                )}
              </div>

              {/* Score */}
              {room.state.started && (
                <div className="flex items-center ml-2">
                  <span className="font-bold text-lg">
                    {player?.score || 0}
                  </span>
                  <span className="text-xs ml-1 text-gray-300">pts</span>
                </div>
              )}
            </div>

            {/* Status indicators */}
            {(room.state.drawerSessionId === player?.sessionId ||
              player?.guessed) &&
              room.state.started && (
                <div className="mt-1.5 flex">
                  {room.state.drawerSessionId === player?.sessionId ? (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full inline-flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Drawing
                    </span>
                  ) : (
                    player?.guessed && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full inline-flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Guessed
                      </span>
                    )
                  )}
                </div>
              )}
          </div>
        ))}
      </AnimatedList>
    </div>
  );
}
