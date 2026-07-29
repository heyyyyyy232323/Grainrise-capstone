import { useState, useCallback } from "react";

// Base URL for all API calls — change this once and it applies everywhere
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/**
 * useApi
 * A generic hook for making HTTP requests to the GrainRise backend.
 * Manages loading, error, and response state automatically.
 *
 * Usage:
 *   const { data, loading, error, request } = useApi();
 *
 *   // GET request
 *   await request("/products/");
 *
 *   // POST request with body
 *   await request("/auth/login/", { method: "POST", body: { email, password } });
 */
const useApi = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Make an API request.
   * @param {string} endpoint   - API path, e.g. "/auth/login/"
   * @param {object} options    - Optional: method, body, extra headers
   * @returns {object|null}     - Parsed JSON response, or null on error
   */
  const request = useCallback(async (endpoint, options = {}) => {
    const { method = "GET", body = null, headers = {} } = options;

    setLoading(true);
    setError(null);

    try {
      // Attach JWT token if available in localStorage
      const token = localStorage.getItem("grainrise_token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : null,
      });

      const json = await response.json();

      if (!response.ok) {
        // Use server error message if available, otherwise generic message
        const errorMessage =
          json?.detail ||
          json?.message ||
          json?.error ||
          `Request failed with status ${response.status}`;
        setError(errorMessage);
        return null;
      }

      setData(json);
      return json;
    } catch (err) {
      const message =
        err.message === "Failed to fetch"
          ? "Cannot connect to server. Please check your connection."
          : err.message;
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Reset state (useful before making a new request in the same component) */
  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, request, reset };
};

export default useApi;
