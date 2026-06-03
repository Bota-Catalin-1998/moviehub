import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

let actorsStatsCache = null;
let actorsStatsCacheCreatedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

function measureStart() {
  return process.hrtime.bigint();
}

function measureEnd(start) {
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000;
}

router.get("/actors-naive", authenticateToken, async (req, res) => {
  const start = measureStart();

  try {
    const actors = await prisma.actor.findMany({
      take: 1000
    });

    const result = [];

    for (const actor of actors) {
      const relations = await prisma.movieActor.findMany({
        where: {
          actorId: actor.id
        },
        include: {
          movie: true
        }
      });

      const movies = relations.map((relation) => relation.movie);

      const movieCount = movies.length;

      const averageRating =
        movieCount === 0
          ? 0
          : movies.reduce((sum, movie) => sum + movie.rating, 0) / movieCount;

      const genres = new Set(movies.map((movie) => movie.genre));

      result.push({
        actorId: actor.id,
        actorName: actor.name,
        country: actor.country,
        movieCount,
        averageRating: Number(averageRating.toFixed(2)),
        genreCount: genres.size
      });
    }

    result.sort((a, b) => {
      if (b.movieCount !== a.movieCount) {
        return b.movieCount - a.movieCount;
      }

      return b.averageRating - a.averageRating;
    });

    const durationMs = measureEnd(start);

    res.json({
      mode: "naive",
      durationMs,
      count: result.length,
      topActors: result.slice(0, 20)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not compute naive actor statistics"
    });
  }
});

router.get("/actors-optimized", authenticateToken, async (req, res) => {
  const start = measureStart();

  try {
    const now = Date.now();

    if (actorsStatsCache && now - actorsStatsCacheCreatedAt < CACHE_TTL_MS) {
      const durationMs = measureEnd(start);

      return res.json({
        mode: "optimized-cache-hit",
        durationMs,
        count: actorsStatsCache.length,
        topActors: actorsStatsCache.slice(0, 20)
      });
    }

    const relations = await prisma.movieActor.findMany({
      include: {
        actor: true,
        movie: true
      }
    });

    const statsByActor = new Map();

    for (const relation of relations) {
      const actor = relation.actor;
      const movie = relation.movie;

      if (!statsByActor.has(actor.id)) {
        statsByActor.set(actor.id, {
          actorId: actor.id,
          actorName: actor.name,
          country: actor.country,
          movieCount: 0,
          ratingSum: 0,
          genres: new Set()
        });
      }

      const stats = statsByActor.get(actor.id);
      stats.movieCount += 1;
      stats.ratingSum += movie.rating;
      stats.genres.add(movie.genre);
    }

    const result = Array.from(statsByActor.values()).map((stats) => ({
      actorId: stats.actorId,
      actorName: stats.actorName,
      country: stats.country,
      movieCount: stats.movieCount,
      averageRating:
        stats.movieCount === 0
          ? 0
          : Number((stats.ratingSum / stats.movieCount).toFixed(2)),
      genreCount: stats.genres.size
    }));

    result.sort((a, b) => {
      if (b.movieCount !== a.movieCount) {
        return b.movieCount - a.movieCount;
      }

      return b.averageRating - a.averageRating;
    });

    actorsStatsCache = result;
    actorsStatsCacheCreatedAt = now;

    const durationMs = measureEnd(start);

    res.json({
      mode: "optimized-cache-miss",
      durationMs,
      count: result.length,
      topActors: result.slice(0, 20)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not compute optimized actor statistics"
    });
  }
});

router.post("/clear-cache", authenticateToken, (req, res) => {
  actorsStatsCache = null;
  actorsStatsCacheCreatedAt = 0;

  res.json({
    message: "Performance cache cleared"
  });
});

export default router;