import express from "express";
import cors from "cors";
import moviesRoutes from "./routes/movies.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import generatorRoutes from "./routes/generator.routes.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import performanceRoutes from "./routes/performance.routes.js";
import securityRoutes from "./routes/security.routes.js";
import { securityMonitorMiddleware } from "./middleware/security.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());

// IMPORTANT: trebuie să fie înainte de routes
app.use(securityMonitorMiddleware);

app.use("/movies", moviesRoutes);
app.use("/stats", statsRoutes);
app.use("/generator", generatorRoutes);
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/admin", adminRoutes);
app.use("/performance", performanceRoutes);
app.use("/security", securityRoutes);

app.get("/", (req, res) => {
  res.json({ message: "MovieHub API is running" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;