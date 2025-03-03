import http from 'http';
import express from 'express';
import cors from "cors";
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import dotenv from 'dotenv';

dotenv.config();

import Lobby from "./MyRoom"

const app = express();
const port = Number(process.env.PORT);

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: server })
});

gameServer.define('lobby', Lobby).filterBy(['public']);
gameServer.listen(port);

console.log(`Listening on ws://localhost:${ port }`);