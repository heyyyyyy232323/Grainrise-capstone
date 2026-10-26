import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import TermsModal from "../Components/Modals/TermsModal";
import PrivacyModal from "../Components/Modals/PrivacyModal";

import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import adminBackgroundImage from "../assets/adminloginBG.png";
import userBackgroundImage from "../assets/UserloginBG.png";

import useApi from "../Components/hooks/useApi";
import useAuth, { isEmployeeAccount, hasRequiredEmployeeFields } from "../Components/hooks/useAuth";

const features = [
  "Real-time Inventory Monitoring",
  "Order & Delivery Tracking",
  "Analytics & Performance Insights",
  "Warehouse & Supplier Management",
];

export const resolvePostLoginDashboard = (user) => {
  if (!user) return null;

  const role = String(user.role || "").trim().toLowerCase();
  const accountType = String(user.account_type || "").trim().toLowerCase();
  const orgType = String(user.organization_type || "").trim().toLowerCase();
  const position = String(user.position || "").trim().toLowerCase();

  // RETAILER
  if (role === "retailer") {
    return "/retailer/dashboard";
  }

  // MILLER MANAGER (including legacy "supplier")
  if (role === "miller_manager" || role === "supplier") {
    return "/miller-manager/dashboard";
  }

  // WAREHOUSE MANAGER
  if (role === "warehouse_manager") {
    return "/warehouse-manager/dashboard";
  }

  // SUPPLIER / MILLER EMPLOYEES
  const isSupplierEmployee =
    role === "supplier_employee" ||
    accountType === "supplier_employee" ||
    orgType === "supplier";

  if (isSupplierEmployee) {
    if (position === "encoder" || role === "supplier_encoder" || role === "miller_encoder") {
      return "/supplier-encoder/dashboard";
    }
    if (position === "procurement" || role === "miller_procurement") {
      return "/miller-procurement/dashboard";
    }
    if (position === "finance" || role === "miller_finance") {
      return "/miller-finance/dashboard";
    }
    if (position === "seller" || position === "sales" || role === "miller_sales") {
      return "/miller-sales/dashboard";
    }
    if (
      position === "fulfillment_logistics_coordinator" ||
      position === "fulfillment & logistics" ||
      position === "fulfillment and logistics" ||
      position === "logistics" ||
      role === "miller_logistics"
    ) {
      return "/miller-logistics/dashboard";
    }
    if (position === "driver" || role === "miller_driver") {
      return "/miller-driver/dashboard";
    }
    if (position === "branch_manager" || position === "branch manager") {
      return "/miller-branch-manager/dashboard";
    }
  }

  // WAREHOUSE EMPLOYEES
  const isWarehouseEmployee =
    role === "warehouse_employee" ||
    accountType === "warehouse_employee" ||
    orgType === "warehouse";

  if (isWarehouseEmployee) {
    if (position === "encoder" || role === "warehouse_encoder") {
      return "/warehouse-encoder/dashboard";
    }
    if (position === "procurement" || role === "warehouse_procurement") {
      return "/warehouse-procurement/dashboard";
    }
    if (position === "finance" || role === "warehouse_finance") {
      return "/warehouse-finance/dashboard";
    }
    if (position === "seller" || position === "sales" || role === "warehouse_sales") {
      return "/warehouse-sales/dashboard";
    }
    if (
      position === "fulfillment_logistics_coordinator" ||
      position === "fulfillment & logistics" ||
      position === "fulfillment and logistics" ||
      position === "logistics" ||
      role === "warehouse_logistics"
    ) {
      return "/warehouse-logistics/dashboard";
    }
    if (position === "driver" || role === "warehouse_driver") {
      return "/warehouse-driver/dashboard";
    }
    if (position === "branch_manager" || position === "branch manager" || role === "branch_manager") {
      return "/branch-manager/dashboard";
    }
  }

  // Standalone branch manager (not associated with supplier/miller)
  if (role === "branch_manager") {
    return "/branch-manager/dashboard";
  }

  // Explicit direct role routes configured in App.jsx
  const directRoleRoutes = {
    supplier_encoder: "/supplier-encoder/dashboard",
    miller_sales: "/miller-sales/dashboard",
    miller_logistics: "/miller-logistics/dashboard",
    miller_procurement: "/miller-procurement/dashboard",
    miller_finance: "/miller-finance/dashboard",
    miller_driver: "/miller-driver/dashboard",
    miller_branch_manager: "/miller-branch-manager/dashboard",
    warehouse_encoder: "/warehouse-encoder/dashboard",
    warehouse_sales: "/warehouse-sales/dashboard",
    warehouse_logistics: "/warehouse-logistics/dashboard",
    warehouse_procurement: "/warehouse-procurement/dashboard",
    warehouse_finance: "/warehouse-finance/dashboard",
    warehouse_driver: "/warehouse-driver/dashboard",
    admin: "/admin/dashboard",
  };

  if (directRoleRoutes[role]) {
    return directRoleRoutes[role];
  }

  return null;
};

const UserLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const navigate = useNavigate();
  const { request } = useApi();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoggingIn) {
      return;
    }

    if (!email.trim()) {
      setLoginError("Email or username is required.");
      return;
    }

    if (!password) {
      setLoginError("Password is required.");
      return;
    }

    setLoginError("");
    setIsLoggingIn(true);

    try {
      const response = await request("/auth/login", {
        method: "POST",

        body: {
          identifier: email.trim(),
          password,
        },

        throwOnError: true,
      });

      login(
        response.access_token,
        response.user
      );

      // Employees (supplier_employees, warehouse_employees):
      // If all REQUIRED fields are complete, redirect directly to their assigned dashboard.
      // NULLABLE fields are optional and must not trigger Complete Profile.
      if (isEmployeeAccount(response.user)) {
        if (hasRequiredEmployeeFields(response.user)) {
          const destination = resolvePostLoginDashboard(response.user);

          if (!destination) {
            setLoginError("No valid dashboard route configured for your account role or position.");
            return;
          }

          navigate(destination);
          return;
        }

        navigate("/complete-profile");
        return;
      }

      // Main accounts (users): STRICTLY PRESERVE existing required-field validation,
      // mandatory password change, and Complete Profile redirects.
      if (response.user?.must_change_password || response.user?.profile_incomplete) {
        navigate("/complete-profile");
        return;
      }

      const destination = resolvePostLoginDashboard(response.user);

      if (!destination) {
        setLoginError("No valid dashboard route configured for your account role or position.");
        return;
      }

      navigate(destination);

    } catch (error) {
      setLoginError(
        error?.message ||
        "Unable to log in. Please check your credentials."
      );

    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="dark-readable-auth min-h-screen flex flex-col animate-page-fade">
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Desktop Hero Column - Hidden on Mobile */}
        <div
          className="
            dark-readable-auth-hero
            relative
            w-full
            md:w-1/2
            bg-gradient-to-b
            from-green-900
            to-yellow-500
            px-8
            sm:px-12
            py-10
            hidden
            md:flex
            flex-col
            justify-between
            overflow-hidden
          "
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.28]"
            style={{ backgroundImage: `url(${adminBackgroundImage})` }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-[#0B5D1E] to-[#D6A62D] opacity-[0.8]" />

          <div className="relative z-10 flex flex-col justify-between h-full">
            <CustomWhiteButton
              icon={
                <span
                  className="
                    flex
                    items-center
                    gap-2
                    px-2
                    text-sm
                    font-medium
                    whitespace-nowrap
                  "
                >
                  <ArrowLeft size={18} />
                  Back to Home
                </span>
              }
              className="self-start !rounded-full w-auto"
              onClick={() => navigate("/")}
            />

            <div className="my-10">
              <h1
                className="
                  text-4xl
                  sm:text-5xl
                  font-extrabold
                  text-white
                  leading-tight
                  mb-6
                "
              >
                Cultivating the Future of Logistics
              </h1>

              <p className="text-white/90 text-lg max-w-md mb-10">
                Securely access GrainRise to manage inventory, monitor deliveries,
                and streamline rice supply chain operations through one intelligent
                platform.
              </p>

              <ul className="space-y-4">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-white">
                    <CheckCircle2 size={20} className="shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div />
          </div>
        </div>

        {/* Login Form Column - Shared identical card styling for both Mobile and Desktop */}
        <div
          className="
            relative
            w-full
            md:w-1/2
            flex-1
            flex
            flex-col
            items-center
            justify-center
            px-4
            sm:px-6
            py-8
            sm:py-12
            overflow-hidden
          "
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${userBackgroundImage})` }}
          />

          <div
            className="
              absolute
              inset-0
              bg-[#F9F9FF]
              opacity-70
            "
          />

          {/* Mobile Back to Home button */}
          <div className="relative z-10 w-full max-w-md mb-4 flex justify-start md:hidden">
            <CustomWhiteButton
              icon={
                <span className="flex items-center gap-2 px-2 text-sm font-medium whitespace-nowrap">
                  <ArrowLeft size={18} />
                  Back to Home
                </span>
              }
              className="!rounded-full w-auto !py-2 !px-4 shadow-sm"
              onClick={() => navigate("/")}
            />
          </div>

          <div
            className="
              dark-readable-auth-card
              dark-readable-auth-panel
              relative
              z-10
              w-full
              max-w-md
              bg-white/85
              backdrop-blur-md
              rounded-2xl
              sm:rounded-3xl
              shadow-2xl
              border
              border-white/60
              dark:border-white/10
              p-6
              sm:p-10
            "
          >
            {/* Logo matching the mobile layout */}
            <div className="flex items-center justify-center mb-4 sm:mb-5">
              <img src={Logo} alt="GrainRise Logo" className="h-14 sm:h-16 object-contain" />
            </div>

            {/* Subtitle directly under logo on both Desktop & Mobile */}
            <p className="text-center text-gray-600 dark:text-gray-300 text-sm mb-6 sm:mb-8 max-w-sm mx-auto leading-relaxed">
              Sign in to continue managing your rice supply chain operations.
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <CustomTextbox
                label="Email Address"
                placeholder="youremail@example.com"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);

                  if (loginError) {
                    setLoginError("");
                  }
                }}
              />

              <div className="relative">
                <CustomTextbox
                  label="Password"
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);

                    if (loginError) {
                      setLoginError("");
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-4 top-[42px] text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  Remember Me
                </label>

                <Link
                  to="/forgot-password"
                  className="text-green-700 font-medium hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {loginError && (
                <p className="text-sm font-medium text-red-600">{loginError}</p>
              )}

              <CustomGreenButton
                text={isLoggingIn ? "Logging In..." : "Log In"}
                type="submit"
                className="w-full !py-3"
              />
            </form>

            <p className="text-center text-sm text-gray-700 mt-6">
              Don’t have an account?{" "}
              <Link to="/partner-with-us" className="text-green-700 font-semibold hover:underline">
                Register
              </Link>
            </p>

            <p className="text-center text-xs text-gray-500 mt-4">
              By signing in, you agree to our{" "}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setIsTermsModalOpen(true); }}
                className="text-green-700 font-semibold hover:underline"
              >
                Terms
              </a>{" "}
              and acknowledge our{" "}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setIsPrivacyModalOpen(true); }}
                className="text-green-700 font-semibold hover:underline"
              >
                Privacy Policy.
              </a>
            </p>
          </div>
        </div>
      </div>

      <Footer />

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};

export default UserLogin;
