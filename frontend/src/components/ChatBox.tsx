import { div } from "framer-motion/client";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

export default function ChatBox() {
  const messages = [
    "Hello",
    "Hi",
    "How are you?",
    "I'm fine, thank you!",
    "Good to hear that!",
    "Goodbye",
    "Hello",
    "Hi",
    "How are you?",
    "I'm fine, thank you!",
    "Good to hear that!",
    "Goodbye",
    "Hello",
    "Hi",
    "How are you?",
  ];

  return (
    <div className="w-1/5 rounded-md border h-full flex flex-col">
      <h4 className="mb-4 text-lg text-center pt-2">Chat</h4>
      <ScrollArea className="h-5/6">
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
      <Input className="mt-2 h-full" placeholder="Type your guess here..."/>
    </div>
  );
}
