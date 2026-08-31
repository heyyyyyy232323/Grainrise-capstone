import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { useLoading } from "../Components/context/LoadingContext";

// Adjust these import paths to match your project structure
import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/adminloginBG.png";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { triggerLoading } = useLoading();

  const handleSubmit = (e) => {
    e.preventDefault();
    triggerLoading(900);
    // TODO: add real admin login API call here
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative flex-1 flex items-center justify-center px-6 py-10 overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B5D1E] to-[#D6A62D] opacity-[0.98]" />

        <CustomWhiteButton
          icon={
            <span className="flex items-center gap-2 px-2 text-sm font-medium whitespace-nowrap">
              <ArrowLeft size={18} />
              Back to Home
            </span>
          }
          className="absolute top-6 left-8 !rounded-full w-auto !p-2 z-10"
          onClick={() => navigate("/")}
        />

        <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Logo placeholder — swap this block for your real GrainRise logo */}
          <div className="flex items-center justify-center mb-6">
            <img
              src={Logo}
              alt="GrainRise Logo"
              className="h-12 object-contain"
            />
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <CustomTextbox
              label="Email Address"
              placeholder="youremail@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <a
                  href="#"
                  className="text-sm text-green-700 font-semibold hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <CustomTextbox
                  placeholder="Enter your Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-[14px] text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <CustomGreenButton
              text="Log In"
              type="submit"
              className="w-full !py-3 !rounded-full mt-5"
            />
          </form>

          <hr className="my-5 border-gray-200" />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AdminLogin;