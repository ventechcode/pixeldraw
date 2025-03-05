import { Schema, type } from "@colyseus/schema";

class ChatMessage extends Schema {
    @type("string") message: string;
    @type("string") sessionId: string;  // Colyseus session ID
}

export default ChatMessage;