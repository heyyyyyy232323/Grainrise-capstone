import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import { LoadingProvider } from "./Components/context/LoadingContext";
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
import FloatingChatbot from "./Components/Minor-Components/FloatingChatbot";
import GlobalLoadingScreen from "./Components/Minor-Components/GlobalLoadingScreen";

// Common User Profile
import UserAccountProfile from "./Components/Major-Components/AccountPorfileSettings"; // Adjust import path if needed

// Warehouse Encoder
import WarehouseEncoderDashboard from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderDashboard";
import WarehouseEncoderOrderHistory from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderOrderHistory";
import WarehouseEncoderStock from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderStockManagement";
import WarehouseEncoderRequests from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderNewRequest"; 

// Warehouse Sales
import WarehouseSalesDashboard from "./Users/WarehouseAccounts/WarehouseSales/WarehouseSalesDashboard";
import WarehouseSalesHistory from "./Users/WarehouseAccounts/WarehouseSales/WarehouseSalesHistory";
import WarehouseOnlineOrders from "./Users/WarehouseAccounts/WarehouseSales/WarehouseOnlineOrders";
import WarehousePOS from "./Users/WarehouseAccounts/WarehouseSales/WarehousePOS";

// Warehouse Logistics
import DeliveryManagement from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseDeliveryManagement";
import ProductReturns from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseProductReturns";
import AssignedHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseAssignedHistory";
import FulfillmentHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseFulfillmentHistory";
import Reimbursement from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseReimbursement";
import ReimbursementHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseReimbursementHistory";
import WarehouseLogisticsDashboard from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseLogisticsDashboard";

// Warehouse Procurement
import WarehouseProcurementLayout from "./Components/Major-Components/WarehouseProcurementLayout";
import WarehouseProcurementDashboard from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseProcurementDashboard";
import WarehouseReceivingOrders from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReceivingOrders";
import WarehouseGoodsReceipt from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseGoodsReceipt";
import WarehouseReturns from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReturns";
import WarehouseReceivingHistory from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReceivingHistory";
import WarehouseSuppliers from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseSuppliers";
import WarehousePaymentHistory from "./Users/WarehouseAccounts/WarehouseProcurement/WarehousePaymentHistory";

// Warehouse Finance
import WarehousePayables from "./Users/WarehouseAccounts/WarehouseFinance/WarehousePayables";
import WarehouseTaxes from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseTaxes";
import WarehouseReimburse from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseReimburse";
import WarehouseFinancePaymentHistory from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseFinancePaymentHistory";
import WarehouseFinanceDashboard from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseFinanceDashboard";

// Warehouse Manager
import WarehouseManagerDashboard from "./Users/WarehouseAccounts/WarehouseManager/WarehouseManagerDashboard";
import BranchManagement from "./Users/WarehouseAccounts/WarehouseManager/BranchManagement";
import EmployeeManagement from "./Users/WarehouseAccounts/WarehouseManager/EmployeeManagement";
import OrderApproval from "./Users/WarehouseAccounts/WarehouseManager/OrderApproval";
import PerformanceMonitoring from "./Users/WarehouseAccounts/WarehouseManager/PerformanceMonitoring";
import WarehouseManagerFulfillmentHistory from "./Users/WarehouseAccounts/WarehouseManager/FulfillmentHistory";
import WarehouseManagerSalesHistory from "./Users/WarehouseAccounts/WarehouseManager/SalesHistory";
import ProcurementReceivingHistory from "./Users/WarehouseAccounts/WarehouseManager/ProcurementReceivingHistory";
import FinanceManagementHistory from "./Users/WarehouseAccounts/WarehouseManager/FinanceManagementHistory";
import WarehouseManagerNewsUpdates from "./Users/WarehouseAccounts/WarehouseManager/WarehouseManagerNewsUpdates";
import WarehouseManagerNewsArticle from "./Users/WarehouseAccounts/WarehouseManager/WarehouseManagerNewsArticle";

// Miller Accounts
import MillerEncoderDashboard from "./Users/MillerAccounts/MillerEncoder/MillerEncoderDashboard";
import MillerEncoderOrderHistory from "./Users/MillerAccounts/MillerEncoder/MillerEncoderOrderHistory";
import MillerEncoderRequestOrders from "./Users/MillerAccounts/MillerEncoder/MillerEncoderRequestOrders";
import MillerEncoderStockManagement from "./Users/MillerAccounts/MillerEncoder/MillerEncoderStockManagement";

// Miller Finance
import MillerFinanceDashboard from "./Users/MillerAccounts/MillerFinance/MillerFinanceDashboard";
import MillerFinancePaymentHistory from "./Users/MillerAccounts/MillerFinance/MillerFinancePaymentHistory";
import MillerPayables from "./Users/MillerAccounts/MillerFinance/MillerPayables";
import MillerReimburse from "./Users/MillerAccounts/MillerFinance/MillerReimburse";
import MillerTaxes from "./Users/MillerAccounts/MillerFinance/MillerTaxes";

// Miller Logistics
import MillerLogisticsDashboard from "./Users/MillerAccounts/MillerLogistics/MillerLogisticsDashboard";
import MillerAssignedHistory from "./Users/MillerAccounts/MillerLogistics/MillerAssignedHistory";
import MillerDeliveryManagement from "./Users/MillerAccounts/MillerLogistics/MillerDeliveryManagement";
import MillerFulfillmentHistory from "./Users/MillerAccounts/MillerLogistics/MillerFulfillmentHistory";
import MillerProductReturns from "./Users/MillerAccounts/MillerLogistics/MillerProductReturns";
import MillerReimbursement from "./Users/MillerAccounts/MillerLogistics/MillerReimbursement";
import MillerReimbursementHistory from "./Users/MillerAccounts/MillerLogistics/MillerReimbursementHistory";

// Miller Sales
import MillerOnlineOrders from "./Users/MillerAccounts/MillerSales/MillerOnlineOrders";
import MillerPOS from "./Users/MillerAccounts/MillerSales/MillerPOS";
import MillerSalesDashboard from "./Users/MillerAccounts/MillerSales/MillerSalesDashboard";
import MillerSalesHistory from "./Users/MillerAccounts/MillerSales/MillerSalesHistory";

// Admin
import AdminDashboard from "./Users/AdminAccounts/AccountAdmin/AdminDashboard";
import SupplierManagement from "./Users/AdminAccounts/AccountAdmin/SupplierManagement";
import WarehouseManagement from "./Users/AdminAccounts/AccountAdmin/WarehouseManagement";
import RetailerManagement from "./Users/AdminAccounts/AccountAdmin/RetailerManagement";
import EmailUsers from "./Users/AdminAccounts/AccountAdmin/EmailUsers";

// Retailer
import RetailerDashboard from "./Users/RetailerAccounts/RetailerDashboard";
import RetailerPointOfSale from "./Users/RetailerAccounts/RetailerPointOfSale";
import RetailerSalesHistory from "./Users/RetailerAccounts/RetailerSalesHistory";
import RetailerInventory from "./Users/RetailerAccounts/RetailerInventory";
import RetailerMarketplace from "./Users/RetailerAccounts/RetailerMarketplace";
import RetailerProductReturns from "./Users/RetailerAccounts/RetailerProductReturns";
import RetailerMyPurchases from "./Users/RetailerAccounts/RetailerMyPurchases";
import RetailerOrderTracking from "./Users/RetailerAccounts/RetailerOrderTracking";
import RetailerMessages from "./Users/RetailerAccounts/RetailerMessages";
import RetailerNewsUpdates from "./Users/RetailerAccounts/RetailerNewsUpdates";
import RetailerNewsArticle from "./Users/RetailerAccounts/RetailerNewsArticle";

// Farmer
import FarmerDashboard from "./Users/FarmersAccounts/FarmerDashboard";
import FarmerForecasting from "./Users/FarmersAccounts/FarmerForecasting";
import FarmerContracts from "./Users/FarmersAccounts/FarmerContracts";
import FarmerNewsUpdates from "./Users/FarmersAccounts/FarmerNewsUpdates";
import FarmerNewsArticle from "./Users/FarmersAccounts/FarmerNewsArticle";
import FarmerFarmManagement from "./Users/FarmersAccounts/FarmerFarmManagement";
import FarmerPointOfSale from "./Users/FarmersAccounts/FarmerPointOfSale";
import FarmerTransactionHistory from "./Users/FarmersAccounts/FarmerTransactionHistory";

function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <GlobalLoadingScreen />
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

          {/* Direct Profile Route fallback */}
          <Route element={<WarehouseEncoderLayout role="retailer" />}>
            <Route path="/account-profile" element={<UserAccountProfile />} />
          </Route>

          {/* Warehouse Encoder pages */}
          <Route element={<WarehouseEncoderLayout role="warehouse_encoder" />}>
            <Route path="/warehouse-encoder/dashboard" element={<WarehouseEncoderDashboard />} />
            <Route path="/warehouse-encoder/orders" element={<WarehouseEncoderOrderHistory />} />
            <Route path="/warehouse-encoder/stock" element={<WarehouseEncoderStock />} />
            <Route path="/warehouse-encoder/requests" element={<WarehouseEncoderRequests />} />
            <Route path="/warehouse-encoder/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Warehouse Sales pages */}
          <Route element={<WarehouseEncoderLayout role="warehouse_sales" />}>
            <Route path="/warehouse-sales/dashboard" element={<WarehouseSalesDashboard />} />
            <Route path="/warehouse-sales/point-of-sale" element={<WarehousePOS />} />
            <Route path="/warehouse-sales/sales-history" element={<WarehouseSalesHistory />} />
            <Route path="/warehouse-sales/online-orders" element={<WarehouseOnlineOrders />} />
            <Route path="/warehouse-sales/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Warehouse Logistics pages */}
          <Route element={<WarehouseEncoderLayout role="warehouse_logistics" />}>
            <Route path="/warehouse-logistics/dashboard" element={<WarehouseLogisticsDashboard />} />
            <Route path="/warehouse-logistics/delivery-management" element={<DeliveryManagement />} />
            <Route path="/warehouse-logistics/product-returns" element={<ProductReturns />} />
            <Route path="/warehouse-logistics/reimbursement" element={<Reimbursement />} />
            <Route path="/warehouse-logistics/reimbursement-history" element={<ReimbursementHistory />} />
            <Route path="/warehouse-logistics/assigned-history" element={<AssignedHistory />} />
            <Route path="/warehouse-logistics/fulfillment-history" element={<FulfillmentHistory />} />
            <Route path="/warehouse-logistics/profile" element={<UserAccountProfile />} />
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
            <Route path="/warehouse-procurement/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Warehouse Finance pages */}
          <Route element={<WarehouseEncoderLayout role="warehouse_finance" />}>
            <Route path="/warehouse-finance/dashboard" element={<WarehouseFinanceDashboard />} />
            <Route path="/warehouse-finance/payables" element={<WarehousePayables />} />
            <Route path="/warehouse-finance/taxes" element={<WarehouseTaxes />} />
            <Route path="/warehouse-finance/reimburse" element={<WarehouseReimburse />} />
            <Route path="/warehouse-finance/payment-history" element={<WarehouseFinancePaymentHistory />} />
            <Route path="/warehouse-finance/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Warehouse Manager pages */}
          <Route element={<WarehouseEncoderLayout role="warehouse_manager" />}>
            <Route path="/warehouse-manager/dashboard" element={<WarehouseManagerDashboard />} />
            <Route path="/warehouse-manager/branches" element={<BranchManagement />} />
            <Route path="/warehouse-manager/branches/:branchId/employees" element={<EmployeeManagement />} />
            <Route path="/warehouse-manager/order-approval" element={<OrderApproval />} />
            <Route path="/warehouse-manager/performance" element={<PerformanceMonitoring />} />
            <Route path="/warehouse-manager/fulfillment-history" element={<WarehouseManagerFulfillmentHistory />} />
            <Route path="/warehouse-manager/sales-history" element={<WarehouseManagerSalesHistory />} />
            <Route path="/warehouse-manager/procurement-history" element={<ProcurementReceivingHistory />} />
            <Route path="/warehouse-manager/finance-history" element={<FinanceManagementHistory />} />
            <Route path="/warehouse-manager/news-updates" element={<WarehouseManagerNewsUpdates />} />
            <Route path="/warehouse-manager/news-updates/:id" element={<WarehouseManagerNewsArticle />} />
            <Route path="/warehouse-manager/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Supplier Encoder pages */}
          <Route element={<WarehouseEncoderLayout role="supplier_encoder" />}>
            <Route path="/supplier-encoder/dashboard" element={<MillerEncoderDashboard />} />
            <Route path="/supplier-encoder/orders" element={<MillerEncoderOrderHistory />} />
            <Route path="/supplier-encoder/requests" element={<MillerEncoderRequestOrders />} />
            <Route path="/supplier-encoder/stock" element={<MillerEncoderStockManagement />} />
            <Route path="/supplier-encoder/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Miller Sales pages */}
          <Route element={<WarehouseEncoderLayout role="miller_sales" />}>
            <Route path="/miller-sales/dashboard" element={<MillerSalesDashboard />} />
            <Route path="/miller-sales/point-of-sale" element={<MillerPOS />} />
            <Route path="/miller-sales/sales-history" element={<MillerSalesHistory />} />
            <Route path="/miller-sales/online-orders" element={<MillerOnlineOrders />} />
            <Route path="/miller-sales/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Miller Logistics pages */}
          <Route element={<WarehouseEncoderLayout role="miller_logistics" />}>
            <Route path="/miller-logistics/dashboard" element={<MillerLogisticsDashboard />} />
            <Route path="/miller-logistics/delivery-management" element={<MillerDeliveryManagement />} />
            <Route path="/miller-logistics/product-returns" element={<MillerProductReturns />} />
            <Route path="/miller-logistics/reimbursement" element={<MillerReimbursement />} />
            <Route path="/miller-logistics/reimbursement-history" element={<MillerReimbursementHistory />} />
            <Route path="/miller-logistics/assigned-history" element={<MillerAssignedHistory />} />
            <Route path="/miller-logistics/fulfillment-history" element={<MillerFulfillmentHistory />} />
            <Route path="/miller-logistics/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Miller Finance pages */}
          <Route element={<WarehouseEncoderLayout role="miller_finance" />}>
            <Route path="/miller-finance/dashboard" element={<MillerFinanceDashboard />} />
            <Route path="/miller-finance/payables" element={<MillerPayables />} />
            <Route path="/miller-finance/taxes" element={<MillerTaxes />} />
            <Route path="/miller-finance/reimburse" element={<MillerReimburse />} />
            <Route path="/miller-finance/payment-history" element={<MillerFinancePaymentHistory />} />
            <Route path="/miller-finance/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Retailer pages */}
          <Route element={<WarehouseEncoderLayout role="retailer" />}>
            <Route path="/retailer/dashboard" element={<RetailerDashboard />} />
            <Route path="/retailer/point-of-sale" element={<RetailerPointOfSale />} />
            <Route path="/retailer/sales-history" element={<RetailerSalesHistory />} />
            <Route path="/retailer/inventory" element={<RetailerInventory />} />
            <Route path="/retailer/warehouse-marketplace" element={<RetailerMarketplace />} />
            <Route path="/retailer/order-tracking" element={<RetailerOrderTracking />} />
            <Route path="/retailer/product-returns" element={<RetailerProductReturns />} />
            <Route path="/retailer/my-purchases" element={<RetailerMyPurchases />} />
            <Route path="/retailer/messages" element={<RetailerMessages />} />
            <Route path="/retailer/news-updates" element={<RetailerNewsUpdates />} />
            <Route path="/retailer/news-updates/:id" element={<RetailerNewsArticle />} />
            <Route path="/retailer/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Farmer pages */}
          <Route element={<WarehouseEncoderLayout role="farmer" />}>
            <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
            <Route path="/farmer/forecasting" element={<FarmerForecasting />} />
            <Route path="/farmer/contracts" element={<FarmerContracts />} />
            <Route path="/farmer/news-updates" element={<FarmerNewsUpdates />} />
            <Route path="/farmer/news-updates/:id" element={<FarmerNewsArticle />} />
            <Route path="/farmer/farm-management" element={<FarmerFarmManagement />} />
            <Route path="/farmer/point-of-sale" element={<FarmerPointOfSale />} />
            <Route path="/farmer/transaction-history" element={<FarmerTransactionHistory />} />
            <Route path="/farmer/profile" element={<UserAccountProfile />} />
          </Route>

          {/* Admin pages */}
          <Route element={<WarehouseEncoderLayout role="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/suppliers" element={<SupplierManagement />} />
            <Route path="/admin/warehouses" element={<WarehouseManagement />} />
            <Route path="/admin/retailers" element={<RetailerManagement />} />
            <Route path="/admin/email-users" element={<EmailUsers />} />
            <Route path="/admin/profile" element={<UserAccountProfile />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Floating chatbot — mounted outside BrowserRouter */}
      <FloatingChatbot />
    </LoadingProvider>
  );
}

export default App;