import { Client, Delayed, Room } from "@colyseus/core";
import { GameState } from "./GameState"; // adjust path if needed
import Player from "./player";
import { Node } from "./Node";
import { Settings } from "./Settings";

class GameRoom extends Room<GameState> {
  state = new GameState();
  public delayedInterval!: Delayed;
  // Fixed turn order based on player session IDs.
  private turnOrder: string[] = [];
  // Index into turnOrder for the current drawer.
  private currentTurnIndex: number = 0;

  onCreate(options: any) {
    // Initialize state with options
    this.setPrivate(!options.public);
    this.state.public = options.public;
    this.autoDispose = true;
    this.maxClients = this.state.settings.maxPlayers;

    // Chat messages
    this.onMessage("chat", (client, message) => {
      const player = this.state.players.get(client.sessionId);

      if (
        message.toLowerCase() == this.state.currentWord.toLowerCase() &&
        client.sessionId != this.state.drawerSessionId
      ) {
        player.guessed = true;
        this.state.chatMessages.push(player.name + " guessed the word!");
      } else {
        this.state.chatMessages.push(player.name + ": " + message);
      }
    });

    // Start the game when the leader sends start command
    this.onMessage("start", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player.leader && this.state.players.size > 1) {
        this.state.started = true;
        this.initGame();
      }
    });

    // Handle drawing event
    this.onMessage("draw", (client, message) => {
      if (client.sessionId == this.state.drawerSessionId) {
        this.state.board[message.index] = new Node(
          message.color,
          message.index
        );
      }
    });

    // Handle setting change
    this.onMessage("set_setting", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (this.state.public || !player?.leader || this.state.started) {
        return; // Only leader in private lobbies can change settings before start
      }
      const { key, value } = message;
      const newSettings = new Settings().assign(this.state.settings);
      if (key in newSettings) {
        newSettings[key] = value;
        this.state.settings = newSettings; // Assign the new settings object
        if (key === "maxPlayers") {
          this.maxClients = value;
        }
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
    this.state.chatMessages.push(`${player.name} joined.`);

    if (this.state.players.size > 1 && this.state.public) {
      this.state.started = true;
      this.initGame();
    }
  }

  async onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);

    // If the leaving player was leader, assign leader role to another. (maybe randomize this?)
    if (player.leader && this.state.players.size > 0) {
      player.leader = false;
      const newLeader = Array.from(this.state.players.values())[0];
      newLeader.leader = true;
    }

    console.log(player.name, client.sessionId, "left the lobby!");
    this.state.chatMessages.push(`${player.name} left.`);

    // Allow reconnection.
    const reconnectedClient = await this.allowReconnection(client, 60);
    console.log(player.name, reconnectedClient.sessionId, "reconnected!");
    this.state.players.set(reconnectedClient.sessionId, player);
    this.state.chatMessages.push(`${player.name} reconnected.`);
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

    // Empty chat
    this.state.chatMessages.clear();

    // Initialize round and timer.
    this.state.round = 1;
    this.state.time = this.state.settings.roundLength;
    this.state.currentWord = this.selectRandomWord();

    console.log(`Starting round ${this.state.round}`);
    console.log(
      "Initial drawer is",
      this.state.players.get(startingSession).name
    );

    this.state.chatMessages.push(`Starting round ${this.state.round}`);
    this.state.chatMessages.push(
      this.state.players.get(startingSession).name + " is drawing!"
    );

    this.startTurnTimer();
  }

  startTurnTimer() {
    // Ensure the clock is started.
    this.clock.start();

    // When time expires, clear the interval and advance turn.
    this.clock.setTimeout(() => {
      this.delayedInterval.clear();
      this.nextTurn();
    }, (this.state.settings.roundLength + 1) * 1000);

    // Decrement time every second.
    this.delayedInterval = this.clock.setInterval(() => {
      this.state.time--;
    }, 1000);
  }

  nextTurn() {
    // Mark current drawer as having drawn.
    const currentSession = this.turnOrder[this.currentTurnIndex];
    const currentPlayer = this.state.players.get(currentSession);
    if (currentPlayer) {
      currentPlayer.drawed = true;
      console.log(currentPlayer.name, "finished drawing");
    }

    // Reset game board
    this.state.board.forEach((node) => {
      node.color = "bg-transparent";
    });

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
    this.state.chatMessages.push(`${drawerName} is drawing!`);

    // Set a new word and reset the timer.
    this.state.currentWord = this.selectRandomWord();
    this.state.time = this.state.settings.roundLength;

    // Restart the turn timer.
    this.startTurnTimer();
  }

  nextRound() {
    // Increase round count.
    this.state.round++;

    // Check if game should end.
    if (this.state.round > this.state.settings.rounds) {
      this.endGame();
      return;
    }

    console.log(`Starting round ${this.state.round}`);
    this.state.chatMessages.push(`Starting round ${this.state.round}`);

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
    this.state.chatMessages.push(`${drawerName} is drawing!`);

    // Reset time and choose a new word.
    this.state.time = this.state.settings.roundLength;
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
    this.state.chatMessages.push("Game ended.");
    this.state.chatMessages.push("Room will close soon, thanks for playing!");

    // Set a 5-minute timer before disconnecting all clients.
    this.clock.setTimeout(() => {
      this.state.ended = true;
      this.disconnect();
    }, 60000 * 5);
  }
}

export default GameRoom;
