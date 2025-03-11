import { Schema, type } from "@colyseus/schema";

export class Node extends Schema {
  @type("string")
  color: string;

  @type("number")
  index: number;

  constructor(color: string, index: number) {
    super();
    this.color = color;
    this.index = index;
  }
}
