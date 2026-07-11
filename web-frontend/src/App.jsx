import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import LandingPage from "./LandingPage";
import Login from "./Login/UserLogin"; 
import AdminLogin from "./Login/AdminLogin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;