import { Schema, type } from "@colyseus/schema";

export class Settings extends Schema {
  @type("number") rounds: number = 3;
  @type("number") roundLength: number = 60;
  @type("number") maxPlayers: number = 10;
  @type("string") gameMode: string = "Normal";
  @type("number") gridSize: number = 32;
}
