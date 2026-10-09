import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from "react";

import LandingPage from "./LandingPage";
import Login from "./Login/UserLogin";
import AdminLogin from "./Login/AdminLogin";
import ForgotPassword from "./Login/ForgotPassword";
import ChangePassword from "./Login/ChangePassword";
import CompleteProfile from "./Login/CompleteProfile";
import DashboardPreview from "./DashboardPreview";

import WarehouseEncoderLayout from "./Components/Major-Components/MainPageLayout";
import AdminProtectedRoute from "./Components/Major-Components/AdminProtectedRoute";
import ToastPreviewPage from "./Components/Modals/ToastPreviewPage";

import FloatingChatbot from "./Components/Minor-Components/FloatingChatbot";
import GlobalLoadingScreen from "./Components/Minor-Components/GlobalLoadingScreen.jsx";
import ScrollToTop from "./Components/Minor-Components/ScrollToTop";
import ContactUs from "./Support/ContactUs";
import PartnerWithUs from "./Support/PartnerWithUs";
import ContactSupport from "./Support/ContactSupport";
import LoginAssistance from "./Support/LoginAssistance";
import FrequentlyAskedQuestions from "./Support/FrequentlyAskedQuestions";
import RegistrationGuide from "./Support/RegistrationGuide";
import PrivacyPolicy from "./Support/PrivacyPolicy";
import TermsPolicies from "./Support/TermsPolicies";


// ============================================================
// COMMON USER PROFILE
// ============================================================

import UserAccountProfile from "./Components/Major-Components/AccountPorfileSettings";


// ============================================================
// WAREHOUSE ENCODER
// ============================================================

import WarehouseEncoderDashboard from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderDashboard";
import WarehouseEncoderOrderHistory from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderOrderHistory";
import WarehouseEncoderStock from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderStockManagement";
import WarehouseEncoderRequests from "./Users/WarehouseAccounts/WarehouseEncoder/WarehouseEncoderNewRequest";


// ============================================================
// WAREHOUSE SALES
// ============================================================

import WarehouseSalesDashboard from "./Users/WarehouseAccounts/WarehouseSales/WarehouseSalesDashboard";
import WarehouseSalesHistory from "./Users/WarehouseAccounts/WarehouseSales/WarehouseSalesHistory";
import WarehouseOnlineOrders from "./Users/WarehouseAccounts/WarehouseSales/WarehouseOnlineOrders";
import WarehousePOS from "./Users/WarehouseAccounts/WarehouseSales/WarehousePOS";


// ============================================================
// WAREHOUSE LOGISTICS
// ============================================================

import DeliveryManagement from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseDeliveryManagement";
import ProductReturns from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseProductReturns";
import AssignedHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseAssignedHistory";
import FulfillmentHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseFulfillmentHistory";
import Reimbursement from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseReimbursement";
import ReimbursementHistory from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseReimbursementHistory";
import WarehouseLogisticsDashboard from "./Users/WarehouseAccounts/WarehouseLogistics/WarehouseLogisticsDashboard";


// ============================================================
// WAREHOUSE PROCUREMENT
// ============================================================

import WarehouseProcurementLayout from "./Components/Major-Components/WarehouseProcurementLayout";
import WarehouseProcurementDashboard from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseProcurementDashboard";
import WarehouseReceivingOrders from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReceivingOrders";
import WarehouseGoodsReceipt from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseGoodsReceipt";
import WarehouseReturns from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReturns";
import WarehouseReceivingHistory from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseReceivingHistory";
import WarehouseSuppliers from "./Users/WarehouseAccounts/WarehouseProcurement/WarehouseSuppliers";
import WarehousePaymentHistory from "./Users/WarehouseAccounts/WarehouseProcurement/WarehousePaymentHistory";


// ============================================================
// WAREHOUSE FINANCE
// ============================================================

import WarehousePayables from "./Users/WarehouseAccounts/WarehouseFinance/WarehousePayables";
import WarehouseTaxes from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseTaxes";
import WarehouseReimburse from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseReimburse";
import WarehouseFinancePaymentHistory from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseFinancePaymentHistory";
import WarehouseFinanceDashboard from "./Users/WarehouseAccounts/WarehouseFinance/WarehouseFinanceDashboard";


// ============================================================
// WAREHOUSE MANAGER
// ============================================================

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
import WarehouseManagerMessages from "./Users/WarehouseAccounts/WarehouseManager/WarehouseManagerMessages";

// ============================================================
// BRANCH MANAGER
// ============================================================

import BranchManagerDashboard from "./Users/WarehouseAccounts/BranchManager/WarehouseManagerDashboard";
import BranchManagerOrderApproval from "./Users/WarehouseAccounts/BranchManager/OrderApproval";
import BranchManagerPerformanceMonitoring from "./Users/WarehouseAccounts/BranchManager/PerformanceMonitoring";
import BranchManagerFulfillmentHistory from "./Users/WarehouseAccounts/BranchManager/FulfillmentHistory";
import BranchManagerSalesHistory from "./Users/WarehouseAccounts/BranchManager/SalesHistory";
import BranchManagerProcurementReceivingHistory from "./Users/WarehouseAccounts/BranchManager/ProcurementReceivingHistory";
import BranchManagerFinanceManagementHistory from "./Users/WarehouseAccounts/BranchManager/FinanceManagementHistory";
import BranchManagerNewsUpdates from "./Users/WarehouseAccounts/BranchManager/WarehouseManagerNewsUpdates";
import BranchManagerNewsArticle from "./Users/WarehouseAccounts/BranchManager/WarehouseManagerNewsArticle";


// ============================================================
// WAREHOUSE DRIVER
// ============================================================

import WarehouseDriverDashboard from "./Users/WarehouseAccounts/WarehouseDriver/WarehouseDriverDashboard";
import DriverMyDuties from "./Users/WarehouseAccounts/WarehouseDriver/DriverMyDuties";
import DriverAssignedHistory from "./Users/WarehouseAccounts/WarehouseDriver/DriverAssignedHistory";
import DriverMessages from "./Users/WarehouseAccounts/WarehouseDriver/DriverMessages";
import DriverPaymentSubmission from "./Users/WarehouseAccounts/WarehouseDriver/DriverPaymentSubmission";
import DriverReimbursement from "./Users/WarehouseAccounts/WarehouseDriver/DriverReimbursement";
import DriverReimbursementHistory from "./Users/WarehouseAccounts/WarehouseDriver/DriverReimbursementHistory";


// ============================================================
// MILLER ENCODER
// ============================================================

import MillerEncoderDashboard from "./Users/MillerAccounts/MillerEncoder/MillerEncoderDashboard";
import MillerEncoderOrderHistory from "./Users/MillerAccounts/MillerEncoder/MillerEncoderOrderHistory";
import MillerEncoderRequestOrders from "./Users/MillerAccounts/MillerEncoder/MillerEncoderRequestOrders";
import MillerEncoderStockManagement from "./Users/MillerAccounts/MillerEncoder/MillerEncoderStockManagement";


// ============================================================
// MILLER FINANCE
// ============================================================

import MillerFinanceDashboard from "./Users/MillerAccounts/MillerFinance/MillerFinanceDashboard";
import MillerFinancePaymentHistory from "./Users/MillerAccounts/MillerFinance/MillerFinancePaymentHistory";
import MillerPayables from "./Users/MillerAccounts/MillerFinance/MillerPayables";
import MillerReimburse from "./Users/MillerAccounts/MillerFinance/MillerReimburse";
import MillerTaxes from "./Users/MillerAccounts/MillerFinance/MillerTaxes";


// ============================================================
// MILLER LOGISTICS
// ============================================================

import MillerLogisticsDashboard from "./Users/MillerAccounts/MillerLogistics/MillerLogisticsDashboard";
import MillerAssignedHistory from "./Users/MillerAccounts/MillerLogistics/MillerAssignedHistory";
import MillerDeliveryManagement from "./Users/MillerAccounts/MillerLogistics/MillerDeliveryManagement";
import MillerFulfillmentHistory from "./Users/MillerAccounts/MillerLogistics/MillerFulfillmentHistory";
import MillerProductReturns from "./Users/MillerAccounts/MillerLogistics/MillerProductReturns";
import MillerReimbursement from "./Users/MillerAccounts/MillerLogistics/MillerReimbursement";
import MillerReimbursementHistory from "./Users/MillerAccounts/MillerLogistics/MillerReimbursementHistory";


// ============================================================
// MILLER PROCUREMENT
// ============================================================

import MillerProcurementLayout from "./Components/Major-Components/MillerProcurementLayout";
import MillerProcurementDashboard from "./Users/MillerAccounts/MillerProcurement/MillerProcurementDashboard";
import MillerReceivingOrders from "./Users/MillerAccounts/MillerProcurement/MillerReceivingOrders";
import MillerGoodsReceipt from "./Users/MillerAccounts/MillerProcurement/MillerGoodsReceipt";
import MillerReturns from "./Users/MillerAccounts/MillerProcurement/MillerReturns";
import MillerReceivingHistory from "./Users/MillerAccounts/MillerProcurement/MillerReceivingHistory";
import MillerSuppliers from "./Users/MillerAccounts/MillerProcurement/MillerSuppliers";
import MillerPaymentHistory from "./Users/MillerAccounts/MillerProcurement/MillerPaymentHistory";


// ============================================================
// MILLER SALES
// ============================================================

import MillerOnlineOrders from "./Users/MillerAccounts/MillerSales/MillerOnlineOrders";
import MillerPOS from "./Users/MillerAccounts/MillerSales/MillerPOS";
import MillerSalesDashboard from "./Users/MillerAccounts/MillerSales/MillerSalesDashboard";
import MillerSalesHistory from "./Users/MillerAccounts/MillerSales/MillerSalesHistory";


// ============================================================
// MILLER DRIVER
// ============================================================

import MillerDriverDashboard from "./Users/MillerAccounts/MillerDriver/MillerDriverDashboard";
import MillerDriverMyDuties from "./Users/MillerAccounts/MillerDriver/MillerDriverMyDuties";
import MillerDriverMessages from "./Users/MillerAccounts/MillerDriver/MillerDriverMessages";
import MillerDriverPaymentSubmission from "./Users/MillerAccounts/MillerDriver/MillerDriverPaymentSubmission";
import MillerDriverReimbursement from "./Users/MillerAccounts/MillerDriver/MillerDriverReimbursement";
import MillerDriverReimbursementHistory from "./Users/MillerAccounts/MillerDriver/MillerDriverReimbursementHistory";
import MillerDriverAssignedHistory from "./Users/MillerAccounts/MillerDriver/MillerDriverAssignedHistory";

// ============================================================
// MILLER MANAGER
// ============================================================

import MillerManagerDashboard from "./Users/MillerAccounts/MillerManager/MillerManagerDashboard";
import MillerSupplierManagement from "./Users/MillerAccounts/MillerManager/SupplierManagement";
import MillerSupplierDetails from "./Users/MillerAccounts/MillerManager/SupplierDetails";
import MillerOrderApproval from "./Users/MillerAccounts/MillerManager/MillerOrderApproval";
import MillerPassFeeManagement from "./Users/MillerAccounts/MillerManager/MillerPassFeeManagement";
import MillerPerformanceMonitoring from "./Users/MillerAccounts/MillerManager/MillerPerformanceMonitoring";
import MillerManagerFulfillmentHistory from "./Users/MillerAccounts/MillerManager/MillerFulfillmentHistory";
import MillerManagerSalesHistory from "./Users/MillerAccounts/MillerManager/MillerSalesHistory";
import MillerProcurementReceivingHistory from "./Users/MillerAccounts/MillerManager/MillerProcurementReceivingHistory";
import MillerFinanceManagementHistory from "./Users/MillerAccounts/MillerManager/MillerFinanceManagementHistory";
import MillerBranchManagement from "./Users/MillerAccounts/MillerManager/BranchManagement";
import MillerEmployeeManagement from "./Users/MillerAccounts/MillerManager/EmployeeManagement";
import MillerManagerNewsUpdates from "./Users/MillerAccounts/MillerManager/MillerManagerNewsUpdates";
import MillerManagerNewsArticle from "./Users/MillerAccounts/MillerManager/MillerManagerNewsArticle";
import MillerManagerMessages from "./Users/MillerAccounts/MillerManager/MillerManagerMessages";


// ============================================================
// ADMIN
// ============================================================

import AdminDashboard from "./Users/AdminAccounts/AccountAdmin/AdminDashboard";
import SupplierManagement from "./Users/AdminAccounts/AccountAdmin/SupplierManagement";
import MillerInfo from "./Users/AdminAccounts/AccountAdmin/MillerInfo";

import WarehouseManagement from "./Users/AdminAccounts/AccountAdmin/WarehouseManagement";
import WarehouseInfo from "./Users/AdminAccounts/AccountAdmin/WarehouseInfo";

import RetailerManagement from "./Users/AdminAccounts/AccountAdmin/RetailerManagement";
import EmailUsers from "./Users/AdminAccounts/AccountAdmin/EmailUsers";
import AdminNewsUpdates from "./Users/AdminAccounts/AccountAdmin/AdminNewsUpdates";
import Announcements from "./Users/AdminAccounts/AccountAdmin/Announcements";


// ============================================================
// RETAILER
// ============================================================

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




// ============================================================
// APP
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <GlobalLoadingScreen />

      <Routes>

        {/* ==================================================
              PUBLIC
          ================================================== */}

        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />




        <Route
          path="/dashboard-preview"
          element={<DashboardPreview />}
        />

        <Route
          path="/toast-preview"
          element={<ToastPreviewPage />}
        />

        <Route
          path="/toasts"
          element={<ToastPreviewPage />}
        />

        {/* Registration routes disabled - redirected to Partner With Us */}
        <Route path="/register" element={<Navigate to="/partner-with-us" replace />} />
        <Route path="/register/*" element={<Navigate to="/partner-with-us" replace />} />

        {/* ==================================================
              OPERATION SUPPORT & PUBLIC INQUIRIES
          ================================================== */}

        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/partner-with-us" element={<PartnerWithUs />} />
        <Route path="/partner-with-us/verify-email/:token" element={<PartnerWithUs />} />
        <Route path="/partner-with-us/verify-email" element={<PartnerWithUs />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/contact-support" element={<ContactSupport />} />
        <Route path="/support" element={<ContactSupport />} />
        <Route path="/login-assistance" element={<LoginAssistance />} />
        <Route path="/recover-access" element={<LoginAssistance />} />
        <Route path="/faqs" element={<FrequentlyAskedQuestions />} />
        <Route path="/faq" element={<FrequentlyAskedQuestions />} />
        <Route path="/help" element={<FrequentlyAskedQuestions />} />
        <Route path="/registration-guide" element={<RegistrationGuide />} />
        <Route path="/register-guide" element={<RegistrationGuide />} />
        <Route path="/guide" element={<RegistrationGuide />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms-policies" element={<TermsPolicies />} />
        <Route path="/terms-and-policies" element={<TermsPolicies />} />
        <Route path="/terms" element={<TermsPolicies />} />


        {/* ==================================================
              DIRECT PROFILE FALLBACK
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="retailer" />}>
          <Route
            path="/account-profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              WAREHOUSE ENCODER
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="warehouse_encoder" />}>
          <Route
            path="/warehouse-encoder/dashboard"
            element={<WarehouseEncoderDashboard />}
          />

          <Route
            path="/warehouse-encoder/orders"
            element={<WarehouseEncoderOrderHistory />}
          />

          <Route
            path="/warehouse-encoder/stock"
            element={<WarehouseEncoderStock />}
          />

          <Route
            path="/warehouse-encoder/requests"
            element={<WarehouseEncoderRequests />}
          />

          <Route
            path="/warehouse-encoder/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              WAREHOUSE SALES
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="warehouse_sales" />}>
          <Route
            path="/warehouse-sales/dashboard"
            element={<WarehouseSalesDashboard />}
          />

          <Route
            path="/warehouse-sales/point-of-sale"
            element={<WarehousePOS />}
          />

          <Route
            path="/warehouse-sales/sales-history"
            element={<WarehouseSalesHistory />}
          />

          <Route
            path="/warehouse-sales/online-orders"
            element={<WarehouseOnlineOrders />}
          />

          <Route
            path="/warehouse-sales/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              WAREHOUSE LOGISTICS
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="warehouse_logistics" />}>
          <Route
            path="/warehouse-logistics/dashboard"
            element={<WarehouseLogisticsDashboard />}
          />

          <Route
            path="/warehouse-logistics/delivery-management"
            element={<DeliveryManagement />}
          />

          <Route
            path="/warehouse-logistics/product-returns"
            element={<ProductReturns />}
          />

          <Route
            path="/warehouse-logistics/reimbursement"
            element={<Reimbursement />}
          />

          <Route
            path="/warehouse-logistics/reimbursement-history"
            element={<ReimbursementHistory />}
          />

          <Route
            path="/warehouse-logistics/assigned-history"
            element={<AssignedHistory />}
          />

          <Route
            path="/warehouse-logistics/fulfillment-history"
            element={<FulfillmentHistory />}
          />

          <Route
            path="/warehouse-logistics/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              WAREHOUSE PROCUREMENT
          ================================================== */}

        <Route element={<WarehouseProcurementLayout />}>
          <Route
            path="/warehouse-procurement/dashboard"
            element={<WarehouseProcurementDashboard />}
          />

          <Route
            path="/warehouse-procurement/receiving-orders"
            element={<WarehouseReceivingOrders />}
          />

          <Route
            path="/warehouse-procurement/goods-receipt"
            element={<WarehouseGoodsReceipt />}
          />

          <Route
            path="/warehouse-procurement/returns"
            element={<WarehouseReturns />}
          />

          <Route
            path="/warehouse-procurement/receiving-history"
            element={<WarehouseReceivingHistory />}
          />

          <Route
            path="/warehouse-procurement/suppliers"
            element={<WarehouseSuppliers />}
          />

          <Route
            path="/warehouse-procurement/payment-history"
            element={<WarehousePaymentHistory />}
          />

          <Route
            path="/warehouse-procurement/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              WAREHOUSE FINANCE
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="warehouse_finance" />}>
          <Route
            path="/warehouse-finance/dashboard"
            element={<WarehouseFinanceDashboard />}
          />

          <Route
            path="/warehouse-finance/payables"
            element={<WarehousePayables />}
          />

          <Route
            path="/warehouse-finance/taxes"
            element={<WarehouseTaxes />}
          />

          <Route
            path="/warehouse-finance/reimburse"
            element={<WarehouseReimburse />}
          />

          <Route
            path="/warehouse-finance/payment-history"
            element={<WarehouseFinancePaymentHistory />}
          />

          <Route
            path="/warehouse-finance/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              WAREHOUSE MANAGER
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="warehouse_manager" />}>
          <Route
            path="/warehouse-manager/dashboard"
            element={<WarehouseManagerDashboard />}
          />

          <Route
            path="/warehouse-manager/branches"
            element={<BranchManagement />}
          />

          <Route
            path="/warehouse-manager/branches/:branchId/employees"
            element={<EmployeeManagement />}
          />

          <Route
            path="/warehouse-manager/order-approval"
            element={<OrderApproval />}
          />

          <Route
            path="/warehouse-manager/performance"
            element={<PerformanceMonitoring />}
          />

          <Route
            path="/warehouse-manager/fulfillment-history"
            element={<WarehouseManagerFulfillmentHistory />}
          />

          <Route
            path="/warehouse-manager/sales-history"
            element={<WarehouseManagerSalesHistory />}
          />

          <Route
            path="/warehouse-manager/procurement-history"
            element={<ProcurementReceivingHistory />}
          />

          <Route
            path="/warehouse-manager/finance-history"
            element={<FinanceManagementHistory />}
          />

          <Route
            path="/warehouse-manager/news-updates"
            element={<WarehouseManagerNewsUpdates />}
          />

          <Route
            path="/warehouse-manager/news-updates/:id"
            element={<WarehouseManagerNewsArticle />}
          />

          <Route
            path="/warehouse-manager/messages"
            element={<WarehouseManagerMessages />}
          />

          <Route
            path="/warehouse-manager/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              BRANCH MANAGER
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="branch_manager" />}>
          <Route
            path="/branch-manager/dashboard"
            element={<BranchManagerDashboard />}
          />

          <Route
            path="/branch-manager/order-approval"
            element={<BranchManagerOrderApproval />}
          />

          <Route
            path="/branch-manager/performance"
            element={<BranchManagerPerformanceMonitoring />}
          />

          <Route
            path="/branch-manager/fulfillment-history"
            element={<BranchManagerFulfillmentHistory />}
          />

          <Route
            path="/branch-manager/sales-history"
            element={<BranchManagerSalesHistory />}
          />

          <Route
            path="/branch-manager/procurement-history"
            element={<BranchManagerProcurementReceivingHistory />}
          />

          <Route
            path="/branch-manager/finance-history"
            element={<BranchManagerFinanceManagementHistory />}
          />

          <Route
            path="/branch-manager/news-updates"
            element={<BranchManagerNewsUpdates />}
          />

          <Route
            path="/branch-manager/news-updates/:id"
            element={<BranchManagerNewsArticle />}
          />

          <Route
            path="/branch-manager/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              WAREHOUSE DRIVER
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="warehouse_driver" />}>
          <Route
            path="/warehouse-driver/dashboard"
            element={<WarehouseDriverDashboard />}
          />

          <Route
            path="/warehouse-driver/my-duties"
            element={<DriverMyDuties />}
          />

          <Route
            path="/warehouse-driver/messages"
            element={<DriverMessages />}
          />

          <Route
            path="/warehouse-driver/payment-submission"
            element={<DriverPaymentSubmission />}
          />

          <Route
            path="/warehouse-driver/reimbursement"
            element={<DriverReimbursement />}
          />

          <Route
            path="/warehouse-driver/assigned-history"
            element={<DriverAssignedHistory />}
          />

          <Route
            path="/warehouse-driver/reimbursement-history"
            element={<DriverReimbursementHistory />}
          />

          <Route
            path="/warehouse-driver/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              SUPPLIER ENCODER
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="supplier_encoder" />}>
          <Route
            path="/supplier-encoder/dashboard"
            element={<MillerEncoderDashboard />}
          />

          <Route
            path="/supplier-encoder/orders"
            element={<MillerEncoderOrderHistory />}
          />

          <Route
            path="/supplier-encoder/requests"
            element={<MillerEncoderRequestOrders />}
          />

          <Route
            path="/supplier-encoder/stock"
            element={<MillerEncoderStockManagement />}
          />
          <Route
            path="/supplier-encoder/stock-management"
            element={<MillerEncoderStockManagement />}
          />

          <Route
            path="/supplier-encoder/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              MILLER SALES
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="miller_sales" />}>
          <Route
            path="/miller-sales/dashboard"
            element={<MillerSalesDashboard />}
          />

          <Route
            path="/miller-sales/point-of-sale"
            element={<MillerPOS />}
          />

          <Route
            path="/miller-sales/sales-history"
            element={<MillerSalesHistory />}
          />

          <Route
            path="/miller-sales/online-orders"
            element={<MillerOnlineOrders />}
          />

          <Route
            path="/miller-sales/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              MILLER LOGISTICS
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="miller_logistics" />}>
          <Route
            path="/miller-logistics/dashboard"
            element={<MillerLogisticsDashboard />}
          />

          <Route
            path="/miller-logistics/delivery-management"
            element={<MillerDeliveryManagement />}
          />

          <Route
            path="/miller-logistics/product-returns"
            element={<MillerProductReturns />}
          />

          <Route
            path="/miller-logistics/reimbursement"
            element={<MillerReimbursement />}
          />

          <Route
            path="/miller-logistics/reimbursement-history"
            element={<MillerReimbursementHistory />}
          />

          <Route
            path="/miller-logistics/assigned-history"
            element={<MillerAssignedHistory />}
          />

          <Route
            path="/miller-logistics/fulfillment-history"
            element={<MillerFulfillmentHistory />}
          />

          <Route
            path="/miller-logistics/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              MILLER PROCUREMENT
          ================================================== */}

        <Route element={<MillerProcurementLayout />}>
          <Route
            path="/miller-procurement/dashboard"
            element={<MillerProcurementDashboard />}
          />

          <Route
            path="/miller-procurement/receiving-orders"
            element={<MillerReceivingOrders />}
          />

          <Route
            path="/miller-procurement/goods-receipt"
            element={<MillerGoodsReceipt />}
          />

          <Route
            path="/miller-procurement/returns"
            element={<MillerReturns />}
          />

          <Route
            path="/miller-procurement/receiving-history"
            element={<MillerReceivingHistory />}
          />

          <Route
            path="/miller-procurement/suppliers"
            element={<MillerSuppliers />}
          />

          <Route
            path="/miller-procurement/payment-history"
            element={<MillerPaymentHistory />}
          />

          <Route
            path="/miller-procurement/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              MILLER FINANCE
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="miller_finance" />}>
          <Route
            path="/miller-finance/dashboard"
            element={<MillerFinanceDashboard />}
          />

          <Route
            path="/miller-finance/payables"
            element={<MillerPayables />}
          />

          <Route
            path="/miller-finance/taxes"
            element={<MillerTaxes />}
          />

          <Route
            path="/miller-finance/reimburse"
            element={<MillerReimburse />}
          />

          <Route
            path="/miller-finance/payment-history"
            element={<MillerFinancePaymentHistory />}
          />

          <Route
            path="/miller-finance/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              MILLER DRIVER
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="miller_driver" />}>
          <Route
            path="/miller-driver/dashboard"
            element={<MillerDriverDashboard />}
          />

          <Route
            path="/miller-driver/my-duties"
            element={<MillerDriverMyDuties />}
          />

          <Route
            path="/miller-driver/messages"
            element={<MillerDriverMessages />}
          />

          <Route
            path="/miller-driver/payment-submission"
            element={<MillerDriverPaymentSubmission />}
          />

          <Route
            path="/miller-driver/reimbursement"
            element={<MillerDriverReimbursement />}
          />

          <Route
            path="/miller-driver/assigned-history"
            element={<MillerDriverAssignedHistory />}
          />

          <Route
            path="/miller-driver/reimbursement-history"
            element={<MillerDriverReimbursementHistory />}
          />

          <Route
            path="/miller-driver/profile"
            element={<UserAccountProfile />}
          />
        </Route>



        {/* ==================================================
              MILLER MANAGER
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="miller_manager" />}>
          <Route
            path="/miller-manager/dashboard"
            element={<MillerManagerDashboard />}
          />


          <Route
            path="/miller-manager/branches"
            element={<MillerBranchManagement />}
          />

          <Route
            path="/miller-manager/branches/:branchId/employees"
            element={<MillerEmployeeManagement />}
          />

          <Route
            path="/miller-manager/suppliers"
            element={<MillerSupplierManagement />}
          />

          <Route
            path="/miller-manager/suppliers/:supplierId"
            element={<MillerSupplierDetails />}
          />

          <Route
            path="/miller-manager/order-approval"
            element={<MillerOrderApproval />}
          />

          <Route
            path="/miller-manager/pass-fee"
            element={<MillerPassFeeManagement />}
          />

          <Route
            path="/miller-manager/performance"
            element={<MillerPerformanceMonitoring />}
          />

          <Route
            path="/miller-manager/fulfillment-history"
            element={<MillerManagerFulfillmentHistory />}
          />

          <Route
            path="/miller-manager/sales-history"
            element={<MillerManagerSalesHistory />}
          />

          <Route
            path="/miller-manager/procurement-history"
            element={<MillerProcurementReceivingHistory />}
          />

          <Route
            path="/miller-manager/finance-history"
            element={<MillerFinanceManagementHistory />}
          />

          <Route
            path="/miller-manager/messages"
            element={<MillerManagerMessages />}
          />

          <Route
            path="/miller-manager/news-updates"
            element={<MillerManagerNewsUpdates />}
          />

          <Route
            path="/miller-manager/news-updates/:id"
            element={<MillerManagerNewsArticle />}
          />

          <Route
            path="/miller-manager/profile"
            element={<UserAccountProfile />}
          />
        </Route>


        {/* ==================================================
              RETAILER
          ================================================== */}

        <Route element={<WarehouseEncoderLayout role="retailer" />}>
          <Route
            path="/retailer/dashboard"
            element={<RetailerDashboard />}
          />

          <Route
            path="/retailer/point-of-sale"
            element={<RetailerPointOfSale />}
          />

          <Route
            path="/retailer/sales-history"
            element={<RetailerSalesHistory />}
          />

          <Route
            path="/retailer/inventory"
            element={<RetailerInventory />}
          />

          <Route
            path="/retailer/warehouse-marketplace"
            element={<RetailerMarketplace />}
          />

          <Route
            path="/retailer/order-tracking"
            element={<RetailerOrderTracking />}
          />

          <Route
            path="/retailer/product-returns"
            element={<RetailerProductReturns />}
          />

          <Route
            path="/retailer/my-purchases"
            element={<RetailerMyPurchases />}
          />

          <Route
            path="/retailer/messages"
            element={<RetailerMessages />}
          />

          <Route
            path="/retailer/news-updates"
            element={<RetailerNewsUpdates />}
          />

          <Route
            path="/retailer/news-updates/:id"
            element={<RetailerNewsArticle />}
          />

          <Route
            path="/retailer/profile"
            element={<UserAccountProfile />}
          />
        </Route>




        {/* ==================================================
              ADMIN - PROTECTED
              KEEP CURRENT ACCOUNT ADMIN IMPLEMENTATION
          ================================================== */}

        <Route element={<AdminProtectedRoute />}>
          <Route element={<WarehouseEncoderLayout role="admin" />}>

            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="/admin/farmers"
              element={<Navigate to="/admin/dashboard" replace />}
            />

            <Route
              path="/admin/suppliers"
              element={<SupplierManagement />}
            />

            <Route
              path="/admin/millers/:userId"
              element={<MillerInfo />}
            />

            <Route
              path="/admin/warehouses"
              element={<WarehouseManagement />}
            />

            <Route
              path="/admin/warehouses/:userId"
              element={<WarehouseInfo />}
            />

            <Route
              path="/admin/retailers"
              element={<RetailerManagement />}
            />

            <Route
              path="/admin/email-users"
              element={<EmailUsers />}
            />



            <Route
              path="/admin/news-updates"
              element={<AdminNewsUpdates />}
            />

            <Route
              path="/admin/announcements"
              element={<Announcements />}
            />

            <Route
              path="/admin/profile"
              element={<UserAccountProfile />}
            />

          </Route>
        </Route>

      </Routes>

      <FloatingChatbot />
    </BrowserRouter>
  );
}

export default App;