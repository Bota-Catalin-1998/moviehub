import { useEffect, useMemo, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import AdminPanel from "./AdminPanel";

const emptyForm = {
  title: "",
  genre: "",
  rating: "",
  releaseYear: "",
  status: "Watched",
  description: "",
  imageUrl: ""
};

const pageSize = 3;


//const API_BASE_URL = "https://localhost:3000";
//const WS_BASE_URL = "wss://localhost:3000";

const API_BASE_URL = "https://172.20.10.4:3000";
const WS_BASE_URL = "wss://172.20.10.4:3000";



const INACTIVITY_LIMIT_MS = 60 * 1000;

function setCookie(name, value, days = 7) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
}

function getCookie(name) {
  const cookieName = `${name}=`;
  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(cookieName)) {
      return decodeURIComponent(cookie.substring(cookieName.length));
    }
  }

  return "";
}

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem("token");

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`
  };
}

function logoutUser() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  localStorage.removeItem("lastActivity");
  window.location.href = "/";
}

export default function MoviesPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalMovies: 0,
    watchedCount: 0,
    watchlistCount: 0,
    averageRating: 0,
    genresCount: {}
  });
  const [currentUser, setCurrentUser] = useState(null);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const savedSearch = getCookie("moviehub_search");
    if (savedSearch) {
      setSearch(savedSearch);
    }

    const visits = Number(getCookie("moviehub_visits") || "0") + 1;
    setCookie("moviehub_visits", String(visits), 7);

    const savedUser = localStorage.getItem("currentUser");
    const token = localStorage.getItem("token");

    if (savedUser && token) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    function updateActivity() {
      localStorage.setItem("lastActivity", Date.now().toString());
    }

    function checkInactivity() {
      const lastActivity = Number(localStorage.getItem("lastActivity") || "0");

      if (!lastActivity) {
        localStorage.setItem("lastActivity", Date.now().toString());
        return;
      }

      if (Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
        alert("You have been logged out due to inactivity.");
        logoutUser();
      }
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((eventName) => {
      window.addEventListener(eventName, updateActivity);
    });

    const intervalId = setInterval(checkInactivity, 5000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, updateActivity);
      });

      clearInterval(intervalId);
    };
  }, [currentUser]);

  useEffect(() => {
    setCookie("moviehub_search", search, 7);
  }, [search]);

  useEffect(() => {
    if (selectedMovie?.title) {
      setCookie("moviehub_selected_movie", selectedMovie.title, 7);
    }
  }, [selectedMovie]);

  useEffect(() => {
    checkServerConnection();

    const intervalId = setInterval(() => {
      checkServerConnection();
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const ws = new WebSocket(WS_BASE_URL);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        if (message.type === "NEW_MOVIE") {
          await fetchMovies(page, true);
          await fetchStats();
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [currentUser, isOnline, page]);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (isOnline && wasOfflineRef.current) {
      syncOfflineQueue();
      wasOfflineRef.current = false;
    }
  }, [isOnline]);

  async function checkServerConnection() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);

      if (response.ok) {
        setIsOnline(true);
        setServerError("");
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      setIsOnline(false);
    }
  }

  function getOfflineQueue() {
    return JSON.parse(localStorage.getItem("offlineQueue") || "[]");
  }

  function saveOfflineQueue(queue) {
    localStorage.setItem("offlineQueue", JSON.stringify(queue));
  }

  function addToOfflineQueue(operation) {
    const queue = getOfflineQueue();
    queue.push(operation);
    saveOfflineQueue(queue);
  }

  function getCachedMovies() {
    return JSON.parse(localStorage.getItem("cachedMovies") || "[]");
  }

  function saveCachedMovies(movieList) {
    localStorage.setItem("cachedMovies", JSON.stringify(movieList));
  }

  function getCachedStats() {
    return JSON.parse(
      localStorage.getItem("cachedStats") ||
        JSON.stringify({
          totalMovies: 0,
          watchedCount: 0,
          watchlistCount: 0,
          averageRating: 0,
          genresCount: {}
        })
    );
  }

  function saveCachedStats(statsData) {
    localStorage.setItem("cachedStats", JSON.stringify(statsData));
  }

  function buildStatsFromMovies(movieList) {
    const totalMovies = movieList.length;

    const watchedCount = movieList.filter(
      (movie) => movie.status === "Watched"
    ).length;

    const watchlistCount = movieList.filter(
      (movie) => movie.status === "Watchlist"
    ).length;

    const averageRating =
      totalMovies === 0
        ? 0
        : Number(
            (
              movieList.reduce((sum, movie) => sum + Number(movie.rating || 0), 0) /
              totalMovies
            ).toFixed(2)
          );

    const genresCount = movieList.reduce((acc, movie) => {
      acc[movie.genre] = (acc[movie.genre] || 0) + 1;
      return acc;
    }, {});

    return {
      totalMovies,
      watchedCount,
      watchlistCount,
      averageRating,
      genresCount
    };
  }

  async function syncOfflineQueue() {
    const queue = getOfflineQueue();

    if (!queue.length || !currentUser) {
      return;
    }

    try {
      for (const operation of queue) {
        if (operation.type === "ADD") {
          await fetch(`${API_BASE_URL}/movies`, {
            method: "POST",
            headers: getAuthHeaders({
              "Content-Type": "application/json"
            }),
            body: JSON.stringify(operation.data)
          });
        }

        if (operation.type === "UPDATE") {
          const serverResponse = await fetch(
            `${API_BASE_URL}/movies/${operation.id}`,
            {
              headers: getAuthHeaders()
            }
          );

          if (serverResponse.ok) {
            const serverMovie = await serverResponse.json();

            const localUpdatedAt = operation.data.updatedAt || 0;
            const serverUpdatedAt = new Date(serverMovie.updatedAt).getTime() || 0;

            if (localUpdatedAt > serverUpdatedAt) {
              await fetch(`${API_BASE_URL}/movies/${operation.id}`, {
                method: "PUT",
                headers: getAuthHeaders({
                  "Content-Type": "application/json"
                }),
                body: JSON.stringify(operation.data)
              });

              console.log("Conflict resolved: kept LOCAL version");
            } else {
              console.log("Conflict resolved: kept SERVER version");
            }
          }
        }

        if (operation.type === "DELETE") {
          await fetch(`${API_BASE_URL}/movies/${operation.id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
          });
        }
      }

      saveOfflineQueue([]);
      await fetchMovies(page, true);
      await fetchStats();
    } catch (error) {
      setServerError("Could not sync offline changes.");
    }
  }

  async function fetchMovies(currentPage = page, forceOnlineFetch = false) {
    if (!currentUser) return;

    if (!isOnline && !forceOnlineFetch) {
      const cachedMovies = getCachedMovies();
      setMovies(cachedMovies);

      if (cachedMovies.length > 0) {
        setSelectedMovie((prevSelected) => {
          if (!prevSelected) return cachedMovies[0];

          const stillExists = cachedMovies.find(
            (movie) => movie.id === prevSelected.id
          );

          return stillExists || cachedMovies[0];
        });
      } else {
        setSelectedMovie(null);
      }

      setTotalPages(Math.max(1, Math.ceil(cachedMovies.length / pageSize)));
      setServerError("You are offline or the server is unreachable.");
      return;
    }

    try {
      setServerError("");

      const response = await fetch(
        `${API_BASE_URL}/movies?page=${currentPage}&limit=${pageSize}`,
        {
          headers: getAuthHeaders()
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error || "Could not load movies.");

        if (response.status === 401 || response.status === 403) {
          logoutUser();
        }

        return;
      }

      setMovies(result.data || []);
      setTotalPages(result.totalPages || 1);

      saveCachedMovies(result.data || []);

      if (result.data?.length > 0) {
        setSelectedMovie((prevSelected) => {
          if (!prevSelected) return result.data[0];

          const stillExists = result.data.find(
            (movie) => movie.id === prevSelected.id
          );

          return stillExists || result.data[0];
        });
      } else {
        setSelectedMovie(null);
      }
    } catch (error) {
      const cachedMovies = getCachedMovies();
      setMovies(cachedMovies);
      setTotalPages(Math.max(1, Math.ceil(cachedMovies.length / pageSize)));
      setServerError("You are offline or the server is unreachable.");
    }
  }

  async function fetchStats() {
    if (!currentUser) return;

    if (!isOnline) {
      setStats(getCachedStats());
      return;
    }

    try {
      setServerError("");

      const response = await fetch(`${API_BASE_URL}/stats`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error || "Could not load statistics.");
        return;
      }

      setStats(result);
      saveCachedStats(result);
    } catch (error) {
      setStats(getCachedStats());
      setServerError("Could not load statistics from the server.");
    }
  }

  useEffect(() => {
    if (!currentUser) return;

    if (isOnline) {
      syncOfflineQueue();
      fetchMovies(page);
      fetchStats();
    } else {
      const cachedMovies = getCachedMovies();
      setMovies(cachedMovies);
      setTotalPages(Math.max(1, Math.ceil(cachedMovies.length / pageSize)));
      setStats(getCachedStats());

      if (cachedMovies.length > 0) {
        setSelectedMovie((prevSelected) => {
          if (!prevSelected) return cachedMovies[0];

          const stillExists = cachedMovies.find(
            (movie) => movie.id === prevSelected.id
          );

          return stillExists || cachedMovies[0];
        });
      } else {
        setSelectedMovie(null);
      }
    }
  }, [page, isOnline, currentUser]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) =>
      `${movie.title} ${movie.genre} ${movie.status} ${movie.releaseYear}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [movies, search]);

  const totalMovies = stats.totalMovies;
  const watchedCount = stats.watchedCount;
  const watchlistCount = stats.watchlistCount;
  const averageRating = stats.averageRating;
  const genreCounts = stats.genresCount || {};
  const maxGenreCount = Math.max(...Object.values(genreCounts), 1);

  const canCreate = currentUser?.permissions?.includes("CREATE_MOVIES");
  const canUpdate = currentUser?.permissions?.includes("UPDATE_MOVIES");
  const canDelete = currentUser?.permissions?.includes("DELETE_MOVIES");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const newErrors = {};

    const title = form.title.trim();
    const genre = form.genre.trim();
    const rating = Number(form.rating);
    const releaseYear = Number(form.releaseYear);
    const description = form.description.trim();
    const currentYear = new Date().getFullYear();

    if (title.length < 2) {
      newErrors.title = "Title must have at least 2 characters.";
    }

    if (genre.length < 3) {
      newErrors.genre = "Genre must have at least 3 characters.";
    }

    if (Number.isNaN(rating) || rating < 0 || rating > 10) {
      newErrors.rating = "Rating must be a number between 0 and 10.";
    }

    if (
      Number.isNaN(releaseYear) ||
      releaseYear < 1900 ||
      releaseYear > currentYear + 1
    ) {
      newErrors.releaseYear = `Year must be between 1900 and ${currentYear + 1}.`;
    }

    if (description.length < 10) {
      newErrors.description = "Description must have at least 10 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    if (!canCreate && !editingId) {
      setServerError("You do not have permission to create movies.");
      return;
    }

    if (!canUpdate && editingId) {
      setServerError("You do not have permission to update movies.");
      return;
    }

    if (!validate()) return;

    const movieData = {
      title: form.title.trim(),
      genre: form.genre.trim(),
      rating: Number(form.rating),
      releaseYear: Number(form.releaseYear),
      status: form.status,
      description: form.description.trim(),
      imageUrl: form.imageUrl?.trim() || "",
      updatedAt: Date.now()
    };

    if (!isOnline) {
      addToOfflineQueue({
        type: editingId ? "UPDATE" : "ADD",
        id: editingId,
        data: movieData
      });

      let updatedMovies;

      if (editingId) {
        updatedMovies = movies.map((m) =>
          m.id === editingId ? { ...m, ...movieData } : m
        );
        setMovies(updatedMovies);

        const updatedSelected = updatedMovies.find((m) => m.id === editingId);
        setSelectedMovie(updatedSelected || null);
      } else {
        const newMovie = {
          id: Date.now(),
          ...movieData
        };

        updatedMovies = [newMovie, ...movies];
        setMovies(updatedMovies);
        setSelectedMovie(newMovie);
      }

      saveCachedMovies(updatedMovies);

      const updatedStats = buildStatsFromMovies(updatedMovies);
      setStats(updatedStats);
      saveCachedStats(updatedStats);

      setForm(emptyForm);
      setEditingId(null);
      setErrors({});
      return;
    }

    try {
      const response = await fetch(
        editingId
          ? `${API_BASE_URL}/movies/${editingId}`
          : `${API_BASE_URL}/movies`,
        {
          method: editingId ? "PUT" : "POST",
          headers: getAuthHeaders({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify(movieData)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error || "Operation failed.");
        return;
      }

      setForm(emptyForm);
      setEditingId(null);
      setErrors({});

      await fetchMovies(1, true);
      await fetchStats();
      setPage(1);
      setSelectedMovie(result);
    } catch (error) {
      setServerError("Could not connect to the server.");
    }
  }

  function handleEdit(movie) {
    if (!canUpdate) {
      setServerError("You do not have permission to edit movies.");
      return;
    }

    setEditingId(movie.id);
    setForm({
      title: movie.title,
      genre: movie.genre,
      rating: movie.rating,
      releaseYear: movie.releaseYear,
      status: movie.status,
      description: movie.description,
      imageUrl: movie.imageUrl || ""
    });
  }

  async function handleDelete(id) {
    setServerError("");

    if (!canDelete) {
      setServerError("You do not have permission to delete movies.");
      return;
    }

    if (!isOnline) {
      addToOfflineQueue({
        type: "DELETE",
        id
      });

      const updatedMovies = movies.filter((m) => m.id !== id);
      setMovies(updatedMovies);
      saveCachedMovies(updatedMovies);

      const updatedStats = buildStatsFromMovies(updatedMovies);
      setStats(updatedStats);
      saveCachedStats(updatedStats);

      if (selectedMovie?.id === id) {
        setSelectedMovie(updatedMovies[0] || null);
      }

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/movies/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const result = await response.json();
        setServerError(result.error || "Could not delete the movie.");
        return;
      }

      if (selectedMovie?.id === id) {
        setSelectedMovie(null);
      }

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      await fetchMovies(page);
      await fetchStats();
    } catch (error) {
      setServerError("Could not connect to the server.");
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  }

  function goPrev() {
    setPage((prev) => Math.max(1, prev - 1));
  }

  function goNext() {
    setPage((prev) => Math.min(totalPages, prev + 1));
  }

  if (!currentUser) {
    return (
      <div className="app">
        <header className="hero">
          <div className="hero-badge">🎬 MovieHub</div>
          <h1>Please login first</h1>
          <p className="tagline">
            You need to login before accessing the movies dashboard.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-badge">🎬 MovieHub</div>
        <h1>Discover, organize and rate your favorite movies</h1>
        <p className="tagline">
          MovieHub is a front-end movie manager where users can explore movies,
          manage their collection and view details in a clean master-detail interface.
        </p>

        <p
          style={{
            marginTop: "10px",
            fontWeight: "bold"
          }}
        >
          Logged in as: {currentUser.name} ({currentUser.role}){" "}
          <button
            type="button"
            className="secondary-btn"
            style={{ marginTop: "10px" }}
            onClick={logoutUser}
          >
            Logout
          </button>
        </p>

        <p
          style={{
            marginTop: "10px",
            fontWeight: "bold",
            color: isOnline ? "green" : "crimson"
          }}
        >
          Status: {isOnline ? "Online" : "Offline"}
        </p>

        <div className="cookie-info">
          <p>
            <strong>Saved search:</strong>{" "}
            {getCookie("moviehub_search") || "None"}
          </p>
          <p>
            <strong>Last selected movie:</strong>{" "}
            {getCookie("moviehub_selected_movie") || "None"}
          </p>
          <p>
            <strong>Visits:</strong> {getCookie("moviehub_visits") || "1"}
          </p>
        </div>

        <div className="hero-cards">
          <div className="hero-card">
            <span className="hero-card-icon">📋</span>
            <div>
              <h3>Manage Movies</h3>
              <p>Add, edit and delete movies easily.</p>
            </div>
          </div>

          <div className="hero-card">
            <span className="hero-card-icon">🎯</span>
            <div>
              <h3>Detailed View</h3>
              <p>Inspect full information for every movie.</p>
            </div>
          </div>

          <div className="hero-card">
            <span className="hero-card-icon">⭐</span>
            <div>
              <h3>Track Ratings</h3>
              <p>Organize your collection with ratings and status.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="layout">
        {(canCreate || canUpdate) && (
          <section className="card">
            <div className="section-header">
              <h2>{editingId ? "Edit movie" : "Add movie"}</h2>
              {editingId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={cancelEdit}
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="form" noValidate>
              <label>
                Title
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  maxLength="80"
                />
                {errors.title && <small>{errors.title}</small>}
              </label>

              <label>
                Genre
                <input
                  name="genre"
                  value={form.genre}
                  onChange={handleChange}
                  maxLength="30"
                />
                {errors.genre && <small>{errors.genre}</small>}
              </label>

              <label>
                Rating
                <input
                  name="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={form.rating}
                  onChange={handleChange}
                />
                {errors.rating && <small>{errors.rating}</small>}
              </label>

              <label>
                Year
                <input
                  name="releaseYear"
                  type="number"
                  min="1900"
                  max="2100"
                  value={form.releaseYear}
                  onChange={handleChange}
                />
                {errors.releaseYear && <small>{errors.releaseYear}</small>}
              </label>

              <label>
                Status
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="Watched">Watched</option>
                  <option value="Watchlist">Watchlist</option>
                </select>
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  rows="4"
                  maxLength="300"
                  value={form.description}
                  onChange={handleChange}
                />
                {errors.description && <small>{errors.description}</small>}
              </label>

              {serverError && (
                <p style={{ color: "red", marginTop: "8px" }}>{serverError}</p>
              )}

              <button type="submit" className="primary-btn full-btn">
                {editingId ? "Save changes" : "Add movie"}
              </button>
            </form>
          </section>
        )}

        <section className="content-stack">
          <section className="card">
            <div className="section-header">
              <h2>Movies</h2>
              <input
                className="search"
                type="text"
                placeholder="Search movie..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {serverError && !(canCreate || canUpdate) && (
              <p style={{ color: "red", marginBottom: "12px" }}>{serverError}</p>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Genre</th>
                    <th>Rating</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovies.length > 0 ? (
                    filteredMovies.map((movie) => (
                      <tr key={movie.id}>
                        <td>{movie.title}</td>
                        <td>{movie.genre}</td>
                        <td>{movie.rating}</td>
                        <td>{movie.releaseYear}</td>
                        <td>
                          <span
                            className={
                              movie.status === "Watched"
                                ? "status-badge watched"
                                : "status-badge watchlist"
                            }
                          >
                            {movie.status}
                          </span>
                        </td>
                        <td className="actions">
                          <button
                            type="button"
                            className="secondary-btn small"
                            onClick={() => setSelectedMovie(movie)}
                          >
                            View
                          </button>

                          {canUpdate && (
                            <button
                              type="button"
                              className="primary-btn small"
                              onClick={() => handleEdit(movie)}
                            >
                              Edit
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              className="danger-btn small"
                              onClick={() => handleDelete(movie.id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">No movies found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button type="button" className="secondary-btn" onClick={goPrev}>
                Prev
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button type="button" className="secondary-btn" onClick={goNext}>
                Next
              </button>
            </div>
          </section>

          <section className="stats-grid">
            <div className="card stat-card">
              <h3>Total Movies</h3>
              <p>{totalMovies}</p>
            </div>

            <div className="card stat-card">
              <h3>Watched</h3>
              <p>{watchedCount}</p>
            </div>

            <div className="card stat-card">
              <h3>Watchlist</h3>
              <p>{watchlistCount}</p>
            </div>

            <div className="card stat-card">
              <h3>Average Rating</h3>
              <p>{averageRating}</p>
            </div>
          </section>

          <section className="charts-layout">
            <section className="card">
              <div className="section-header">
                <h2>Movies by Genre</h2>
              </div>

              <div className="chart-list">
                {Object.keys(genreCounts).length > 0 ? (
                  Object.entries(genreCounts).map(([genre, count]) => (
                    <div className="chart-row" key={genre}>
                      <div className="chart-label">
                        <span>{genre}</span>
                        <span>{count}</span>
                      </div>
                      <div className="chart-bar-bg">
                        <div
                          className="chart-bar-fill"
                          style={{ width: `${(count / maxGenreCount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No data available.</p>
                )}
              </div>
            </section>

            <section className="card">
              <div className="section-header">
                <h2>Movie details</h2>
              </div>

              {selectedMovie ? (
                <div className="details">
                  <div className="poster-placeholder">Poster</div>
                  <h3>{selectedMovie.title}</h3>
                  <p>
                    <strong>Genre:</strong> {selectedMovie.genre}
                  </p>
                  <p>
                    <strong>Rating:</strong> {selectedMovie.rating}
                  </p>
                  <p>
                    <strong>Year:</strong> {selectedMovie.releaseYear}
                  </p>
                  <p>
                    <strong>Status:</strong> {selectedMovie.status}
                  </p>
                  <p>
                    <strong>Description:</strong> {selectedMovie.description}
                  </p>
                  <p>
                    <strong>Updated At:</strong>{" "}
                    {String(selectedMovie.updatedAt)}
                  </p>
                </div>
              ) : (
                <p>No movie selected.</p>
              )}
            </section>
          </section>

          <ChatBox currentUser={currentUser} />
          <AdminPanel currentUser={currentUser} />
        </section>
      </main>
    </div>
  );
}