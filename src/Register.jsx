import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

//const API_BASE_URL = "https://localhost:3000";
const API_BASE_URL = "https://moviehub-doyw.onrender.com";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Register failed.");
        return;
      }

      navigate("/");
    } catch (err) {
      setError("Could not connect to the server.");
    }
  }

  return (
    <div className="page-shell">
      <div className="auth-card">
        <div className="hero-badge">🎬 MovieHub</div>
        <h1>Create account</h1>
        <p className="tagline">Join MovieHub and manage your movies easily.</p>

        <form className="form" onSubmit={handleRegister}>
          <label>
            Username
            <input
              type="text"
              name="name"
              placeholder="Enter username"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" className="primary-btn full-btn">
            Register
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}