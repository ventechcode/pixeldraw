"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { useRoom } from "@/hooks/useRoom";

export default function ChatBox() {
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const { room } = useRoom();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (room && message) {
      room.send("chat", message);
      setMessage("");
    }
  };

  useEffect(() => {
    if (room) {
      room.onMessage("chat", (message: string) => {
        console.log("Chat message received:", message);
        setMessages((prevMessages) => [...prevMessages, message]);
      });
    }
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="w-1/5 rounded-md border h-full flex flex-col">
      <h4 className="mb-4 text-lg text-center pt-2">Chat</h4>
      <ScrollArea className="h-5/6" ref={scrollAreaRef}>
        <div className="p-4 flex-grow">
          <div className="space-y-2">
            {messages.map((message, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="bg-gray-200 p-2 rounded-md">{message}</div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
      <Input
        className="mt-2 h-14"
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
  );
}
