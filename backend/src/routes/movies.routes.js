import express from "express";
import {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie
} from "../controllers/movies.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get("/", authenticateToken, requirePermission("READ_MOVIES"), getAllMovies);
router.get("/:id", authenticateToken, requirePermission("READ_MOVIES"), getMovieById);
router.post("/", authenticateToken, requirePermission("CREATE_MOVIES"), createMovie);
router.put("/:id", authenticateToken, requirePermission("UPDATE_MOVIES"), updateMovie);
router.delete("/:id", authenticateToken, requirePermission("DELETE_MOVIES"), deleteMovie);

export default router;