import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";

// Adjust these import paths to match your project structure
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/UserloginBG.png";

// Swap these with your real photos
import supplierImg from "../assets/supplier.png";
import warehouseManagerImg from "../assets/warehouse-manager.png";

const roles = [
  {
    key: "supplier",
    title: "Supplier",
    description: "Manage deliveries, inventory, and retailer supply operations.",
    buttonText: "Register as Supplier",
    image: supplierImg,
    path: "/register/supplier",
  },
  {
    key: "warehouse-manager",
    title: "Warehouse Manager",
    description: "Manage warehouse inventory and daily logistics operations.",
    buttonText: "Register as Warehouse Manager",
    image: warehouseManagerImg,
    path: "/register/warehouse-manager",
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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* Page color overlay at 70% opacity so the background image shows through */}
      <div className="absolute inset-0 bg-gray-100 opacity-70" />

      <div className="relative z-10 flex-1 px-6 py-10">
        <CustomWhiteButton
          icon={
            <span className="flex items-center gap-2 px-2 text-sm font-medium whitespace-nowrap">
              <ArrowLeft size={18} />
              Back to Home
            </span>
          }
          className="!rounded-full w-auto !p-2"
          onClick={() => navigate("/")}
        />

        <div className="max-w-3xl mx-auto text-center mt-6">
          <div className="flex items-center justify-center mb-6">
            <img src={Logo} alt="GrainRise Logo" className="h-12 object-contain" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
            Register as a Supply Chain Partner
          </h1>
          <p className="text-gray-500 mb-10">
            Choose your role to continue with registration.
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
          This registration portal is intended for Suppliers and Warehouse Managers only.
        </p>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default RegisterGateway;