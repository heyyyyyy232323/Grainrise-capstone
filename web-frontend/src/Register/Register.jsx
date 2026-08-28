import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";

import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/smudge.jpg";


import retailerImg from "../assets/retailer.jpg";
import farmerImg from "../assets/farmer.jpg";

const roles = [
  {
    key: "retailer",
    title: "Retailer",
    description:
      "Create an account to place orders, manage purchases, and track deliveries.",
    buttonText: "Register as Retailer",
    image: retailerImg,
    path: "/register/retailer",
  },
  {
    key: "farmer",
    title: "Farmer",
    description:
      "Create an account to manage farm information, submit harvests, and supply rice products.",
    buttonText: "Register as Farmer",
    image: farmerImg,
    path: "/register/farmer",
  },
];

const RoleCard = ({ title, description, buttonText, image, onClick }) => (
  
  <div
    onClick={onClick}
    className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
  >
    <img src={image} alt={title} className="w-full h-56 object-cover" />
    <div className="p-6 flex flex-col flex-1">
      <h3 className="text-xl font-bold text-green-700 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-6 flex-1">{description}</p>
      <CustomGreenButton
        text={buttonText}
        onClick={onClick}
        className="w-full !rounded-full !py-3"
      />
    </div>
  </div>
);

const RegisterGateway = () => {
  const navigate = useNavigate();

  return (

    <div className="min-h-screen flex flex-col relative overflow-hidden animate-page-fade">
      {/* Gradient background matching Figma design */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(135deg, #e8f5e9 0%, #f5faf5 35%, #ffffff 65%, #bcead1 100%)"
      }} />
      {/* Subtle decorative radial glow */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 80% 10%, rgba(134,197,148,0.3) 0%, transparent 60%), radial-gradient(ellipse at 20% 90%, rgba(76,175,80,0.25) 0%, transparent 60%)"
      }} />
      {/* Background image overlay matching CTA style */}
      <div className="absolute inset-0 bg-cover bg-center pointer-events-none" style={{
        backgroundImage: `url(${backgroundImage})`,
        opacity: 0.42,
        mixBlendMode: "multiply"
      }} />

      <div className="relative z-10 flex-1 px-6 py-10">
        <CustomWhiteButton
          icon={
            <span className="flex items-center gap-2 px-2 text-sm font-medium whitespace-nowrap">
              <ArrowLeft size={18} />
              Back to Login
            </span>
          }
          className="absolute top-6 left-8 !rounded-full w-auto !p-2 z-20 shadow-md border border-gray-200"
          onClick={() => navigate("/login")}
        />

        <div className="max-w-3xl mx-auto text-center mt-6">
          <div className="flex items-center justify-center mb-6">
            <img src={Logo} alt="GrainRise Logo" className="h-12 object-contain" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            Create Your GrainRise Account
          </h1>
          <p className="text-gray-500 mb-10">
            Choose the registration option that matches your role.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {roles.map((role) => (
            <RoleCard
              key={role.key}
              title={role.title}
              description={role.description}
              buttonText={role.buttonText}
              image={role.image}
              onClick={() => navigate(role.path)}
            />
          ))}
        </div>

        <p className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-10">
          <Info size={16} />
          Select the registration option that best matches your role in the GrainRise ecosystem.
        </p>
      </div>

      <div className="relative z-10">
        <Footer />

      </div>
    </div>
  );
};

export default RegisterGateway;