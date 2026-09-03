import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info, ChevronRight } from "lucide-react";

import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/smudge.jpg";

import farmerImg from "../assets/farmer.jpg";
import supplierImg from "../assets/supplier.png";
import warehouseManagerImg from "../assets/warehouse-manager.png";
import retailerImg from "../assets/retailer.jpg";

const roles = [
  {
    key: "farmer",
    title: "Farmer",
    badge: "Production & Harvest",
    description:
      "Manage farm records, submit grain harvest yields, and connect directly with rice distribution.",
    buttonText: "Register as Farmer",
    image: farmerImg,
    imagePosition: "center",
    path: "/register/farmer",
  },
  {
    key: "supplier",
    title: "Supplier",
    badge: "Sourcing & Logistics",
    description:
      "Manage grain sourcing, inventory distribution, deliveries, and supply chain operations.",
    buttonText: "Register as Supplier",
    image: supplierImg,
    imagePosition: "center",
    path: "/register/supplier",
  },
  {
    key: "warehouse",
    title: "Warehouse",
    badge: "Storage & Operations",
    description:
      "Oversee storage facilities, monitor stock inventory batches, and manage logistics dispatch.",
    buttonText: "Register as Warehouse",
    image: warehouseManagerImg,
    imagePosition: "50% 30%",
    path: "/register/warehouse-manager",
  },
  {
    key: "retailer",
    title: "Retailer",
    badge: "Retail & Sales",
    description:
      "Create an account to place grain orders, manage purchases, and track store deliveries.",
    buttonText: "Register as Retailer",
    image: retailerImg,
    imagePosition: "center",
    path: "/register/retailer",
  },
];

const RoleCard = ({ title, badge, description, buttonText, image, imagePosition = "center", onClick }) => (
  <div
    onClick={onClick}
    className="group relative bg-white/95 rounded-2xl shadow-md hover:shadow-2xl border border-emerald-100/80 overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-300"
  >
    {/* Card Image with subtle zoom */}
    <div className="relative h-48 w-full overflow-hidden bg-emerald-50">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        style={{ objectPosition: imagePosition }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      
      {/* Badge */}
      <span className="absolute top-3 right-3 text-[11px] font-semibold text-emerald-800 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-emerald-200">
        {badge}
      </span>
    </div>

    {/* Card Content */}
    <div className="p-5 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
          {title}
        </h3>
        <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
      </div>

      <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
        {description}
      </p>

      <CustomGreenButton
        text={buttonText}
        onClick={onClick}
        className="w-full !rounded-full !py-2.5 text-sm font-semibold shadow-sm group-hover:shadow-md"
      />
    </div>
  </div>
);

const RegisterGateway = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden animate-page-fade">
      {/* Gradient background matching design */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #e8f5e9 0%, #f5faf5 35%, #ffffff 65%, #bcead1 100%)",
        }}
      />
      {/* Subtle decorative radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 80% 10%, rgba(134,197,148,0.3) 0%, transparent 60%), radial-gradient(ellipse at 20% 90%, rgba(76,175,80,0.25) 0%, transparent 60%)",
        }}
      />
      {/* Background image overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          opacity: 0.42,
          mixBlendMode: "multiply",
        }}
      />

      <div className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Navigation Bar */}
        <div className="max-w-7xl mx-auto flex items-center mb-6">
          <CustomWhiteButton
            icon={
              <span className="flex items-center gap-2 px-2 text-sm font-medium whitespace-nowrap">
                <ArrowLeft size={18} />
                Back to Login
              </span>
            }
            className="!rounded-full w-auto !p-2 !px-4 shadow-sm border border-gray-200"
            onClick={() => navigate("/login")}
          />
        </div>

        {/* Header Title Section */}
        <div className="max-w-3xl mx-auto text-center mt-2 mb-10">
          <div className="flex items-center justify-center mb-5">
            <img src={Logo} alt="GrainRise Logo" className="h-12 object-contain" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight mb-3">
            Create Your GrainRise Account
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto">
            Select your role to get started with seamless grain supply and management operations.
          </p>
        </div>

        {/* 4 Combined Registration Cards (Farmer, Supplier, Warehouse, Retailer) */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role) => (
            <RoleCard
              key={role.key}
              title={role.title}
              badge={role.badge}
              description={role.description}
              buttonText={role.buttonText}
              image={role.image}
              imagePosition={role.imagePosition}
              onClick={() => navigate(role.path)}
            />
          ))}
        </div>

        {/* Helper Footer Info */}
        <div className="max-w-3xl mx-auto text-center mt-12 mb-4">
          <p className="inline-flex items-center justify-center gap-2 text-sm text-slate-500 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
            <Info size={16} className="text-emerald-600 shrink-0" />
            Select the registration option that best matches your role in the GrainRise ecosystem.
          </p>
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default RegisterGateway;