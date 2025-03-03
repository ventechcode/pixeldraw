import { Schema, type } from "@colyseus/schema";

class Player extends Schema {
    @type("string") name: string;
    @type("string") sessionId: string;  // Colyseus session ID
    @type("boolean") leader: boolean = false;
}

export default Player;