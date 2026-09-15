import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";

import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/smudge.jpg";

import farmerImg from "../assets/farmerr.png";
import warehouseOwnerImg from "../assets/warehouseowner.png";
import millerImg from "../assets/miller.png";
import retailerImg from "../assets/retailer3.png";
import consumerImg from "../assets/consumer.png";

const roles = [
  {
    key: "farmer",
    title: "Farmer",
    description: "Manage farms, harvests, and production.",
    image: farmerImg,
    imagePosition: "center top",
    path: "/register/farmer",
  },
  {
    key: "warehouse-owner",
    title: "Warehouse Owner",
    description: "Oversee inventory, storage, and logistics.",
    image: warehouseOwnerImg,
    imagePosition: "center",
    path: "/register/warehouse-manager",
  },
  {
    key: "miller",
    title: "Miller",
    description: "Manage supply, deliveries, and distribution.",
    image: millerImg,
    imagePosition: "center top",
    path: "/register/supplier",
  },
  {
    key: "retailer",
    title: "Retailer",
    description: "Process, manage, and supply rice products.",
    image: retailerImg,
    imagePosition: "center top",
    path: "/register/retailer",
  },
  {
    key: "consumer",
    title: "Consumer",
    description: "Buy rice products for personal or household needs.",
    image: consumerImg,
    imagePosition: "center top",
    path: "/register",
  },
];

const RoleCard = ({ title, description, image, imagePosition = "center", onClick, delay = 0 }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      flexDirection: "column",
      cursor: "pointer",
      animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`,
    }}
    className="dark-readable-register-card group rounded-xl overflow-hidden border border-gray-200 bg-white transition-all duration-300 hover:shadow-xl hover:border-green-400 hover:-translate-y-1"
  >
    {/* Image fills top — tall to maximize card */}
    <div className="w-full flex-shrink-0 overflow-hidden" style={{ height: "210px" }}>
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        style={{ objectPosition: imagePosition }}
      />
    </div>

    {/* Card text + button */}
    <div className="p-4 flex flex-col flex-1">
      <h3 className="font-bold text-gray-900 mb-1" style={{ fontSize: "15px" }}>
        {title}
      </h3>
      <p className="text-gray-500 leading-snug flex-1" style={{ fontSize: "12px" }}>
        {description}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="w-full font-semibold text-white rounded-md transition-all duration-200 hover:brightness-110 active:scale-95 focus:outline-none mt-4"
        style={{ backgroundColor: "#2d7a2d", padding: "8px 0", fontSize: "14px" }}
      >
        Continue
      </button>
    </div>
  </div>
);

const RegisterGateway = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      className="dark-readable-register"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#e6e6e6",
        position: "relative",
      }}
    >
      {/* Inline Keyframes style injection */}
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>

      {/* Smudge texture — fixed full-screen */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.45,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Main layout — fills full viewport height */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Back to Home — top left */}
        <div
          style={{
            padding: "20px 32px 0",
            animation: "fadeIn 0.5s ease-out both",
          }}
        >
          <button
            onClick={() => navigate("/")}
            className="dark-readable-register-back"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              color: "#374151",
              fontSize: "13px",
              fontWeight: 500,
              padding: "8px 18px",
              borderRadius: "999px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)")}
          >
            <ArrowLeft size={14} />
            Back to Home
          </button>
        </div>

        {/* Centered body — expands to fill remaining viewport */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 40px",
          }}
        >
          {/* Logo & Header Container with Fade-in animation */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            {/* Logo */}
            <img
              src={Logo}
              alt="GrainRise Logo"
              style={{ height: "52px", objectFit: "contain", marginBottom: "16px" }}
            />

            {/* Title */}
            <h1
              className="dark-readable-register-title"
              style={{
                fontSize: "clamp(26px, 3vw, 36px)",
                fontWeight: 800,
                color: "#111827",
                textAlign: "center",
                marginBottom: "6px",
                letterSpacing: "-0.5px",
              }}
            >
              Get Started with GrainRise
            </h1>

            {/* Subtitle */}
            <p
              className="dark-readable-register-subtitle"
              style={{
                fontSize: "14px",
                color: "#6b7280",
                textAlign: "center",
                marginBottom: "32px",
              }}
            >
              Select an account type to begin your registration.
            </p>
          </div>

          {/* 5 role cards — full width up to 1300px */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "20px",
              width: "100%",
              maxWidth: "1300px",
            }}
          >
            {isLoaded &&
              roles.map((role, idx) => (
                <RoleCard
                  key={role.key}
                  title={role.title}
                  description={role.description}
                  image={role.image}
                  imagePosition={role.imagePosition}
                  delay={120 + idx * 80} // Staggered delay for sequential entrance
                  onClick={() => navigate(role.path)}
                />
              ))}
          </div>

          {/* Disclaimer */}
          <div
            style={{
              marginTop: "28px",
              animation: "fadeIn 0.8s ease-out 550ms both",
            }}
          >
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              <Info size={13} style={{ flexShrink: 0 }} />
              This registration portal is intended for Suppliers and Warehouse Managers only.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Footer />
      </div>
    </div>
  );
};

export default RegisterGateway;