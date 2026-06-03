import { movies } from "../data/movies.memory.js";
import { getWss } from "../ws.js";

let intervalId = null;

function generateRandomMovie() {
  const titles = ["Avatar", "Titanic", "Matrix", "Gladiator", "Batman"];
  const genres = ["Action", "Drama", "Sci-Fi", "Comedy"];

  return {
    id: Date.now(),
    title: titles[Math.floor(Math.random() * titles.length)] + " " + Math.floor(Math.random() * 100),
    genre: genres[Math.floor(Math.random() * genres.length)],
    releaseYear: 2000 + Math.floor(Math.random() * 25),
    rating: Number((Math.random() * 10).toFixed(1)),
    status: Math.random() > 0.5 ? "Watched" : "Watchlist",
    description: "Generated movie",
    imageUrl: "",
    updatedAt: Date.now()
  };
}

export function startGenerator() {
  if (intervalId) return;

  intervalId = setInterval(() => {
    const movie = generateRandomMovie();
    movies.push(movie);

    const wss = getWss();

    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: "NEW_MOVIE", movie }));
        }
      });
    }

    console.log("Generated movie:", movie.title);
  }, 5000);
}

export function stopGenerator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}