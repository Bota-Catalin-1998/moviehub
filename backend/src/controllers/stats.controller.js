import prisma from "../lib/prisma.js";

export const getMovieStats = async (req, res) => {
  const totalMovies = await prisma.movie.count();

  const avgResult = await prisma.movie.aggregate({
    _avg: {
      rating: true
    }
  });

  const watchedCount = await prisma.movie.count({
    where: { status: "Watched" }
  });

  const watchlistCount = await prisma.movie.count({
    where: { status: "Watchlist" }
  });

  const genres = await prisma.movie.groupBy({
    by: ["genre"],
    _count: {
      genre: true
    }
  });

  const genresCount = {};
  for (const item of genres) {
    genresCount[item.genre] = item._count.genre;
  }

  res.json({
    totalMovies,
    averageRating: Number((avgResult._avg.rating || 0).toFixed(2)),
    watchedCount,
    watchlistCount,
    genresCount
  });
};