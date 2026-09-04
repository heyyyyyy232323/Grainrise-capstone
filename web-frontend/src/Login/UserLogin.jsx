import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import adminBackgroundImage from "../assets/adminloginBG.png";
import userBackgroundImage from "../assets/UserloginBG.png";

import useApi from "../Components/hooks/useApi";
import useAuth from "../Components/hooks/useAuth";

const features = [
  "Real-time Inventory Monitoring",
  "Order & Delivery Tracking",
  "Analytics & Performance Insights",
  "Warehouse & Supplier Management",
];

const UserLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

      const role = response.user?.role;

      const roleRoutes = {
        farmer: "/farmer/dashboard",

        retailer: "/retailer/point-of-sale",

        warehouse_manager:
          "/warehouse-manager/dashboard",

        supplier:
          "/miller/dashboard",
      };

      const destination =
        roleRoutes[role] || "/dashboard-preview";

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
    <div className="min-h-screen flex flex-col animate-page-fade">
      <div className="flex flex-1 flex-col md:flex-row">
        <div
          className="
            relative
            w-full
            md:w-1/2
            bg-gradient-to-b
            from-green-900
            to-yellow-500
            px-8
            sm:px-12
            py-10
            flex
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
                  Back
                </span>
              }
              className="self-start !rounded-full w-auto"
              onClick={() => navigate(-1)}
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

        <div
          className="
            relative
            w-full
            md:w-1/2
            flex
            items-center
            justify-center
            px-6
            py-12
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

          <div
            className="
              relative
              z-10
              w-full
              max-w-md
              bg-white/60
              rounded-2xl
              shadow-xl
              p-8
              sm:p-10
            "
          >
            <div className="flex items-center justify-center mb-6">
              <img src={Logo} alt="GrainRise Logo" className="h-12 object-contain" />
            </div>

            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
              Welcome Back
            </h1>

            <p className="text-center text-gray-500 text-sm mb-8">
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
                  placeholder="Enter your Password"
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

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-green-700 font-medium hover:underline"
                >
                  Forgot Password?
                </a>
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
              Don't have an account?{" "}
              <Link to="/register" className="text-green-700 font-semibold hover:underline">
                Register
              </Link>
            </p>

            <p className="text-center text-xs text-gray-500 mt-4">
              By signing in, you agree to our{" "}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-green-700 font-semibold hover:underline"
              >
                Terms
              </a>{" "}
              and acknowledge our{" "}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-green-700 font-semibold hover:underline"
              >
                Privacy Policy.
              </a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default UserLogin;