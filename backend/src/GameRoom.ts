import { Client, Delayed, Room } from "@colyseus/core";
import { GameState } from "./GameState"; // adjust path if needed
import Player from "./Player";
import { Node } from "./Node";
import { Settings } from "./Settings";
import ChatMessage from "./ChatMessage";

// Define the type for batch drawing updates
interface DrawUpdate {
  index: number;
  color: string;
}

class GameRoom extends Room<GameState> {
  state = new GameState();
  public delayedInterval!: Delayed;
  // Fixed turn order based on player session IDs.
  private turnOrder: string[] = [];
  // Index into turnOrder for the current drawer.
  private currentTurnIndex: number = 0;
  // Track whether any valid drawing has been made this round
  private hasValidDrawing: boolean = false;
  // Track how many pixels have been drawn this round
  private pixelsDrawnThisRound: number = 0;
  // Track the first person to guess correctly for bonus points
  private firstGuesser: string | null = null;

  private turnTimeoutId: Delayed | null = null; // Add this property to track the timeout

  onCreate(options: any) {
    // Initialize state with options
    this.setPrivate(!options.public);
    this.state.public = options.public;
    this.autoDispose = true;
    this.maxClients = this.state.settings.maxPlayers;

    // Chat messages
    this.onMessage("chat", (client, message) => {
      const player = this.state.players.get(client.sessionId);

      // Handle message differently if player has already guessed
      if (player.guessed) {
        // Send message to players who have guessed
        const playerName = player.name;
        const messageToSend = playerName + ": " + message;

        const chatMessage = new ChatMessage();
        chatMessage.message = messageToSend;
        chatMessage.sessionId = client.sessionId;
        this.state.chatMessages.push(chatMessage);

        return;
      }

      // Check if the message is the correct word
      if (
        message.toLowerCase() == this.state.currentWord.toLowerCase() &&
        client.sessionId != this.state.drawerSessionId &&
        this.hasValidDrawing // Only allow guessing if drawer has drawn something
      ) {
        // Player guessed correctly!
        player.guessed = true;

        // Calculate score based on remaining time and order of guessing
        const timeRemaining = this.state.time;
        const maxRoundTime = this.state.settings.roundLength;

        // Base score: 1-100 based on how quickly they guessed (percentage of time remaining)
        let scoreForGuess = Math.ceil((timeRemaining / maxRoundTime) * 100);

        // First-guesser bonus
        if (this.firstGuesser === null) {
          this.firstGuesser = client.sessionId;
          scoreForGuess += 50; // Bonus for being first

          // Also award points to the drawer when the first person guesses correctly
          const drawer = this.state.players.get(this.state.drawerSessionId);
          if (drawer) {
            drawer.score += 30; // Base points for drawer when someone guesses correctly
            // Add bonus based on how quickly someone guessed
            drawer.score += Math.ceil((timeRemaining / maxRoundTime) * 30);
          }
        }

        // Add the calculated score to the player
        player.score += scoreForGuess;

        // Create success message for chat
        const successMessage = `${player.name} guessed the word correctly! (+${scoreForGuess} points)`;
        const chatMessage = new ChatMessage();
        chatMessage.message = successMessage;
        chatMessage.sessionId = "system"; // Using system to differentiate
        chatMessage.type = "success"; // Add a type for styling
        this.state.chatMessages.push(chatMessage);

        // Check if all players (except drawer) have guessed
        const allPlayersGuessed = this.checkAllPlayersGuessed();
        if (allPlayersGuessed) {
          // Everyone has guessed - end this turn early
          const allGuessedMessage =
            "Everyone guessed the word! Moving to next turn...";
          const endTurnMessage = new ChatMessage();
          endTurnMessage.message = allGuessedMessage;
          endTurnMessage.sessionId = "system";
          endTurnMessage.type = "info";
          this.state.chatMessages.push(endTurnMessage);

          // Give drawer bonus for everyone guessing
          const drawer = this.state.players.get(this.state.drawerSessionId);
          if (drawer) {
            const perfectDrawBonus = 50;
            drawer.score += perfectDrawBonus;

            const drawerBonusMessage = `${drawer.name} gets a bonus for a perfect drawing! (+${perfectDrawBonus} points)`;
            const bonusMessage = new ChatMessage();
            bonusMessage.message = drawerBonusMessage;
            bonusMessage.sessionId = "system";
            bonusMessage.type = "info";
            this.state.chatMessages.push(bonusMessage);
          }

          // Clear any existing timers
          this.delayedInterval?.clear();
          if (this.turnTimeoutId) {
            this.turnTimeoutId.clear();
            this.turnTimeoutId = null;
          }

          this.clock.setTimeout(() => {
            this.nextTurn();
          }, 3000); // Give players 3 seconds to see the results
        }
      } else {
        // Regular chat message
        const chatMessage = new ChatMessage();
        chatMessage.message = player.name + ": " + message;
        chatMessage.sessionId = client.sessionId;
        this.state.chatMessages.push(chatMessage);
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

    // Handle drawing event (single node)
    this.onMessage("draw", (client, message) => {
      if (client.sessionId == this.state.drawerSessionId) {
        // Set the node color
        this.state.board[message.index] = new Node(
          message.color,
          message.index
        );

        // Track that drawing has happened
        if (
          !this.hasValidDrawing &&
          message.color !== "transparent" &&
          message.color !== "bg-transparent"
        ) {
          this.hasValidDrawing = true;
        }

        // Count pixels drawn if it's not an eraser action
        if (
          message.color !== "transparent" &&
          message.color !== "bg-transparent"
        ) {
          this.pixelsDrawnThisRound++;
        }
      }
    });

    // Handle batch drawing events for improved performance
    this.onMessage("draw_batch", (client, messages: DrawUpdate[]) => {
      if (
        client.sessionId == this.state.drawerSessionId &&
        Array.isArray(messages)
      ) {
        // Process each update in the batch
        messages.forEach((update) => {
          // Set the node color
          this.state.board[update.index] = new Node(update.color, update.index);

          // Track that drawing has happened (only need to set once)
          if (
            !this.hasValidDrawing &&
            update.color !== "transparent" &&
            update.color !== "bg-transparent"
          ) {
            this.hasValidDrawing = true;
          }

          // Count pixels drawn if it's not an eraser action
          if (
            update.color !== "transparent" &&
            update.color !== "bg-transparent"
          ) {
            this.pixelsDrawnThisRound++;
          }
        });
      }
    });

    // Handle clear board event
    this.onMessage("clear_board", (client) => {
      if (client.sessionId == this.state.drawerSessionId) {
        console.log("Clearing the board at server request");

        this.state.board.forEach((node) => {
          node.color = "bg-transparent";
        });

        // Send an additional event to signal the client to refresh the board
        this.broadcast("board_cleared");
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
    const chatMessage = new ChatMessage();
    chatMessage.message = player.name + " joined the game!";
    chatMessage.sessionId = client.sessionId;
    this.state.chatMessages.push(chatMessage);

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
    const chatMessage = new ChatMessage();
    chatMessage.message = player.name + " left the game!";
    chatMessage.sessionId = client.sessionId;
    this.state.chatMessages.push(chatMessage);

    // Allow reconnection.
    const reconnectedClient = await this.allowReconnection(client, 60);
    console.log(player.name, reconnectedClient.sessionId, "reconnected!");
    this.state.players.set(reconnectedClient.sessionId, player);
    const reconnectedChatMessage = new ChatMessage();
    reconnectedChatMessage.message = player.name + " reconnected!";
    reconnectedChatMessage.sessionId = reconnectedClient.sessionId;
    this.state.chatMessages.push(reconnectedChatMessage);
  }

  onDispose() {
    console.log("Lobby disposed!");
  }

  // Helper method to check if all non-drawer players have guessed
  checkAllPlayersGuessed() {
    // Skip check if less than 2 players (need at least 1 drawer + 1 guesser)
    if (this.state.players.size < 2) return false;

    let allGuessed = true;
    this.state.players.forEach((player, sessionId) => {
      // Skip the drawer from this check
      if (sessionId !== this.state.drawerSessionId) {
        // If any non-drawer hasn't guessed, not everyone has guessed
        if (!player.guessed) {
          allGuessed = false;
        }
      }
    });

    return allGuessed;
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
      player.guessed = false;
    });

    // Reset drawing track variables
    this.hasValidDrawing = false;
    this.pixelsDrawnThisRound = 0;
    this.firstGuesser = null;

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

    const startingRoundChatMessage = new ChatMessage();
    startingRoundChatMessage.message = `Starting round ${this.state.round}`;
    startingRoundChatMessage.sessionId = "system";
    this.state.chatMessages.push(startingRoundChatMessage);

    const startingDrawerChatMessage = new ChatMessage();
    startingDrawerChatMessage.message =
      this.state.players.get(startingSession).name + " is drawing!";
    startingDrawerChatMessage.sessionId = "system";
    this.state.chatMessages.push(startingDrawerChatMessage);

    // Announce the word to the drawer by updating a state property only visible to the drawer
    this.state.wordForDrawer = this.state.currentWord;

    this.startTurnTimer();
  }

  startTurnTimer() {
    // Ensure the clock is started.
    this.clock.start();

    // When time expires, clear the interval and advance turn.
    this.turnTimeoutId = this.clock.setTimeout(() => {
      this.delayedInterval.clear();

      this.broadcast("time_up");

      // Wait a moment before advancing to next turn (increased from 3 to 10 seconds)
      this.clock.setTimeout(() => {
        this.nextTurn();
      }, 5000); // Give players 10 seconds to see the results
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

    // Clear any existing timers first
    this.delayedInterval?.clear();
    if (this.turnTimeoutId) {
      this.turnTimeoutId.clear();
      this.turnTimeoutId = null;
    }

    // Reset guessed status for all players.
    this.state.players.forEach((player) => {
      player.guessed = false;
    });

    // Reset game board
    this.state.board.forEach((node) => {
      node.color = "bg-transparent";
    });

    // Reset drawing track variables
    this.hasValidDrawing = false;
    this.pixelsDrawnThisRound = 0;
    this.firstGuesser = null;

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

    const newDrawerChatMessage = new ChatMessage();
    newDrawerChatMessage.message = `${drawerName} is drawing!`;
    newDrawerChatMessage.sessionId = "system";
    this.state.chatMessages.push(newDrawerChatMessage);

    // Set the word for the drawer
    this.state.wordForDrawer = this.state.currentWord;

    // Set a new word and reset the timer.
    this.state.currentWord = this.selectRandomWord();
    this.state.time = this.state.settings.roundLength;

    // Set the word for the drawer
    this.state.wordForDrawer = this.state.currentWord;

    // Restart the turn timer with a brief delay (3 seconds) to show the overlay
    this.clock.setTimeout(() => {
      this.startTurnTimer();
    }, 1000);
  }

  nextRound() {
    // Check if game should end.
    if (this.state.round == this.state.settings.rounds) {
      this.endGame();
      return;
    } else if (this.state.round < this.state.settings.rounds) {
      this.state.round++;
    }

    // Clear any existing timers first
    this.delayedInterval?.clear();
    if (this.turnTimeoutId) {
      this.turnTimeoutId.clear();
      this.turnTimeoutId = null;
    }

    console.log(`Starting round ${this.state.round}`);

    const startingRoundChatMessage = new ChatMessage();
    startingRoundChatMessage.message = `Starting round ${this.state.round}`;
    startingRoundChatMessage.sessionId = "system";
    this.state.chatMessages.push(startingRoundChatMessage);

    // Reset status for all players.
    this.state.players.forEach((player) => {
      player.drawed = false;
      player.guessed = false;
    });

    // Reset drawing track variables
    this.hasValidDrawing = false;
    this.pixelsDrawnThisRound = 0;
    this.firstGuesser = null;

    // Advance the turn order pointer so the new round starts with the next player.
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
    const newSession = this.turnOrder[this.currentTurnIndex];

    // CHANGE: Instead of setting drawer object, set drawerSessionId
    this.state.drawerSessionId = newSession;

    const drawerName = this.state.players.get(newSession)?.name;
    console.log("New drawer is", drawerName || "undefined");

    const newDrawerChatMessage = new ChatMessage();
    newDrawerChatMessage.message = `${drawerName} is drawing!`;
    newDrawerChatMessage.sessionId = "system";
    this.state.chatMessages.push(newDrawerChatMessage);

    // Set the word for the drawer
    this.state.wordForDrawer = this.state.currentWord;

    // Reset time and choose a new word.
    this.state.time = this.state.settings.roundLength;
    this.state.currentWord = this.selectRandomWord();

    // Set the word for the drawer
    this.state.wordForDrawer = this.state.currentWord;

    // Restart the turn timer with a brief delay (5 seconds) to show the overlay
    this.clock.setTimeout(() => {
      this.startTurnTimer();
    }, 5000);
  }

  selectRandomWord() {
    // A better word list for the drawing game
    const words = [
      "apple",
      "banana",
      "car",
      "dog",
      "elephant",
      "flower",
      "giraffe",
      "house",
      "icecream",
      "jellyfish",
      "kite",
      "lion",
      "mountain",
      "notebook",
      "ocean",
      "penguin",
      "queen",
      "robot",
      "sun",
      "tree",
      "umbrella",
      "volcano",
      "whale",
      "xylophone",
      "yacht",
      "zebra",
      "airplane",
      "beach",
      "castle",
      "dragon",
      "eagle",
      "forest",
      "guitar",
      "helicopter",
      "island",
      "jungle",
      "kangaroo",
      "lighthouse",
      "moon",
      "ninja",
      "owl",
      "pirate",
      "rainbow",
      "shark",
      "tiger",
      "unicorn",
      "violin",
      "waterfall",
      "fox",
      "yeti",
      "zombie",
      "astronaut",
      "butterfly",
      "cactus",
      "dolphin",
      "egg",
      "firefighter",
      "ghost",
      "hamburger",
    ];
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  endGame() {
    // Find the winner
    let highestScore = -1;
    let winners: Player[] = [];

    this.state.players.forEach((player) => {
      if (player.score > highestScore) {
        highestScore = player.score;
        winners = [player];
      } else if (player.score === highestScore) {
        winners.push(player);
      }
    });

    // Create winner message
    let winnerMessage: string;
    if (winners.length === 1) {
      winnerMessage = `Game over! ${winners[0].name} wins with ${highestScore} points!`;
    } else {
      const winnerNames = winners.map((p) => p.name).join(" and ");
      winnerMessage = `Game over! ${winnerNames} tie for the win with ${highestScore} points!`;
    }

    const endGameChatMessage = new ChatMessage();
    endGameChatMessage.message = winnerMessage;
    endGameChatMessage.sessionId = "system";
    endGameChatMessage.type = "success";
    this.state.chatMessages.push(endGameChatMessage);

    const closingChatMessage = new ChatMessage();
    closingChatMessage.message = "Room will close soon, thanks for playing!";
    closingChatMessage.sessionId = "system";
    this.state.chatMessages.push(closingChatMessage);

    // Set a 5-minute timer before disconnecting all clients.
    this.clock.setTimeout(() => {
      this.state.ended = true;
      this.disconnect();
    }, 60000 * 5);
  }
}

export default GameRoom;
