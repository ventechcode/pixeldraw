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
    <Card className="w-3/5 h-3/4 bg-[#526D82] z-20 border-none rounded-none">
      <CardHeader>
        <CardTitle className="text-xl text-center">
          Private Lobby {room?.roomId}
        </CardTitle>
        <CardDescription className="text-sm text-center">
          Waiting...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Number of Rounds */}
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Number of Rounds</label>
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
            <SelectTrigger>
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
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Max Players</label>
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
            <SelectTrigger>
              <SelectValue placeholder="Select max players" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 9 }, (_, i) => i + 2).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Round Length */}
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Round Length (seconds)</label>
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
          <span className="text-sm text-gray-600">
            {settings.roundLength} seconds
          </span>
        </div>

        {/* Buttons */}
        <div className="flex flex-row justify-items-stretch mt-4">
          {!room?.state.public && (
            <Button variant="outline" onClick={() => console.log("Invite")}>
              Invite
            </Button>
          )}
          <Button
            disabled={!leader || room?.state.players.size < 2}
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
              : "Waiting for Leader"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default LobbySettings;
