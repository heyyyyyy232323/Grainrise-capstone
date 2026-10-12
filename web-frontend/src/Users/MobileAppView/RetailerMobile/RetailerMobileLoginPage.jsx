import React from "react";
import { useNavigate } from "react-router-dom";
import StartupMobileLoginView from "../StartupMobile/StartupMobileLoginView";

/**
 * RetailerMobileLoginPage
 *
 * Standalone wrapper for the Mobile Login Screen.
 * Accessible at: /retailer/mobile-login
 *
 * Used as the redirect target when the user clicks "Log In" from the
 * Retailer Mobile Registration page.
 */
export default function RetailerMobileLoginPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-white">
      <StartupMobileLoginView
        onBack={() => navigate(-1)}
        onLoginSuccess={({ email }) => {
          // For now, just log — real auth would redirect to /retailer/dashboard
          console.log("Login success:", email);
        }}
        onForgotPassword={() => {
          navigate("/forgot-password");
        }}
        onRegister={() => {
          navigate("/retailer/mobile-register");
        }}
      />
    </div>
  );
}
