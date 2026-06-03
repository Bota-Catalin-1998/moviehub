import "dotenv/config";
import http from "http";
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

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

let server;

if (isProduction) {
  server = http.createServer(app);
} else {
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "../certs/server.key")),
    cert: fs.readFileSync(path.join(__dirname, "../certs/server.cert"))
  };

  server = https.createServer(sslOptions, app);
}

const wss = new WebSocketServer({ server });

setWss(wss);

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

async function startServer() {
  await connectMongo();

  server.listen(PORT, "0.0.0.0", () => {
    const protocol = isProduction ? "http" : "https";
    console.log(`Server running on ${protocol}://localhost:${PORT}`);
  });
}

startServer();