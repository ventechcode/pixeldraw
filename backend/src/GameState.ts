import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import Player from "./player";
import { Node } from "./Node";

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Node]) board = new ArraySchema<Node>();
  @type(["string"]) chatMessages = new ArraySchema<string>();

  @type("boolean") public: boolean = true;
  @type("string") currentWord: string = "Test";
  @type("string") drawerSessionId: string = "";
  @type("number") round: number = 1;
  @type("number") maxRounds: number = 3;
  @type("number") maxTime: number = 60;
  @type("number") time: number = this.maxTime;
  @type("boolean") started: boolean = false;
  @type("boolean") ended: boolean = false;

  constructor() {
    super();
    const totalNodes = 32 * 32;
    for (let i = 0; i < totalNodes; i++) {
      this.board.push(new Node("bg-transparent", i));
    }
  }
}
