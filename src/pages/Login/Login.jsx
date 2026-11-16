import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

import "./Login.css";

/* ---------- Brand logo (roof + window + truck) ---------- */
const BrandMark = () => (
  <svg
    className="brand-mark"
    viewBox="0 0 300 80"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="goldRoof" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#e9a23b" />
        <stop offset="1" stopColor="#a8590a" />
      </linearGradient>
      <linearGradient id="goldBox" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c98a1e" />
        <stop offset="1" stopColor="#9a5a0d" />
      </linearGradient>
    </defs>

    <path
      d="M8 66 L72 10 L138 56"
      fill="none"
      stroke="url(#goldRoof)"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M30 66 L72 30"
      fill="none"
      stroke="url(#goldRoof)"
      strokeWidth="5"
      strokeLinecap="round"
    />

    <g fill="#6b3a08">
      <rect x="64" y="34" width="7" height="7" rx="1" />
      <rect x="73" y="34" width="7" height="7" rx="1" />
      <rect x="64" y="43" width="7" height="7" rx="1" />
      <rect x="73" y="43" width="7" height="7" rx="1" />
    </g>

    <g stroke="#c98a1e" strokeWidth="3" strokeLinecap="round">
      <line x1="142" y1="20" x2="168" y2="20" />
      <line x1="146" y1="30" x2="168" y2="30" />
      <line x1="150" y1="40" x2="168" y2="40" />
      <line x1="154" y1="50" x2="168" y2="50" />
    </g>

    <rect x="170" y="10" width="68" height="46" rx="3" fill="url(#goldBox)" />
    <path d="M240 24 h20 l14 16 v16 h-34 z" fill="#1c1c1c" />
    <path d="M246 29 h11 l8 10 h-19 z" fill="#f3e6d2" />
    <rect x="170" y="54" width="104" height="5" fill="#1c1c1c" />
    <circle cx="192" cy="60" r="8" fill="#1c1c1c" />
    <circle cx="192" cy="60" r="3.5" fill="#f3e6d2" />
    <circle cx="256" cy="60" r="8" fill="#1c1c1c" />
    <circle cx="256" cy="60" r="3.5" fill="#f3e6d2" />
  </svg>
);

/* ---------- Icons ---------- */
const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle cx="12" cy="8" r="4.2" fill="currentColor" />
    <path d="M3.5 21c0-4.6 3.8-7.5 8.5-7.5s8.5 2.9 8.5 7.5z" fill="currentColor" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="currentColor" />
    <circle cx="12" cy="15" r="1.6" fill="#fff" />
    <rect x="11.3" y="15" width="1.4" height="3.2" rx="0.7" fill="#fff" />
  </svg>
);

const EyeIcon = ({ off }) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <line x1="4" y1="4" x2="20" y2="20" />}
  </svg>
);

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
    const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });

  const showToast = (type, message) => {
    setToast({
      show: true,
      type,
      message,
    });

    setTimeout(() => {
      setToast({
        show: false,
        type: "",
        message: "",
      });
    }, 3000);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Remove field error while typing
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const newErrors = {
      email: "",
      password: "",
    };

    let hasError = false;

    // Username validation
    if (!formData.email.trim()) {
      newErrors.email = "Username is required";
      hasError = true;
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      hasError = true;
    }

    setErrors(newErrors);

    // Validation failed
    if (hasError) {
      showToast(
        "error",
        "Please enter username and password"
      );

      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/login",
        formData
      );

      const { accessToken, user } =
        response.data.data;

      localStorage.setItem(
        "accessToken",
        accessToken
      );

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      console.log("Login successful:", user);

      // SUCCESS TOAST
      showToast(
        "success",
        "Login successful!"
      );
     
  navigate("/dashboard");


    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Invalid username or password";

      // ERROR TOAST
      showToast("error", message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* SUCCESS / ERROR TOAST */}
      {toast.show && (
        <div
          className={`toast toast-${toast.type}`}
        >
          <span className="toast-icon">
            {toast.type === "success"
              ? "✓"
              : "!"}
          </span>

          <span>{toast.message}</span>
        </div>
      )}

      {/* Sai Baba image panel */}
      <div className="hero" aria-hidden="true">
        <div className="hero-image"></div>
      </div>

      {/* Login panel */}
      <main className="panel">
        <div className="login-card">

          <div className="brand-section">
            <BrandMark />

            <div className="brand-text">
              <span className="brand-veni">
                Veni
              </span>

              <span className="brand-packers">
                Packers
              </span>
            </div>

            <svg
              className="brand-swoosh"
              viewBox="0 0 300 20"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="swoosh"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop
                    offset="0"
                    stopColor="#b8650d"
                  />

                  <stop
                    offset="0.7"
                    stopColor="#8a4a0a"
                  />

                  <stop
                    offset="1"
                    stopColor="#222"
                  />
                </linearGradient>
              </defs>

              <path
                d="M4 6 C 70 18, 190 18, 296 3 C 200 12, 80 12, 4 6 Z"
                fill="url(#swoosh)"
              />
            </svg>
          </div>

          <p className="login-subtitle">
            Sign in to your account
          </p>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {/* USERNAME */}
            <div className="field-wrapper">

              <div
                className={`input-group ${
                  errors.email
                    ? "input-error"
                    : ""
                }`}
              >
                <span className="input-icon">
                  <UserIcon />
                </span>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Username"
                  aria-label="Username"
                  autoComplete="email"
                />
              </div>

              {errors.email && (
                <p className="field-error">
                  {errors.email}
                </p>
              )}

            </div>

            {/* PASSWORD */}
            <div className="field-wrapper">

              <div
                className={`input-group ${
                  errors.password
                    ? "input-error"
                    : ""
                }`}
              >
                <span className="input-icon">
                  <LockIcon />
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  aria-label="Password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <EyeIcon
                    off={showPassword}
                  />
                </button>
              </div>

              {errors.password && (
                <p className="field-error">
                  {errors.password}
                </p>
              )}

            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          <p className="blessing">
            ஓம் ஸ்ரீ சாய்ராம்
          </p>

        </div>
      </main>
    </div>
  );
};

export default Login;
