import { useNavigate } from "react-router-dom";

/**
 * useNavigation
 * Centralizes all navigation actions so no component needs to
 * call useNavigate() and hard-code paths individually.
 *
 * Usage:
 *   const { goHome, goBack, goTo, goLogin, goRegister } = useNavigation();
 */
const useNavigation = () => {
  const navigate = useNavigate();

  return {
    /** Go to the landing/home page */
    goHome: () => navigate("/"),

    /** Go one step back in browser history */
    goBack: () => navigate(-1),

    /** Navigate to any custom path */
    goTo: (path) => navigate(path),

    /** Go to the user login page */
    goLogin: () => navigate("/login"),

    /** Go to the admin login page */
    goAdminLogin: () => navigate("/admin-login"),

    /** Go to the registration gateway */
    goRegister: () => navigate("/register"),

    /** Go to the retailer registration page */
    goRetailerRegister: () => navigate("/register/retailer"),

    /** Go to the supplier/warehouse registration page */
    goSupplierRegister: () => navigate("/register/supplier-warehouse"),

    /** Go to the farmer registration page */
    goFarmerRegister: () => navigate("/register/farmer"),
  };
};

export default useNavigation;
