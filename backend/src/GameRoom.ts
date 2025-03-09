import { Client, Delayed, Room } from "@colyseus/core";
import { GameState } from "./GameState"; // adjust path if needed
import Player from "./player";

class GameRoom extends Room<GameState> {
  state = new GameState();
  public delayedInterval!: Delayed;
  // Fixed turn order based on player session IDs.
  private turnOrder: string[] = [];
  // Index into turnOrder for the current drawer.
  private currentTurnIndex: number = 0;

  onCreate(options: any) {
    this.setPrivate(!options.public);
    this.state.public = options.public;
    this.autoDispose = false;

    // Chat messages.
    this.onMessage("chat", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      this.broadcast("chat", `${player.name}: ${message}`);
    });

    // Start the game when the leader sends "start".
    this.onMessage("start", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player.leader) {
        this.state.started = true;
        this.broadcast("start");
        this.initGame();
      }
    });
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.name = options.name;
    player.sessionId = client.sessionId;
    // First player becomes leader in non‑public rooms.
    if (this.state.players.size === 0 && !options.public) {
      player.leader = true;
    }
    this.state.players.set(client.sessionId, player);
    this.broadcast("chat", `${player.name} joined the lobby!`);

    if (this.state.players.size > 1 && this.state.public) {
      console.log("Starting game in public room!");
      this.state.started = true;
      this.initGame();
    }
  }

  async onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);

    // If the leaving player was leader, assign leader role to another.
    if (player.leader && this.state.players.size > 0) {
      player.leader = false;
      const newLeader = Array.from(this.state.players.values())[0];
      newLeader.leader = true;
    }

    console.log(player.name, client.sessionId, "left the lobby!");
    this.broadcast("chat", `${player.name} left the lobby!`);

    // Allow reconnection.
    const reconnectedClient = await this.allowReconnection(client, 60);
    console.log(player.name, reconnectedClient.sessionId, "reconnected!");
    this.state.players.set(reconnectedClient.sessionId, player);
    this.broadcast("chat", `${player.name} reconnected!`);
  }

  onDispose() {
    console.log("Lobby disposed!");
  }

  initGame() {
    // Create a fixed turn order from the current players.
    this.turnOrder = Array.from(this.state.players.keys());
    // Pick a random starting index.
    this.currentTurnIndex = Math.floor(Math.random() * this.turnOrder.length);
    // Set the initial drawer.
    const startingSession = this.turnOrder[this.currentTurnIndex];

    // CHANGE: Instead of setting the drawer object, set the drawerSessionId
    this.state.drawerSessionId = startingSession;

    // Reset each player's draw flag.
    this.state.players.forEach((player) => {
      player.drawed = false;
    });

    // Initialize round and timer.
    this.state.round = 1;
    this.state.time = this.state.maxTime;
    this.state.currentWord = this.selectRandomWord();

    console.log(`Starting round ${this.state.round}`);
    console.log(
      "Initial drawer is",
      this.state.players.get(startingSession).name
    );

    this.startTurnTimer();
  }

  startTurnTimer() {
    // Ensure the clock is started.
    this.clock.start();

    // Decrement time every second.
    this.delayedInterval = this.clock.setInterval(() => {
      this.state.time--;
    }, 1000);

    // When time expires, clear the interval and advance turn.
    this.clock.setTimeout(() => {
      this.delayedInterval.clear();
      this.nextTurn();
    }, this.state.maxTime * 1000);
  }

  nextTurn() {
    // Mark current drawer as having drawn.
    const currentSession = this.turnOrder[this.currentTurnIndex];
    const currentPlayer = this.state.players.get(currentSession);
    if (currentPlayer) {
      currentPlayer.drawed = true;
      console.log(currentPlayer.name, "finished drawing");
    }

    // Check if all players in this round have drawn.
    const allDrawn = this.turnOrder.every((sessionId) => {
      const player = this.state.players.get(sessionId);
      return player && player.drawed;
    });
    if (allDrawn) {
      console.log("All players have drawn this round.");
      this.nextRound();
      return;
    }

    // Find the next player who has not drawn.
    let found = false;
    for (let i = 1; i <= this.turnOrder.length; i++) {
      // Advance index (wrap around using modulo).
      const nextIndex = (this.currentTurnIndex + i) % this.turnOrder.length;
      const candidate = this.state.players.get(this.turnOrder[nextIndex]);
      if (candidate && !candidate.drawed) {
        this.currentTurnIndex = nextIndex;
        found = true;
        break;
      }
    }
    if (!found) {
      // (Should not happen because we already checked allDrawn.)
      this.nextRound();
      return;
    }

    // Set the new drawer.
    const newSession = this.turnOrder[this.currentTurnIndex];

    // CHANGE: Instead of setting drawer object, set drawerSessionId
    this.state.drawerSessionId = newSession;

    const drawerName = this.state.players.get(newSession)?.name;
    console.log("New drawer is", drawerName || "undefined");

    // Set a new word and reset the timer.
    this.state.currentWord = this.selectRandomWord();
    this.state.time = this.state.maxTime;

    // Restart the turn timer.
    this.startTurnTimer();
  }

  nextRound() {
    // Increase round count.
    this.state.round++;

    // Check if game should end.
    if (this.state.round > this.state.maxRounds) {
      this.endGame();
      return;
    }

    console.log(`Starting round ${this.state.round}`);

    // Reset draw status for all players.
    this.state.players.forEach((player) => {
      player.drawed = false;
    });

    // Advance the turn order pointer so the new round starts with the next player.
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    const newSession = this.turnOrder[this.currentTurnIndex];

    // CHANGE: Instead of setting drawer object, set drawerSessionId
    this.state.drawerSessionId = newSession;

    const drawerName = this.state.players.get(newSession)?.name;
    console.log("New drawer is", drawerName || "undefined");

    // Reset time and choose a new word.
    this.state.time = this.state.maxTime;
    this.state.currentWord = this.selectRandomWord();

    // Start the timer for the new round.
    this.startTurnTimer();
  }

  selectRandomWord() {
    // Replace with your word selection logic.
    const words = ["apple", "banana", "carrot", "dog", "elephant"];
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  endGame() {
    this.state.ended = true;
    this.disconnect();
    console.log("Game ended!");
  }
}

export default GameRoom;
