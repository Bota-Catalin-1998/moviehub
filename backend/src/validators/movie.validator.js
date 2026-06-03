import { z } from "zod";

export const movieSchema = z.object({
  title: z.string().min(2, "Title must have at least 2 characters"),
  genre: z.string().min(2, "Genre must have at least 2 characters"),
  releaseYear: z
    .number()
    .int("Release year must be an integer")
    .min(1888, "Release year must be at least 1888")
    .max(2100, "Release year must be at most 2100"),
  rating: z
    .number()
    .min(0, "Rating must be at least 0")
    .max(10, "Rating must be at most 10"),
  status: z.enum(["Watched", "Watchlist"]),
  description: z.string().min(5, "Description must have at least 5 characters"),
  imageUrl: z.string().optional()
});