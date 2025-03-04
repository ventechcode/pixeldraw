import http from 'http';
import express from 'express';
import cors from "cors";
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import dotenv from 'dotenv';

import { matchMaker } from "@colyseus/core";
 
matchMaker.controller.getCorsHeaders = function(req) {
  const allowedOrigins = ['https://pixeldraw-chi.vercel.app', 'http://localhost:3000'];
  const origin = req.headers.origin;
  console.log("CORS request from origin:", origin);
  
  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Vary': '*'
    };
  }
  
  // Optionally, if the origin is not allowed, you can return an empty object or an error.
  return {};
};

dotenv.config();

import Lobby from "./MyRoom"

const app = express();
const port = Number(process.env.PORT);

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: server }),
});

gameServer.define('lobby', Lobby).filterBy(['public']);
gameServer.listen(port);

console.log(`Game server started on port ${port}`);