import { Schema, type } from "@colyseus/schema";

class Player extends Schema {
    @type("string") name: string;
    @type("string") sessionId: string;  // Colyseus session ID
    @type("boolean") leader: boolean = false;
    @type("boolean") guessed: boolean = false;
    @type("number") score: number = 0;
    @type("boolean") drawed: boolean = false;
}

export default Player;