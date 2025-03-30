"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { useRoom } from "@/hooks/useRoom";
import { getStateCallbacks } from "colyseus.js";

export default function ChatBox() {
  const [messages, setMessages] = useState<any>([]);
  const [message, setMessage] = useState("");
  const { room } = useRoom();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (room && message.trim()) {
      // Don't allow guessing when drawer or if the game has ended
      if (room.state.drawerSessionId === room.sessionId || room.state.ended) {
        console.log("Sending regular chat message (as drawer)");
        room.send("chat", message.trim());
      } else {
        // For guessers, this might be a guess or regular chat message
        console.log("Sending potential guess:", message.trim());
        room.send("chat", message.trim());
      }
      setMessage("");
    }
  };

  useEffect(() => {
    if (room) {
      if (room.state.chatMessages) setMessages(room.state.chatMessages);

      const $ = getStateCallbacks(room);

      $(room.state).chatMessages.onChange(() => {
        setMessages([...room.state.chatMessages]);
      });
    }
  }, [room]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 10);
      }
    }
  }, [messages]);

  // Function to get message style based on type
  const getMessageStyle = (msg: any) => {
    // Default styles
    let bgColor = "bg-[#9DB2BF]";
    let textColor = "text-black";

    // System messages with types
    if (msg.sessionId === "system") {
      switch (msg.type) {
        case "success":
          bgColor = "bg-green-500";
          textColor = "text-white font-medium";
          break;
        case "warning":
          bgColor = "bg-amber-500";
          textColor = "text-white font-medium";
          break;
        case "info":
          bgColor = "bg-blue-500";
          textColor = "text-white";
          break;
        default:
          bgColor = "bg-gray-500";
          textColor = "text-white";
      }
    }

    return `${bgColor} px-3 py-2 rounded-lg break-words ${textColor}`;
  };

  return (
    <div className="w-1/5 h-3/4 flex flex-col z-10 bg-[#27374D] rounded-lg overflow-hidden shadow-lg">
      <div className="bg-[#1F2937] py-2 px-4 text-center font-semibold flex-shrink-0">
        <h2>Chat</h2>
      </div>
      <div className="relative flex-grow overflow-hidden">
        <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
          <div
            className="sticky top-0 left-0 right-0 h-4 z-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(39, 55, 77, 0) 0%, rgba(39, 55, 77, 1) 100%)",
            }}
            aria-hidden="true"
          ></div>
          <div className="p-4 space-y-3 min-h-full flex flex-col justify-end">
            {messages.map((msg: any, i: any) => (
              <div key={i} className="flex items-start">
                <div
                  className={getMessageStyle(msg)}
                  style={{
                    wordBreak: "break-word",
                    hyphens: "auto",
                    width: "fit-content",
                    maxWidth: "100%",
                  }}
                >
                  {msg.sessionId === "system" ? (
                    <p>{msg.message}</p>
                  ) : room?.state.players.get(room.sessionId)?.guessed ||
                    room?.sessionId === room?.state.drawerSessionId ? (
                    room?.state.players.get(msg.sessionId)?.guessed ? (
                      <p className="text-green-700">{msg.message}</p>
                    ) : (
                      <p>{msg.message}</p>
                    )
                  ) : room?.state.players.get(msg.sessionId)?.guessed ? null : (
                    <p>{msg.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="p-2 bg-[#1F2937] border-t border-gray-700 flex-shrink-0 shadow-lg">
        <Input
          className="h-12 text-base font-medium border-2 border-[#526D82] rounded-md focus-visible:ring-offset-0 focus-visible:ring-0"
          placeholder="Type your guess here..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          onChange={(e) => setMessage(e.target.value)}
          value={message}
        />
      </div>
    </div>
  );
}
