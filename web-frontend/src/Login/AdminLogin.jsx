import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/adminloginBG.png";
import useApi from "../Components/hooks/useApi";
import useAuth from "../Components/hooks/useAuth";


const AdminLogin = () => {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navigate = useNavigate();
  const { triggerLoading } = useLoading();

  const handleSubmit = (e) => {
    e.preventDefault();
    triggerLoading(900);
    // TODO: add real admin login API call here
  };

  const { request } = useApi();

  const { login } = useAuth();


  const handleSubmit = async (e) => {

    e.preventDefault();


    if (isLoggingIn) {
      return;
    }


    if (!email.trim()) {

      setLoginError(
        "Email or username is required."
      );

      return;
    }


    if (!password) {

      setLoginError(
        "Password is required."
      );

      return;
    }


    setLoginError("");

    setIsLoggingIn(true);


    try {

      const response = await request(
        "/auth/admin/login",
        {
          method: "POST",

          body: {
            email: email.trim(),
            password,
          },

          throwOnError: true,
        }
      );


      login(
        response.access_token,
        response.user
      );


      navigate(
        "/admin/retailers"
      );


    } catch (error) {

      setLoginError(
        error.message ||
        "Unable to log in."
      );


    } finally {

      setIsLoggingIn(false);

    }

  };


  return (

    <div className="min-h-screen flex flex-col">

      <div
        className="
          relative
          flex-1
          flex
          items-center
          justify-center
          px-6
          py-10
          overflow-hidden
        "
      >


        {/* BACKGROUND IMAGE */}

        <div

          className="
            absolute
            inset-0
            bg-cover
            bg-center
          "

          style={{
            backgroundImage:
              `url(${backgroundImage})`,
          }}

        />


        {/* GREEN / GOLD OVERLAY */}

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-[#0B5D1E]
            to-[#D6A62D]
            opacity-[0.98]
          "
        />


        {/* BACK BUTTON */}

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

          className="
            absolute
            top-6
            left-8
            !rounded-full
            w-auto
            !p-2
            z-10
          "

          onClick={() =>
            navigate("/")
          }

        />


        {/* LOGIN CARD */}

        <div
          className="
            relative
            z-10
            w-full
            max-w-md
            bg-white
            rounded-2xl
            shadow-xl
            p-6
            sm:p-8
          "
        >


          {/* LOGO */}

          <div
            className="
              flex
              items-center
              justify-center
              mb-6
            "
          >

            <img

              src={Logo}

              alt="GrainRise Logo"

              className="
                h-12
                object-contain
              "

            />

          </div>


          {/* TITLE */}

          <div
            className="
              text-center
              mb-7
            "
          >

            <h1
              className="
                text-2xl
                font-bold
                text-gray-900
              "
            >

              Administrator Login

            </h1>


            <p
              className="
                text-sm
                text-gray-500
                mt-2
              "
            >

              Sign in to access the GrainRise administration portal.

            </p>

          </div>


          {/* FORM */}

          <form
            className="space-y-4"
            onSubmit={handleSubmit}
          >


            <CustomTextbox

              label="Email Address"

              placeholder="youremail@example.com"

              type="text"

              value={email}

              onChange={(e) => {

                setEmail(
                  e.target.value
                );

                if (loginError) {
                  setLoginError("");
                }

              }}

            />


            {/* PASSWORD */}

            <div>

              <div
                className="
                  flex
                  items-center
                  justify-between
                  mb-2
                "
              >

                <label
                  className="
                    text-sm
                    font-medium
                    text-gray-700
                  "
                >

                  Password

                </label>


                <a

                  href="#"

                  onClick={(e) =>
                    e.preventDefault()
                  }

                  className="
                    text-sm
                    text-green-700
                    font-semibold
                    hover:underline
                  "
                >

                  Forgot Password?

                </a>

              </div>


              <div className="relative">

                <CustomTextbox

                  placeholder="Enter your Password"

                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }

                  value={password}

                  onChange={(e) => {

                    setPassword(
                      e.target.value
                    );

                    if (loginError) {
                      setLoginError("");
                    }

                  }}

                />


                <button

                  type="button"

                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }

                  className="
                    absolute
                    right-4
                    top-[14px]
                    text-gray-500
                    hover:text-gray-700
                  "

                  tabIndex={-1}

                >

                  {
                    showPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />
                  }

                </button>

              </div>

            </div>


            {/* ERROR */}

            {
              loginError && (

                <div
                  className="
                    bg-red-50
                    border
                    border-red-200
                    rounded-lg
                    px-4
                    py-3
                  "
                >

                  <p
                    className="
                      text-sm
                      font-medium
                      text-red-600
                    "
                  >

                    {loginError}

                  </p>

                </div>

              )
            }


            {/* LOGIN BUTTON */}

            <CustomGreenButton

              text={
                isLoggingIn
                  ? "Logging In..."
                  : "Log In"
              }

              type="submit"

              className="
                w-full
                !py-3
                !rounded-full
                mt-5
              "

            />

          </form>


          <hr
            className="
              my-5
              border-gray-200
            "
          />


          <p
            className="
              text-xs
              text-center
              text-gray-400
            "
          >

            Authorized GrainRise administrators only.

          </p>

        </div>

      </div>


      <Footer />

    </div>

  );

};


export default AdminLogin;