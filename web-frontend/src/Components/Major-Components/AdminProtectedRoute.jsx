import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";


// ============================================================
// ADMIN PROTECTED ROUTE
// ============================================================

const AdminProtectedRoute = () => {
  const location = useLocation();

  const token =
    localStorage.getItem(
      "grainrise_token"
    );

  const user =
    localStorage.getItem(
      "grainrise_user"
    );


  // =========================================================
  // NO LOGIN SESSION
  // ============================================================

  if (!token || !user) {
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


  // =========================================================
  // SESSION EXISTS
  // ============================================================

  return <Outlet />;
};


export default AdminProtectedRoute;