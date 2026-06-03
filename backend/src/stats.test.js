import request from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import app from "./app.js";
import prisma from "./lib/prisma.js";

describe("Stats API", () => {
  beforeEach(async () => {
    await prisma.movie.deleteMany();

    await prisma.movie.createMany({
      data: [
        {
          title: "Inception",
          genre: "Sci-Fi",
          releaseYear: 2010,
          rating: 8.8,
          status: "Watched",
          description: "A mind-bending thriller",
          imageUrl: ""
        },
        {
          title: "Interstellar",
          genre: "Sci-Fi",
          releaseYear: 2014,
          rating: 8.6,
          status: "Watchlist",
          description: "Space exploration and time",
          imageUrl: ""
        },
        {
          title: "Gladiator",
          genre: "Action",
          releaseYear: 2000,
          rating: 8.5,
          status: "Watched",
          description: "A Roman general seeks revenge",
          imageUrl: ""
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.movie.deleteMany();
    await prisma.$disconnect();
  });

  it("should return movie stats", async () => {
    const response = await request(app).get("/stats");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("totalMovies", 3);
    expect(response.body).toHaveProperty("watchedCount", 2);
    expect(response.body).toHaveProperty("watchlistCount", 1);
    expect(response.body).toHaveProperty("genresCount");
    expect(response.body.genresCount).toHaveProperty("Sci-Fi", 2);
    expect(response.body.genresCount).toHaveProperty("Action", 1);
  });
});