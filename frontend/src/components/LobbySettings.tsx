import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";

import { FaLink } from "react-icons/fa";

interface LobbySettingsProps {
  leader: boolean;
}

function LobbySettings({ leader }: LobbySettingsProps) {
  const { room } = useRoom();

  const [settings, setSettings] = useState(room?.state.settings || {});

  useEffect(() => {
    if (!room || !room.state.settings) return;

    const $ = getStateCallbacks(room);

    $(room.state).listen("settings", (newSettings: any) => {
      console.log("Settings updated:", newSettings);
      setSettings({ ...newSettings });
    });
  }, [room]);

  return (
    <Card className="w-3/5 h-3/4 bg-[#526D82] z-20 border-none rounded-none text-[#DDE6ED] px-24">
      <CardHeader>
        <CardTitle className="text-xl text-center">
          Private Lobby {room?.roomId}
        </CardTitle>
        <CardDescription className="text-md text-center">
          Game Settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Number of Rounds */}
        <div className="flex flex-row items-center justify-between space-x-4 w-full">
          <label className="text-lg">Number of Rounds</label>
          <Select
            value={settings.rounds.toString()}
            onValueChange={(value: any) =>
              room?.send("set_setting", {
                key: "rounds",
                value: parseInt(value),
              })
            }
            disabled={room?.state.public || !leader}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select number of rounds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Players */}
        <div className="flex flex-row items-center justify-between space-x-4">
          <label className="text-lg">Max Players</label>
          <Select
            value={settings.maxPlayers.toString()}
            onValueChange={(value: any) =>
              room?.send("set_setting", {
                key: "maxPlayers",
                value: parseInt(value),
              })
            }
            disabled={!leader}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 11 }, (_, i) => i + 2).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Round Length */}
        <div className="flex flex-col space-y-1">
          <label className="text-lg">Round Length (seconds)</label>
          <Slider
            value={[settings.roundLength]}
            onValueChange={(value: any) =>
              room?.send("set_setting", { key: "roundLength", value: value[0] })
            }
            min={30}
            max={300}
            step={30}
            disabled={!leader}
          />
          <span className="text-md text-gray-700">
            {settings.roundLength} seconds
          </span>
        </div>

        {/* Buttons */}
        <div className="flex flex-row justify-between mt-4">
          {!room?.state.public && (
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() =>
                navigator.clipboard.writeText(
                  window.location.origin + `?join=${room?.roomId}`
                )
              }
            >
              <FaLink />
              Copy Invite Link
            </Button>
          )}
          <Button
            disabled={!leader || room?.state.players.size < 2}
            className="cursor-pointer"
            onClick={() => {
              if (leader && room?.state.players.size > 1) {
                room?.send("start");
              } else {
                alert("You need at least 2 players to start the game.");
              }
            }}
          >
            {room?.state.public
              ? "Waiting for players..."
              : leader
              ? "Start Game"
              : "Waiting for Leader..."}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default LobbySettings;
