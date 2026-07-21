import { useState, useEffect } from "react";

const TOKEN_KEY = "grainrise_token";
const USER_KEY = "grainrise_user";

/**
 * useAuth
 * Manages the authenticated user session.
 * - Reads/writes the JWT token from localStorage
 * - Exposes the current user object and their role
 * - Provides login() and logout() helpers
 *
 * Usage:
 *   const { user, isAuthenticated, role, login, logout } = useAuth();
 */
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true until session is restored

  // Restore session from localStorage on first render
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Corrupted storage — clear it
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Call after a successful login API response.
   * @param {string} jwtToken  - The access token returned by the backend
   * @param {object} userData  - User info (id, email, role, name, etc.)
   */
  const login = (jwtToken, userData) => {
    localStorage.setItem(TOKEN_KEY, jwtToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
  };

  /** Clear session and redirect to landing page */
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  /** True when a valid token is present */
  const isAuthenticated = Boolean(token);

  /**
   * The role of the logged-in user.
   * Expected values: "retailer" | "supplier" | "warehouse_manager" | "admin"
   */
  const role = user?.role || null;

  /** Convenience role checks */
  const isAdmin = role === "admin";
  const isRetailer = role === "retailer";
  const isSupplier = role === "supplier";
  const isWarehouseManager = role === "warehouse_manager";

  return {
    user,
    token,
    loading,
    isAuthenticated,
    role,
    isAdmin,
    isRetailer,
    isSupplier,
    isWarehouseManager,
    login,
    logout,
  };
};

export default useAuth;
