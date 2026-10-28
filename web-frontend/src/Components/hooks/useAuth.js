import { useEffect, useState } from "react";


const TOKEN_KEY = "grainrise_token";
const USER_KEY = "grainrise_user";

// ============================================================
// TOKEN VALIDATION & SESSION UTILITIES
// ============================================================

export const parseJwt = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const binaryString = atob(padded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const text = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const isTokenValid = (token) => {
  const payload = parseJwt(token);
  if (!payload || !payload.exp || typeof payload.exp !== "number") {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    return false;
  }
  return true;
};

export const clearAuthSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("access_token");
    sessionStorage.clear();
  } catch (error) {
    console.error("Failed to clear auth session:", error);
  }
};

export const isEmployeeAccount = (user, payload = null) => {
  if (!user && !payload) return false;
  const accountType = String(
    user?.account_type || payload?.account_type || ""
  ).trim().toLowerCase();
  const role = String(
    user?.role || payload?.role || ""
  ).trim().toLowerCase();
  const position = String(
    user?.position || payload?.position || ""
  ).trim().toLowerCase();

  const orgType = String(
    user?.organization_type || payload?.organization_type || ""
  ).trim().toLowerCase();

  if (
    accountType === "warehouse_employee" ||
    accountType === "supplier_employee" ||
    role === "warehouse_employee" ||
    role === "supplier_employee" ||
    orgType === "warehouse" ||
    orgType === "supplier"
  ) {
    return true;
  }

  const employeePositions = [
    "encoder",
    "procurement",
    "finance",
    "seller",
    "sales",
    "fulfillment_logistics_coordinator",
    "fulfillment & logistics",
    "fulfillment and logistics",
    "logistics",
    "flc",
    "driver",
    "delivery_driver",
    "branch_manager",
    "branch manager",
  ];
  if (position && employeePositions.includes(position)) {
    return true;
  }

  const employeeRoles = [
    "supplier_encoder",
    "miller_encoder",
    "miller_procurement",
    "miller_finance",
    "miller_sales",
    "miller_logistics",
    "miller_flc",
    "supplier_logistics",
    "miller_driver",
    "supplier_driver",
    "warehouse_encoder",
    "warehouse_sales",
    "warehouse_logistics",
    "warehouse_flc",
    "warehouse_procurement",
    "warehouse_finance",
    "warehouse_driver",
  ];
  if (employeeRoles.includes(role)) {
    return true;
  }

  return false;
};

export const hasRequiredEmployeeFields = (user) => {
  if (!user || typeof user !== "object") return false;

  const firstName = String(user.first_name || "").trim();
  const lastName = String(user.last_name || "").trim();
  const email = String(user.email || "").trim();
  const username = String(user.username || "").trim();
  const position = String(user.position || "").trim();

  // Basic required NOT NULL fields in employee database schema
  if (!firstName || !lastName || !email || !username || !position) {
    return false;
  }

  // contact_number is required in DB schema; if provided, ensure it's not empty string
  if (user.contact_number !== undefined && user.contact_number !== null) {
    if (!String(user.contact_number).trim()) {
      return false;
    }
  }

  // Nullable fields (middle_initial, suffix, gender, province, municipality, postal_code, barangay, street_address) are optional and must not trigger Complete Profile
  return true;
};


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
        storedUser &&
        isTokenValid(storedToken)
      ) {

        setToken(
          storedToken
        );

        setUser(
          JSON.parse(
            storedUser
          )
        );

      } else if (storedToken || storedUser) {
        clearAuthSession();
        setToken(null);
        setUser(null);
      }

    } catch (error) {

      console.error(
        "Failed to restore authentication session:",
        error
      );

      clearAuthSession();
      setToken(null);
      setUser(null);

    } finally {

      setLoading(false);

    }

  }, []);


  // ==========================================================
  // CROSS-TAB & GLOBAL SESSION SYNCHRONIZATION
  // ==========================================================

  useEffect(() => {
    const handleSync = () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (!storedToken || !storedUser || !isTokenValid(storedToken)) {
        setToken(null);
        setUser(null);
      } else {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("grainrise_logout", handleSync);
    window.addEventListener("grainrise_unauthorized", handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("grainrise_logout", handleSync);
      window.removeEventListener("grainrise_unauthorized", handleSync);
    };
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

    clearAuthSession();

    setToken(null);

    setUser(null);

    window.dispatchEvent(
      new Event("grainrise_logout")
    );

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


  const orgType =
    user?.organization_type || null;

  const isWarehouseEmployee =
    accountType === "warehouse_employee" ||
    role === "warehouse_employee" ||
    orgType === "warehouse" ||
    (typeof role === "string" && role.startsWith("warehouse_"));

  const isSupplierEmployee =
    accountType === "supplier_employee" ||
    role === "supplier_employee" ||
    orgType === "supplier" ||
    (typeof role === "string" && (role.startsWith("miller_") || role.startsWith("supplier_")));

  const isMillerDriver =
    Boolean(isSupplierEmployee) &&
    (position === "driver" || position === "delivery_driver" || role === "miller_driver" || role === "supplier_driver");

  const isWarehouseDriver =
    Boolean(isWarehouseEmployee) &&
    (position === "driver" || position === "delivery_driver" || role === "warehouse_driver");

  const isMillerLogistics =
    Boolean(isSupplierEmployee) &&
    (position === "fulfillment_logistics_coordinator" ||
      position === "fulfillment & logistics" ||
      position === "fulfillment and logistics" ||
      position === "logistics" ||
      position === "flc" ||
      role === "miller_logistics" ||
      role === "miller_flc" ||
      role === "supplier_logistics");

  const isWarehouseLogistics =
    Boolean(isWarehouseEmployee) &&
    (position === "fulfillment_logistics_coordinator" ||
      position === "fulfillment & logistics" ||
      position === "fulfillment and logistics" ||
      position === "logistics" ||
      position === "flc" ||
      role === "warehouse_logistics" ||
      role === "warehouse_flc");

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
    orgType,

    isAdmin,
    isFarmer,
    isRetailer,
    isWarehouseManager,
    isMillerManager,
    isWarehouseEmployee,
    isSupplierEmployee,
    isMillerDriver,
    isWarehouseDriver,
    isMillerLogistics,
    isWarehouseLogistics,

    login,
    logout,

  };

};


// ============================================================
// IMPORTANT:
// UserLogin.jsx and AdminLogin.jsx import this as DEFAULT.
// ============================================================

export default useAuth;