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
import { Input } from "@/components/ui/input";

import { FaLink } from "react-icons/fa";

interface LobbySettingsProps {
  leader: boolean;
}

function LobbySettings({ leader }: LobbySettingsProps) {
  const { room } = useRoom();

  const [settings, setSettings] = useState(room?.state.settings || {});
  const [customGridSize, setCustomGridSize] = useState<string>("");
  const [isCustomGridSize, setIsCustomGridSize] = useState<boolean>(false);

  useEffect(() => {
    if (!room || !room.state.settings) return;

    const $ = getStateCallbacks(room);

    $(room.state).listen("settings", (newSettings: any) => {
      console.log("Settings updated:", newSettings);
      setSettings({ ...newSettings });
      setIsCustomGridSize(![16, 32, 64].includes(newSettings.gridSize));
      setCustomGridSize(
        ![16, 32, 64].includes(newSettings.gridSize)
          ? newSettings.gridSize.toString()
          : ""
      );
    });
  }, [room]);

  // Handle custom grid size input
  const handleCustomGridSize = (value: string) => {
    // Only allow numeric input
    if (!/^\d*$/.test(value)) return;

    setCustomGridSize(value);

    // Update the grid size if it's valid
    const size = parseInt(value);
    if (size >= 10 && size <= 128) {
      room?.send("set_setting", {
        key: "gridSize",
        value: size,
      });
    }
  };

  // Handle grid size select change
  const handleGridSizeChange = (value: string) => {
    if (value === "custom") {
      setIsCustomGridSize(true);
      // If we already have a grid size that's not 16, 32, or 64, keep it
      if (![16, 32, 64].includes(settings.gridSize)) {
        setCustomGridSize(settings.gridSize.toString());
      } else {
        setCustomGridSize("");
      }
    } else {
      setIsCustomGridSize(false);
      room?.send("set_setting", {
        key: "gridSize",
        value: parseInt(value),
      });
    }
  };

  return (
    <Card className="w-3/5 h-3/4 bg-[#526D82] z-20 border-none text-[#DDE6ED] px-24 rounded-md">
      <CardHeader>
        <CardTitle className="text-xl text-center">
          {room?.state.public ? "Public Lobby" : "Private Lobby"}
        </CardTitle>
        <CardDescription className="text-md text-center text-[#DDE6ED]/90">
          {room?.state.public
            ? "Anyone can join. Waiting for players..."
            : "Players can join via room ID"}
        </CardDescription>
        <CardDescription className="text-md text-center text-gray-400 mt-8">
          {room?.state.public ? "Default Settings" : "Custom Settings"}
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
            <SelectTrigger className="w-36">
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

        {/* Grid Size */}
        <div className="flex flex-row items-center justify-between space-x-4 w-full">
          <label className="text-lg">Grid Size</label>
          <div className="flex items-center space-x-2">
            <Select
              value={
                isCustomGridSize ? "custom" : settings.gridSize?.toString()
              }
              onValueChange={handleGridSizeChange}
              disabled={!leader}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Select grid size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16">16 x 16</SelectItem>
                <SelectItem value="32">32 x 32</SelectItem>
                <SelectItem value="64">64 x 64</SelectItem>
                <SelectItem value="custom">Custom...</SelectItem>
              </SelectContent>
            </Select>

            {isCustomGridSize && (
              <Input
                type="text"
                placeholder="10-128"
                className="w-24 bg-[#627991] border-none text-white"
                value={customGridSize}
                onChange={(e) => handleCustomGridSize(e.target.value)}
                min={10}
                max={128}
                disabled={!leader}
              />
            )}
          </div>
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
            <SelectTrigger className="w-36">
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
            min={15}
            max={240}
            step={15}
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
              className="cursor-pointer text-black hover:text-black/80"
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
            className="cursor-pointer bg-[#a6e3a1] hover:bg-[#a6e3a1]/90 "
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
