"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useRoom } from "@/hooks/useRoom";
import { BoxesContainer } from "@/components/ui/background-boxes";

export default function Home() {
  const [lobbyId, setLobbyId] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();
  const { setRoom, client } = useRoom();

  return (
    <div className="h-screen relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center">
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
      <BoxesContainer />
      <h1 className="text-center text-9xl text-white/90 z-10">PixelDraw.io</h1>
      <div className="flex flex-col space-y-4 z-10 w-1/5 mt-8">
        <Input
          type="text"
          className="bg-slate-700 border-0 text-white h-11 text-center"
          placeholder="Enter your name"
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="text"
          className="bg-slate-700 border-0 text-white text-center"
          placeholder="Enter room ID (optional)"
          onChange={(e) => setLobbyId(e.target.value)}
        />
        <Button
          className="bg-[#a6e3a1] hover:bg-[#a6e3a1]/90 hover:cursor-pointer h-11 font-semibold text-xl"
          onClick={async () => {
            if (!name) {
              alert("Please enter your name");
              return;
            }
            try {
              let room;
              if (lobbyId) {
                // Private Lobby beitreten
                room = await client.joinById(lobbyId, {
                  name,
                  public: false,
                });
              } else {
                // Öffentliche Lobby beitreten oder erstellen
                room = await client.joinOrCreate("room", {
                  name,
                  public: true,
                });
              }
              // Speichere den Raum im Context
              setRoom(room);
              router.push(`/lobby`);
            } catch (e) {
              console.error("join error", e);
            }
          }}
        >
          Play!
        </Button>
        <Button
          className="bg-[#89b4fa] hover:bg-[#89b4fa]/90 hover:cursor-pointer font-semibold"
          onClick={async () => {
            if (!name) {
              alert("Please enter your name");
              return;
            }
            try {
              const room = await client.create("room", {
                name,
                public: false,
              });
              setRoom(room);
              router.push(`/lobby`);
            } catch (e) {
              console.error("join error", e);
            }
          }}
        >
          Create Private Room
        </Button>
      </div>
    </div>
  );
}
