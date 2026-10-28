import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import useApi from "../hooks/useApi";
import {
  isTokenValid,
  parseJwt,
  clearAuthSession,
  isEmployeeAccount,
  hasRequiredEmployeeFields,
} from "../hooks/useAuth";
import { resolvePostLoginDashboard } from "../../Login/UserLogin";

// ============================================================
// USER & EMPLOYEE PROTECTED ROUTE
// Protects: Miller, Warehouse, Retailer, and Employees
// ============================================================

export const ProtectedRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("grainrise_token");
  const user = localStorage.getItem("grainrise_user");
  const payload = parseJwt(token);

  const isValidUser =
    Boolean(token) &&
    Boolean(user) &&
    isTokenValid(token) &&
    payload?.role !== "admin";

  const [sessionActive, setSessionActive] = useState(() => isValidUser);

  useEffect(() => {
    let isMounted = true;

    const checkSession = () => {
      const curToken = localStorage.getItem("grainrise_token");
      const curUser = localStorage.getItem("grainrise_user");
      const curPayload = parseJwt(curToken);
      if (
        !curToken ||
        !curUser ||
        !isTokenValid(curToken) ||
        curPayload?.role === "admin"
      ) {
        clearAuthSession();
        setSessionActive(false);
        window.location.replace("/login");
      }
    };

    const handleUnauthorized = () => {
      clearAuthSession();
      setSessionActive(false);
      navigate("/login", { replace: true });
    };

    window.addEventListener("pageshow", checkSession);
    window.addEventListener("popstate", checkSession);
    window.addEventListener("storage", checkSession);
    window.addEventListener("grainrise_unauthorized", handleUnauthorized);
    window.addEventListener("grainrise_logout", handleUnauthorized);

    // If an employee with complete required fields navigates to Complete Profile directly,
    // redirect them to their assigned role dashboard.
    if (isValidUser && location.pathname === "/complete-profile") {
      let parsedUser = null;
      try {
        parsedUser = user ? JSON.parse(user) : null;
      } catch {}

      const curPayload = parseJwt(token);
      if (
        isEmployeeAccount(parsedUser, curPayload) &&
        hasRequiredEmployeeFields(parsedUser)
      ) {
        const combinedUser = { ...curPayload, ...(parsedUser || {}) };
        const destination = resolvePostLoginDashboard(combinedUser);
        navigate(destination || "/login", { replace: true });
      }
    }

    return () => {
      window.removeEventListener("pageshow", checkSession);
      window.removeEventListener("popstate", checkSession);
      window.removeEventListener("storage", checkSession);
      window.removeEventListener("grainrise_unauthorized", handleUnauthorized);
      window.removeEventListener("grainrise_logout", handleUnauthorized);
    };
  }, [navigate, location.pathname, isValidUser, token, user]);

  if (!isValidUser || !sessionActive) {
    clearAuthSession();
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
};

// ============================================================
// ADMIN PROTECTED ROUTE
// Protects: Admin account modules
// ============================================================

export const AdminProtectedRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { request } = useApi();

  const token = localStorage.getItem("grainrise_token");
  const user = localStorage.getItem("grainrise_user");
  const payload = parseJwt(token);

  const isValidAdmin =
    Boolean(token) &&
    Boolean(user) &&
    isTokenValid(token) &&
    payload?.role === "admin" &&
    payload?.auth_source === "django_admin";

  const [sessionActive, setSessionActive] = useState(() => isValidAdmin);

  useEffect(() => {
    let isMounted = true;

    const checkAdminSession = () => {
      const curToken = localStorage.getItem("grainrise_token");
      const curUser = localStorage.getItem("grainrise_user");
      const curPayload = parseJwt(curToken);
      if (
        !curToken ||
        !curUser ||
        !isTokenValid(curToken) ||
        curPayload?.role !== "admin" ||
        curPayload?.auth_source !== "django_admin"
      ) {
        clearAuthSession();
        setSessionActive(false);
        window.location.replace("/admin-login");
      }
    };

    const handleUnauthorized = () => {
      clearAuthSession();
      setSessionActive(false);
      navigate("/admin-login", { replace: true });
    };

    window.addEventListener("pageshow", checkAdminSession);
    window.addEventListener("popstate", checkAdminSession);
    window.addEventListener("storage", checkAdminSession);
    window.addEventListener("grainrise_unauthorized", handleUnauthorized);
    window.addEventListener("grainrise_logout", handleUnauthorized);

    // Backend JWT Validation for Admin
    const validateAdminWithBackend = async () => {
      try {
        await request("/admin/dashboard/", {
          method: "GET",
          throwOnError: true,
        });
      } catch (err) {
        if (!isMounted) return;
        if (err?.status === 401 || err?.status === 403) {
          clearAuthSession();
          setSessionActive(false);
          navigate("/admin-login", { replace: true });
        }
      }
    };

    if (isValidAdmin) {
      validateAdminWithBackend();
    }

    return () => {
      isMounted = false;
      window.removeEventListener("pageshow", checkAdminSession);
      window.removeEventListener("popstate", checkAdminSession);
      window.removeEventListener("storage", checkAdminSession);
      window.removeEventListener("grainrise_unauthorized", handleUnauthorized);
      window.removeEventListener("grainrise_logout", handleUnauthorized);
    };
  }, [navigate, request, isValidAdmin]);

  if (!isValidAdmin || !sessionActive) {
    clearAuthSession();
    return (
      <Navigate
        to="/admin-login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
};

export default AdminProtectedRoute;