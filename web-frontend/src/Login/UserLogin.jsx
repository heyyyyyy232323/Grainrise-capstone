import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

// Adjust these import paths to match your project structure
import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/UserloginBG.png";

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
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col animate-page-fade">
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left panel */}
        <div className="relative w-full md:w-1/2 bg-gradient-to-b from-green-900 to-yellow-500 px-8 sm:px-12 py-10 flex flex-col justify-between">
          <CustomWhiteButton
            icon={
              <span className="flex items-center gap-2 px-2 text-sm font-medium whitespace-nowrap">
                <ArrowLeft size={18} />
                Back to Home
              </span>
            }
            className="self-start !rounded-full w-auto"
            onClick={() => navigate("/")}
          />

          <div className="my-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
              Cultivating the Future of Logistics
            </h1>
            <p className="text-white/90 text-lg max-w-md mb-10">
              Securely access GrainRise to manage inventory, monitor
              deliveries, and streamline rice supply chain operations through
              one intelligent platform.
            </p>

            <ul className="space-y-4">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-white"
                >
                  <CheckCircle2 size={20} className="shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* spacer to balance justify-between since there's no bottom-left content */}
          <div />
        </div>

        {/* Right panel */}
        <div className="relative w-full md:w-1/2 flex items-center justify-center px-6 py-12 overflow-hidden">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />

          {/* Panel color overlay at 70% opacity so the background image shows through */}
          <div className="absolute inset-0 bg-[#F9F9FF] opacity-70" />

          <div className="relative z-10 w-full max-w-md bg-white/60 rounded-2xl shadow-xl p-8 sm:p-10">
            {/* Logo placeholder — swap this block for your real GrainRise logo */}
            <div className="flex items-center justify-center mb-6">
              <img
                src={Logo}
                alt="GrainRise Logo"
                className="h-12 object-contain"
              />
            </div>

            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
              Welcome Back
            </h1>
            <p className="text-center text-gray-500 text-sm mb-8">
              Sign in to continue managing your rice supply chain operations.
            </p>

            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <CustomTextbox
                label="Email Address"
                placeholder="youremail@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="relative">
                <CustomTextbox
                  label="Password"
                  placeholder="Enter your Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
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
                  className="text-green-700 font-medium hover:underline"
                >
                  Forgot Password?
                </a>
              </div>

              <CustomGreenButton text="Log In" type="submit" className="w-full !py-3" />
            </form>

            <p className="text-center text-sm text-gray-700 mt-6">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-green-700 font-semibold hover:underline"
              >
                Register
              </Link>
            </p>

            <p className="text-center text-xs text-gray-500 mt-4">
              By signing in, you agree to our{" "}
              <a
                href="#"
                className="text-green-700 font-semibold hover:underline"
              >
                Terms
              </a>{" "}
              and acknowledge our{" "}
              <a
                href="#"
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