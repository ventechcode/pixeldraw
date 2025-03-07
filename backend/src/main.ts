import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import dotenv from "dotenv";

import { matchMaker } from "@colyseus/core";

import GameRoom from "./GameRoom";

matchMaker.controller.getCorsHeaders = function (req) {
  const allowedOrigins = [
    "https://pixeldraw-chi.vercel.app",
    "https://pixeldrawio-git-main-lukas-projects-5c5eed09.vercel.app",
    "https://pixeldraw-n0eipjitj-lukas-projects-5c5eed09.vercel.app",
    "https://pixeldrawio-lukas-projects-5c5eed09.vercel.app",
    "http://localhost:3000",
  ];

  const origin = req.headers.origin || ""; // Falls undefined, dann leerer String

  console.log("CORS request from origin:", origin);

  if (allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
      "X-Debug-Origin": origin || "No-Origin", // Falls undefined, dann 'No-Origin'
    };
  }

  return {
    "X-Debug-Origin": origin || "No-Origin", // Verhindert Fehler
  };
};

dotenv.config();

const app = express();
const port = Number(process.env.PORT);

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: server }),
});

gameServer.define("room", GameRoom).filterBy(["public"]);
gameServer.listen(port);

console.log(`Game server started on port ${port}`);
