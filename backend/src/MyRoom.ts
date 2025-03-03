import { Client, Room } from "@colyseus/core";
import { LobbyState } from "./LobbyState"; // Pfad anpassen
import Player from "./player";

class MyRoom extends Room<LobbyState> {
  state = new LobbyState();

  onCreate(options: any) {
    this.setPrivate(!options.public);
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.name = options.name;
    player.sessionId = client.sessionId;
    if (this.state.players.size === 0 && !options.public) {
      player.leader = true;
    }
    this.state.players.set(client.sessionId, player);
    console.log(options.name, "joined the lobby!");
  }

  async onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);

    // If the player was the leader, assign the leader role to the next player (maybe randomize this?)
    if (player.leader && this.state.players.size > 0) {
      player.leader = false;
      const newLeader = Array.from(this.state.players.values())[0];
      newLeader.leader = true;
    }

    console.log(player.name, client.sessionId, "left the lobby!");

    const reconnectedClient = await this.allowReconnection(client, 60);
    console.log(player.name, reconnectedClient.sessionId, "reconnected!");
    this.state.players.set(reconnectedClient.sessionId, player);
  }

  onDispose() {
    console.log("Lobby disposed!");
  }
}

export default MyRoom;
