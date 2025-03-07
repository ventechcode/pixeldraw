import { Schema, type, MapSchema } from "@colyseus/schema";
import Player from "./player";

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: "string" }) chatMessages = new MapSchema<string>();
  @type("boolean") public: boolean = true;
  @type("string") currentWord: string = "Test";
  @type(Player) drawer: Player = new Player();
  @type("string") drawerSessionId: string = "";
  @type("number") round: number = 1;
  @type("number") maxRounds: number = 3;
  @type("number") maxTime: number = 15;
  @type("number") time: number = this.maxTime;
  @type("boolean") started: boolean = false;
  @type("boolean") ended: boolean = false;
}