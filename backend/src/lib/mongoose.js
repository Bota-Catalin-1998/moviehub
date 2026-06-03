import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectMongo() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MongoDB connection failed: MONGODB_URI is missing");
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4
    });

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}