import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="page-shell">
      <div className="landing-card">
        <div className="hero-badge">🎬 MovieHub</div>
        <h1>Discover, organize and rate your favorite movies</h1>
        <p className="tagline">
          MovieHub helps users manage their movie collection, inspect details,
          track ratings and explore data in an interactive interface.
        </p>

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

        <div className="landing-actions">
          <Link to="/movies" className="primary-btn no-underline">
            Go to Movies
          </Link>
        </div>
      </div>
    </div>
  );
}