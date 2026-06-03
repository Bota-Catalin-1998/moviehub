import prisma from "../lib/prisma.js";
import { movieSchema } from "../validators/movie.validator.js";
import { logAction } from "../utils/logAction.js";
import { checkDeleteAbuse } from "../utils/checkDeleteAbuse.js";

export const getAllMovies = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;

  const genre = req.query.genre;
  const status = req.query.status;
  const title = req.query.title;

  const skip = (page - 1) * limit;

  const where = {
    ...(genre ? { genre } : {}),
    ...(status ? { status } : {}),
    ...(title
      ? {
          title: {
            contains: title
          }
        }
      : {})
  };

  const [total, movies] = await Promise.all([
    prisma.movie.count({ where }),
    prisma.movie.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" }
    })
  ]);

  res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data: movies
  });
};

export const getMovieById = async (req, res) => {
  const id = Number(req.params.id);

  const movie = await prisma.movie.findUnique({
    where: { id }
  });

  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  res.json(movie);
};

export const createMovie = async (req, res) => {
  const validationResult = movieSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validationResult.error.issues
    });
  }

  const newMovie = await prisma.movie.create({
    data: validationResult.data
  });

  if (req.currentUser) {
    await logAction({
      userId: req.currentUser.id,
      groupId: req.currentUser.role,
      actionInformation: `CREATE_MOVIE:${newMovie.title}`
    });
  }

  res.status(201).json(newMovie);
};

export const updateMovie = async (req, res) => {
  const id = Number(req.params.id);

  const existingMovie = await prisma.movie.findUnique({
    where: { id }
  });

  if (!existingMovie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  const updatedData = {
    title: req.body.title ?? existingMovie.title,
    genre: req.body.genre ?? existingMovie.genre,
    releaseYear: req.body.releaseYear ?? existingMovie.releaseYear,
    rating: req.body.rating ?? existingMovie.rating,
    status: req.body.status ?? existingMovie.status,
    description: req.body.description ?? existingMovie.description,
    imageUrl: req.body.imageUrl ?? existingMovie.imageUrl
  };

  const validationResult = movieSchema.safeParse(updatedData);

  if (!validationResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validationResult.error.issues
    });
  }

  const updatedMovie = await prisma.movie.update({
    where: { id },
    data: validationResult.data
  });

  if (req.currentUser) {
    await logAction({
      userId: req.currentUser.id,
      groupId: req.currentUser.role,
      actionInformation: `UPDATE_MOVIE:${updatedMovie.title}`
    });
  }

  res.json(updatedMovie);
};

export const deleteMovie = async (req, res) => {
  const id = Number(req.params.id);

  const existingMovie = await prisma.movie.findUnique({
    where: { id }
  });

  if (!existingMovie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  const deletedMovie = await prisma.movie.delete({
    where: { id }
  });

  if (req.currentUser) {
    await logAction({
      userId: req.currentUser.id,
      groupId: req.currentUser.role,
      actionInformation: `DELETE_MOVIE:${deletedMovie.title}`
    });

    await checkDeleteAbuse(req.currentUser.id);
  }

  res.json(deletedMovie);
};