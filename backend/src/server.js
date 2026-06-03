import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import app from "./app.js";
import { setWss } from "./ws.js";
import { connectMongo } from "./lib/mongoose.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "../certs/server.key")),
  cert: fs.readFileSync(path.join(__dirname, "../certs/server.cert"))
};

const server = https.createServer(sslOptions, app);
const wss = new WebSocketServer({ server });

setWss(wss);

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

const PORT = 3000;

async function startServer() {
  await connectMongo();

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on https://localhost:${PORT}`);
  });
}

startServer();