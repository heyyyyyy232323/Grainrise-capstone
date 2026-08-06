import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import LandingPage from "./LandingPage";
import Login from "./Login/UserLogin";
import AdminLogin from "./Login/AdminLogin";
import Register from "./Register/Register";
import SupplierWarehouseGateway from "./Register/SupplierWarehouseGateway";
import RetailerRegister from "./Register/RetailerRegister";
import DashboardPreview from "./DashboardPreview";
import WarehouseManagerRegister from "./Register/WarehouseManagerRegister";
import SupplierRegister from "./Register/SupplierRegister";
import FarmerRegister from "./Register/FarmerRegister";
import WarehouseEncoderLayout from "./Components/Major-Components/MainPageLayout";
import WarehouseEncoderDashboard from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderDashboard";
import WarehouseEncoderOrderHistory from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderOrderHistory";
import WarehouseEncoderStock from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderStockManagement";
import WarehouseEncoderRequests from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderNewRequest"; 
import WarehouseSalesDashboard from "./Users/WarehouseAccounts/WarehouseSales/WarehouseSalesDashboard";
import WarehouseSalesLayout from "./Components/Major-Components/WarehouseSalesLayout";
import WarehouseSalesHistory from "./Users/WarehouseAccounts/WarehouseSales/WarehouseSalesHistory";
import WarehouseOnlineOrders from "./Users/WarehouseAccounts/WarehouseSales/WarehouseOnlineOrders";
import WarehouseProcurementLayout from "./Components/Major-Components/WarehouseProcurementLayout";
import WarehouseProcurementDashboard from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseProcurementDashboard";
import WarehouseReceivingOrders from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReceivingOrders";
import WarehouseGoodsReceipt from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseGoodsReceipt";
import WarehouseReturns from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReturns";
import WarehouseReceivingHistory from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReceivingHistory";
import WarehouseSuppliers from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseSuppliers";
import WarehousePaymentHistory from "./Users/WarehouseAccounts/WarehouseProcurement/WarehousePaymentHistory";

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
        <Route path="/dashboard-preview" element={<DashboardPreview />} />
        <Route path="/register/warehouse-manager" element={<WarehouseManagerRegister />} />
        <Route path="/register/supplier" element={<SupplierRegister />} />
        <Route path="/register/farmer" element={<FarmerRegister />} />

        {/* Warehouse Encoder pages share one Layout so sidebar state persists across them */}
        <Route element={<WarehouseEncoderLayout />}>
          <Route path="/warehouse-encoder/dashboard" element={<WarehouseEncoderDashboard />} />
          <Route path="/warehouse-encoder/orders" element={<WarehouseEncoderOrderHistory />} />
          <Route path="/warehouse-encoder/stock" element={<WarehouseEncoderStock />} />
          <Route path="/warehouse-encoder/requests" element={<WarehouseEncoderRequests />} />
        </Route>

        {/* Warehouse Sales pages */}
        <Route element={<WarehouseSalesLayout />}>
          <Route path="/warehouse-sales/dashboard" element={<WarehouseSalesDashboard />} />
          <Route path="/warehouse-sales/sales-history" element={<WarehouseSalesHistory />} />
          <Route path="/warehouse-sales/online-orders" element={<WarehouseOnlineOrders />} />
        </Route>

        {/* Warehouse Procurement pages */}
        <Route element={<WarehouseProcurementLayout />}>
          <Route path="/warehouse-procurement/dashboard" element={<WarehouseProcurementDashboard />} />
          <Route path="/warehouse-procurement/receiving-orders" element={<WarehouseReceivingOrders />} />
          <Route path="/warehouse-procurement/goods-receipt" element={<WarehouseGoodsReceipt />} />
          <Route path="/warehouse-procurement/returns" element={<WarehouseReturns />} />
          <Route path="/warehouse-procurement/receiving-history" element={<WarehouseReceivingHistory />} />
          <Route path="/warehouse-procurement/suppliers" element={<WarehouseSuppliers />} />
          <Route path="/warehouse-procurement/payment-history" element={<WarehousePaymentHistory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;