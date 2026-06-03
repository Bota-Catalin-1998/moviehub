import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

//const API_BASE_URL = "https://localhost:3000";

const API_BASE_URL = "https://172.20.10.4:3000";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [devResetCode, setDevResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleStartLogin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDevOtp("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Login failed.");
        return;
      }

      setIsOtpStep(true);
      setDevOtp(result.devOtp || "");
      setSuccess("OTP generated. Enter the code to finish login.");
    } catch (err) {
      setError("Could not connect to the server.");
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: form.email,
          otp
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "OTP verification failed.");
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(result.user));
      localStorage.setItem("token", result.token);
      localStorage.setItem("lastActivity", Date.now().toString());

      navigate("/movies");
    } catch (err) {
      setError("Could not connect to the server.");
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDevResetCode("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: resetEmail
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Could not generate reset code.");
        return;
      }

      setDevResetCode(result.devResetCode || "");
      setSuccess("Password reset code generated.");
    } catch (err) {
      setError("Could not connect to the server.");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: resetEmail,
          resetCode,
          newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Could not reset password.");
        return;
      }

      setSuccess("Password reset successful. You can now login.");
      setForgotMode(false);
      setForm((prev) => ({
        ...prev,
        email: resetEmail,
        password: ""
      }));
      setResetCode("");
      setDevResetCode("");
      setNewPassword("");
      setIsOtpStep(false);
    } catch (err) {
      setError("Could not connect to the server.");
    }
  }

  function goBackToLogin() {
    setForgotMode(false);
    setIsOtpStep(false);
    setOtp("");
    setDevOtp("");
    setError("");
    setSuccess("");
  }

  return (
    <div className="page-shell">
      <div className="auth-card">
        <div className="hero-badge">🎬 MovieHub</div>

        {!forgotMode && (
          <>
            <h1>Welcome back</h1>
            <p className="tagline">
              Login with email, password and OTP to continue.
            </p>

            {!isOtpStep ? (
              <form className="form" onSubmit={handleStartLogin}>
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
                {success && <p style={{ color: "green" }}>{success}</p>}

                <button type="submit" className="primary-btn full-btn">
                  Generate OTP
                </button>
              </form>
            ) : (
              <form className="form" onSubmit={handleVerifyOtp}>
                <label>
                  OTP Code
                  <input
                    type="text"
                    name="otp"
                    placeholder="Enter 6 digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </label>

                {devOtp && (
                  <p style={{ color: "orange", fontWeight: "bold" }}>
                    Demo OTP: {devOtp}
                  </p>
                )}

                {error && <p style={{ color: "red" }}>{error}</p>}
                {success && <p style={{ color: "green" }}>{success}</p>}

                <button type="submit" className="primary-btn full-btn">
                  Verify OTP and Login
                </button>

                <button
                  type="button"
                  className="secondary-btn full-btn"
                  onClick={() => {
                    setIsOtpStep(false);
                    setOtp("");
                    setDevOtp("");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Back to email and password
                </button>
              </form>
            )}

            <p className="auth-link">
              Forgot password?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setForgotMode(true);
                  setResetEmail(form.email);
                  setError("");
                  setSuccess("");
                }}
              >
                Reset it
              </button>
            </p>

            <p className="auth-link">
              Don’t have an account? <Link to="/register">Register</Link>
            </p>
          </>
        )}

        {forgotMode && (
          <>
            <h1>Password recovery</h1>
            <p className="tagline">
              Generate a reset code, then choose a new password.
            </p>

            <form className="form" onSubmit={handleForgotPassword}>
              <label>
                Email
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </label>

              <button type="submit" className="primary-btn full-btn">
                Generate reset code
              </button>
            </form>

            <form className="form" onSubmit={handleResetPassword}>
              <label>
                Reset Code
                <input
                  type="text"
                  placeholder="Enter reset code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                />
              </label>

              <label>
                New Password
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>

              {devResetCode && (
                <p style={{ color: "orange", fontWeight: "bold" }}>
                  Demo reset code: {devResetCode}
                </p>
              )}

              {error && <p style={{ color: "red" }}>{error}</p>}
              {success && <p style={{ color: "green" }}>{success}</p>}

              <button type="submit" className="primary-btn full-btn">
                Reset password
              </button>

              <button
                type="button"
                className="secondary-btn full-btn"
                onClick={goBackToLogin}
              >
                Back to login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}