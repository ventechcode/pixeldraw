"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Client, Room } from "colyseus.js";

type RoomContextType = {
  room: Room | null;
  client: Client;
  setRoom: (room: Room) => void;
  reconnect: () => Promise<void>;
};

const RoomContext = createContext<RoomContextType | null>(null);

// Generate a unique tab ID that persists across reloads (via sessionStorage)
function getTabId() {
  if (typeof window !== "undefined") {
    let tabId = sessionStorage.getItem("tabId");
    if (!tabId) {
      tabId = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("tabId", tabId);
    }
    return tabId;
  }
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const client = new Client(process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT);
  const tabId = getTabId();

  // When a room is set, store both sessionId and reconnectionToken in localStorage.
  useEffect(() => {
    if (room && room.sessionId) {
      const reconnectionData = {
        sessionId: room.sessionId,
        reconnectionToken: room.reconnectionToken,
      };
      localStorage.setItem(
        `reconnectionData_${tabId}`,
        JSON.stringify(reconnectionData)
      );
    }
  }, [room, tabId]);

  // When the component unmounts, you might want to remove the reconnection data.
  useEffect(() => {
    return () => {
      localStorage.removeItem(`reconnectionData_${tabId}`);
    };
  }, [tabId]);

  async function reconnect() {
    // Retrieve stored reconnection data from localStorage using the tab-specific key.
    const storedData = localStorage.getItem(`reconnectionData_${tabId}`);
    if (!storedData) {
      console.error("No reconnection data found");
      return;
    }
    const { reconnectionToken } = JSON.parse(storedData);
    if (!reconnectionToken) {
      console.error("Reconnection token not available");
      return;
    }
    try {
      const tmp = await client.reconnect(reconnectionToken);
      setRoom(tmp);
    } catch (e) {
      console.error("reconnect error", e);
    }
  }

  return (
    <RoomContext.Provider value={{ room, client, setRoom, reconnect }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}
