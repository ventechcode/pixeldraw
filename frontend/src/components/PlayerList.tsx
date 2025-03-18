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
      <AnimatedList className="w-full gap-0 py-4" delay={0.1}>
        {Array.from(players?.values() || []).map((player, i) => (
          <div
            key={i}
            className="flex flex-row justify-between px-4 py-2 w-full"
          >
            <h1>
              {player.leader ? "👑 " : "👤 "}
              {player.name}
              {player.sessionId === room.sessionId ? " (You)" : ""}
              {room.state.drawerSessionId === player.sessionId &&
              room.state.started
                ? " ✏️"
                : ""}
            </h1>
            <h1>{room.state.started ? player.score + "P" : ""}</h1>
          </div>
        ))}
      </AnimatedList>
    </div>
  );
}
