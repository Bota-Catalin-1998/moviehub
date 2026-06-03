import express from "express";
import { getMovieStats } from "../controllers/stats.controller.js";

const router = express.Router();

router.get("/", getMovieStats);

export default router;