import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import Player from "./Player";
import { Node } from "./Node";
import { Settings } from "./Settings"; // Assuming saved in Settings.ts
import ChatMessage from "./ChatMessage";

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Node]) board = new ArraySchema<Node>();
  @type([ChatMessage]) chatMessages = new ArraySchema<ChatMessage>();
  @type(Settings) settings = new Settings(); // New settings object

  @type("boolean") public: boolean = true;
  @type("string") currentWord: string = "Test";
  @type("string") wordForDrawer: string = ""; // Word visible only to the drawer
  @type("string") drawerSessionId: string = "";
  @type("number") round: number = 1;
  @type("number") time: number = this.settings.roundLength; // Updated reference
  @type("boolean") started: boolean = false;
  @type("boolean") ended: boolean = false;

  constructor() {
    super();
    const totalNodes = 32 * 32;
    for (let i = 0; i < totalNodes; i++) {
      this.board.push(new Node("bg-transparent", i));
    }
    this.time = this.settings.roundLength; // Ensure time initializes correctly
  }
}
