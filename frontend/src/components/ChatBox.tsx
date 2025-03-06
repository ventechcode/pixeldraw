"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { useRoom } from "@/hooks/useRoom"

export default function ChatBox() {
  const [messages, setMessages] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const { room } = useRoom()

  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const sendMessage = () => {
    if (room && message) {
      room.send("chat", message)
      setMessage("")
    }
  }

  useEffect(() => {
    if (room) {
      room.onMessage("chat", (message: string) => {
        console.log("Chat message received:", message)
        setMessages((prevMessages) => [...prevMessages, message])
      })
    }
  }, [room])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  return (
    <div className="w-1/5 rounded-md border h-full flex flex-col">
      <h4 className="mb-4 text-lg text-center pt-2">Chat</h4>
      <ScrollArea className="h-5/6" ref={scrollAreaRef}>
        <div
          className="absolute left-0 right-0 h-8 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
          }}
          aria-hidden="true"
        ></div>
        <div className="p-4 flex-grow">
          <div className="space-y-3">
            {messages.map((message, i) => (
              <div key={i} className="flex items-start">
                <div
                  className="bg-gray-200 p-3 rounded-lg break-words"
                  style={{
                    wordBreak: "break-word",
                    hyphens: "auto",
                    width: "fit-content",
                    maxWidth: "100%",
                  }}
                >
                  {message}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-8 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
          }}
          aria-hidden="true"
        ></div>
      </ScrollArea>
      <Input
        className="mt-2 h-14"
        placeholder="Type your guess here..."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage()
          }
        }}
        onChange={(e) => setMessage(e.target.value)}
        value={message}
      />
    </div>
  )
}

