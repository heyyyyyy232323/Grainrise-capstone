import { useEffect, useState } from "react";


const TOKEN_KEY = "grainrise_token";
const USER_KEY = "grainrise_user";


// ============================================================
// GRAINRISE AUTH HOOK
// ============================================================

const useAuth = () => {

  const [user, setUser] =
    useState(null);

  const [token, setToken] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  // ==========================================================
  // RESTORE SAVED SESSION
  // ==========================================================

  useEffect(() => {

    try {

      const storedToken =
        localStorage.getItem(
          TOKEN_KEY
        );

      const storedUser =
        localStorage.getItem(
          USER_KEY
        );


      if (
        storedToken &&
        storedUser
      ) {

        setToken(
          storedToken
        );

        setUser(
          JSON.parse(
            storedUser
          )
        );

      }

    } catch (error) {

      console.error(
        "Failed to restore authentication session:",
        error
      );


      localStorage.removeItem(
        TOKEN_KEY
      );

      localStorage.removeItem(
        USER_KEY
      );


      setToken(null);

      setUser(null);

    } finally {

      setLoading(false);

    }

  }, []);


  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = (
    accessToken,
    userData
  ) => {

    if (
      !accessToken ||
      !userData
    ) {

      return;

    }


    localStorage.setItem(
      TOKEN_KEY,
      accessToken
    );

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(
        userData
      )
    );


    setToken(
      accessToken
    );

    setUser(
      userData
    );

  };


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = () => {

    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );


    setToken(null);

    setUser(null);

  };


  // ==========================================================
  // AUTH STATE
  // ==========================================================

  const isAuthenticated =
    Boolean(token);


  const role =
    user?.role || null;


  const accountType =
    user?.account_type || null;


  const position =
    user?.position || null;


  // ==========================================================
  // ROLE HELPERS
  // ==========================================================

  const isAdmin =
    role === "admin";


  const isFarmer =
    role === "farmer";


  const isRetailer =
    role === "retailer";


  const isWarehouseManager =
    role === "warehouse_manager";


  const isMillerManager =
    role === "miller_manager";


  const isWarehouseEmployee =
    accountType ===
    "warehouse_employee";


  const isSupplierEmployee =
    accountType ===
    "supplier_employee";


  // ==========================================================
  // RETURN AUTH DATA
  // ==========================================================

  return {

    user,
    token,
    loading,

    isAuthenticated,

    role,
    accountType,
    position,

    isAdmin,
    isFarmer,
    isRetailer,
    isWarehouseManager,
    isMillerManager,
    isWarehouseEmployee,
    isSupplierEmployee,

    login,
    logout,

  };

};


// ============================================================
// IMPORTANT:
// UserLogin.jsx and AdminLogin.jsx import this as DEFAULT.
// ============================================================

export default useAuth;