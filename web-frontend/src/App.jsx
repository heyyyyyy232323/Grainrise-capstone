import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import LandingPage from "./LandingPage";
import Login from "./Login/UserLogin"; 
import AdminLogin from "./Login/AdminLogin";
import Register from "./Register/Register";
import SupplierWarehouseGateway from "./Register/SupplierWarehouseGateway";
import RetailerRegister from "./Register/RetailerRegister";
import WarehouseManagerRegister from "./Register/WarehouseManagerRegister";
import SupplierRegister from "./Register/SupplierRegister";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/supplier-warehouse" element={<SupplierWarehouseGateway />} />
        <Route path="/register/retailer" element={<RetailerRegister />} />
        <Route path="/register/warehouse-manager" element={<WarehouseManagerRegister />} />
        <Route path="/register/supplier" element={<SupplierRegister />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;