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
import WarehouseSalesHistory from "./Users/WarehouseAccounts/WarehouseSales/WarehouseSalesHistory";
import WarehouseOnlineOrders from "./Users/WarehouseAccounts/WarehouseSales/WarehouseOnlineOrders";
import WarehousePOS from "./Users/WarehouseAccounts/WarehouseSales/WarehousePOS";
import DeliveryManagement from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseDeliveryManagement";
import ProductReturns from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseProductReturns";
import AssignedHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseAssignedHistory";
import FulfillmentHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseFulfillmentHistory";
import Reimbursement from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseReimbursement";
import ReimbursementHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseReimbursementHistory";
import WarehouseProcurementLayout from "./Components/Major-Components/WarehouseProcurementLayout";
import WarehouseProcurementDashboard from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseProcurementDashboard";
import WarehouseReceivingOrders from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReceivingOrders";
import WarehouseGoodsReceipt from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseGoodsReceipt";
import WarehouseReturns from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReturns";
import WarehouseReceivingHistory from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReceivingHistory";
import WarehouseSuppliers from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseSuppliers";
import WarehousePaymentHistory from "./Users/WarehouseAccounts/WarehouseProcurement/WarehousePaymentHistory";
import WarehousePayables from "./Users/WarehouseAccounts/WarehouseFinance/WarehousePayables";
import WarehouseTaxes from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseTaxes";
import WarehouseReimburse from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseReimburse";
import WarehouseFinancePaymentHistory from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseFinancePaymentHistory";
import WarehouseFinanceDashboard from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseFinanceDashboard";


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
        <Route element={<WarehouseEncoderLayout role="warehouse_encoder" />}>
          <Route path="/warehouse-encoder/dashboard" element={<WarehouseEncoderDashboard />} />
          <Route path="/warehouse-encoder/orders" element={<WarehouseEncoderOrderHistory />} />
          <Route path="/warehouse-encoder/stock" element={<WarehouseEncoderStock />} />
          <Route path="/warehouse-encoder/requests" element={<WarehouseEncoderRequests />} />
        </Route>

        {/* Warehouse Sales pages (use MainPageLayout with sales role) */}
        <Route element={<WarehouseEncoderLayout role="warehouse_sales" />}>
          <Route path="/warehouse-sales/dashboard" element={<WarehouseSalesDashboard />} />
          <Route path="/warehouse-sales/point-of-sale" element={<WarehousePOS />} />
          <Route path="/warehouse-sales/sales-history" element={<WarehouseSalesHistory />} />
          <Route path="/warehouse-sales/online-orders" element={<WarehouseOnlineOrders />} />
        </Route>

        {/* Warehouse Logistics pages (use MainPageLayout with logistics role) */}
        <Route element={<WarehouseEncoderLayout role="warehouse_logistics" />}>
          <Route path="/warehouse-logistics/delivery-management" element={<DeliveryManagement />} />
          <Route path="/warehouse-logistics/product-returns" element={<ProductReturns />} />
          <Route path="/warehouse-logistics/reimbursement" element={<Reimbursement />} />
          <Route path="/warehouse-logistics/reimbursement-history" element={<ReimbursementHistory />} />
          <Route path="/warehouse-logistics/assigned-history" element={<AssignedHistory />} />
          <Route path="/warehouse-logistics/fulfillment-history" element={<FulfillmentHistory />} />
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
        {/* Warehouse Finance pages */}
        <Route element={<WarehouseEncoderLayout role="warehouse_finance" />}>
          <Route path="/warehouse-finance/dashboard" element={<WarehouseFinanceDashboard />} />
          <Route path="/warehouse-finance/payables" element={<WarehousePayables />} />
          <Route path="/warehouse-finance/taxes" element={<WarehouseTaxes />} />
          <Route path="/warehouse-finance/reimburse" element={<WarehouseReimburse />} />
          <Route path="/warehouse-finance/payment-history" element={<WarehouseFinancePaymentHistory />} />
        </Route>
      </Routes> 
    </BrowserRouter>
  );
}

export default App;