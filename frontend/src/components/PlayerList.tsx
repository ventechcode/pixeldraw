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
    <div className="bg-[#27374D] shadow-lg h-full w-full">
      <AnimatedList className="w-full">
        {Array.from(players?.values() || []).map((player, i) => (
          <div
            key={i}
            className="flex flex-row justify-between border p-4 w-full"
          >
            <h1>
              {player.leader ? "👑 " : ""}
              {player.name}
            </h1>
            <h1>{room.state.started ? "Score: " + player.score : ""}</h1>
          </div>
        ))}
      </AnimatedList>
    </div>
  );
}
