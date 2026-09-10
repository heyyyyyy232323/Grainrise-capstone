import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Check,
  CheckCircle2,
  Lock,
  Shield,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Building2,
  Home,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Info,
  ChevronDown,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Laptop,
  Sparkles,
  Package,
  Cake,
} from "lucide-react";
import ConsumerNavbar from "../../Components/Major-Components/ConsumerNavbar";

export default function ConsumerAccountSettings() {
  const navigate = useNavigate();

  // Active Tab: "profile" | "addresses" | "payments" | "security" | "recurring"
  const [activeTab, setActiveTab] = useState("profile");

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // -------------------------------------------------------------
  // TAB 1: Profile Information State
  // -------------------------------------------------------------
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "Juan",
    middleName: "Santos",
    lastName: "Dela Cruz",
    suffix: "",
    dateOfBirth: "08/15/1990",
    gender: "Male",
  });

  const [contactInfo, setContactInfo] = useState({
    email: "juan.delacruz@email.ph",
    phone: "0912 345 6789",
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    showToast("Profile information updated successfully!");
  };

  const handleCancelProfile = () => {
    setPersonalInfo({
      firstName: "Juan",
      middleName: "Santos",
      lastName: "Dela Cruz",
      suffix: "",
      dateOfBirth: "08/15/1990",
      gender: "Male",
    });
    setContactInfo({
      email: "juan.delacruz@email.ph",
      phone: "0912 345 6789",
    });
    showToast("Changes reset.");
  };

  // -------------------------------------------------------------
  // TAB 2: Delivery Addresses State
  // -------------------------------------------------------------
  const [addresses, setAddresses] = useState([
    {
      id: "addr-1",
      type: "HOME",
      isDefault: true,
      name: "Juan Dela Cruz",
      phone: "0912 345 6789",
      line1: "Block 12 Lot 8, Phase 3, Bagong Silang",
      city: "Caloocan City, Metro Manila",
      zip: "1428",
      note: "Blue gate beside the barangay hall.",
      deliveryAvailable: "Standard & Bulk Delivery Available",
    },
    {
      id: "addr-2",
      type: "OFFICE",
      isDefault: false,
      name: "Juan Dela Cruz",
      phone: "0912 345 6789",
      line1: "123 Example Street, Novaliches",
      city: "Quezon City, Metro Manila",
      zip: "1118",
      note: "",
      deliveryAvailable: "Standard Delivery Available",
    },
  ]);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: "HOME",
    name: "Juan Dela Cruz",
    phone: "0912 345 6789",
    line1: "",
    city: "",
    zip: "",
    note: "",
    isDefault: false,
  });

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      type: "HOME",
      name: "Juan Dela Cruz",
      phone: "0912 345 6789",
      line1: "",
      city: "",
      zip: "",
      note: "",
      isDefault: false,
    });
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({ ...addr });
    setAddressModalOpen(true);
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    if (editingAddress) {
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddress.id
            ? { ...a, ...addressForm }
            : addressForm.isDefault
            ? { ...a, isDefault: false }
            : a
        )
      );
      showToast("Address updated successfully!");
    } else {
      const newAddr = {
        id: `addr-${Date.now()}`,
        ...addressForm,
        deliveryAvailable: "Standard & Bulk Delivery Available",
      };
      if (addressForm.isDefault) {
        setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: false })).concat(newAddr));
      } else {
        setAddresses((prev) => [...prev, newAddr]);
      }
      showToast("New delivery address added!");
    }
    setAddressModalOpen(false);
  };

  const handleSetDefaultAddress = (id) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
    showToast("Default delivery address updated!");
  };

  const handleRemoveAddress = (id) => {
    const target = addresses.find((a) => a.id === id);
    if (target?.isDefault) {
      showToast("Cannot remove default address. Set another address as default first.");
      return;
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast("Address removed.");
  };

  // -------------------------------------------------------------
  // TAB 3: Payment Methods State
  // -------------------------------------------------------------
  const [payments, setPayments] = useState([
    {
      id: "pay-1",
      type: "gcash",
      name: "GCash",
      displayNumber: "09•• ••• 6789",
      subtext: "Linked mobile wallet • ✓ Auto-debit verified",
      benefit: "Instant checkout on all standard & bulk orders",
      connectedDate: "Connected on June 2025",
      isDefault: true,
    },
    {
      id: "pay-2",
      type: "visa",
      name: "BDO Unibank Debit Card",
      badgeType: "Debit",
      displayNumber: "•••• •••• •••• 4242",
      subtext: "Expires 12/28",
      benefit: "Protected by 3D Secure • Tokenized by payment provider",
      connectedDate: "Connected on August 2025",
      isDefault: false,
    },
  ]);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState("gcash");
  const [newPaymentNumber, setNewPaymentNumber] = useState("");

  const handleSavePayment = (e) => {
    e.preventDefault();
    const newPay = {
      id: `pay-${Date.now()}`,
      type: newPaymentType,
      name:
        newPaymentType === "gcash"
          ? "GCash"
          : newPaymentType === "maya"
          ? "Maya Wallet"
          : "Debit/Credit Card",
      displayNumber:
        newPaymentNumber || (newPaymentType === "gcash" ? "09•• ••• 9988" : "•••• •••• •••• 8888"),
      subtext: newPaymentType === "gcash" ? "Linked mobile wallet" : "Expires 08/29",
      benefit: "Protected by 3D Secure • Tokenized by payment provider",
      connectedDate: "Connected just now",
      isDefault: false,
    };
    setPayments((prev) => [...prev, newPay]);
    setPaymentModalOpen(false);
    setNewPaymentNumber("");
    showToast("New payment method connected!");
  };

  const handleSetDefaultPayment = (id) => {
    setPayments((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }))
    );
    showToast("Default payment method updated!");
  };

  const handleRemovePayment = (id) => {
    const target = payments.find((p) => p.id === id);
    if (target?.isDefault) {
      showToast("Cannot remove default payment method. Select another default first.");
      return;
    }
    setPayments((prev) => prev.filter((p) => p.id !== id));
    showToast("Payment method removed.");
  };

  // -------------------------------------------------------------
  // TAB 4: Security State
  // -------------------------------------------------------------
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirmPass: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirmPass) {
      showToast("New passwords do not match!");
      return;
    }
    setPasswordModalOpen(false);
    setPasswords({ current: "", newPass: "", confirmPass: "" });
    showToast("Password updated successfully!");
  };

  // -------------------------------------------------------------
  // TAB 5: Recurring Orders State
  // -------------------------------------------------------------
  const [recurringFilter, setRecurringFilter] = useState("active");
  const [recurringOrders, setRecurringOrders] = useState([
    {
      id: "rec-1",
      title: "Premium Dinorado Rice",
      status: "Active",
      grade: "Dinorado - Premium Grade • 25 kg • 1 bag",
      seller: "Sold by Greenfield Rice Store • Retailer • Caloocan City",
      price: "₱1,450.00",
      frequency: "Every 2 Weeks",
      nextDate: "Sep 22, 2026",
      deliveryAddress: "Home — Bagong Silang, Caloocan",
      paymentMethod: "GCash •••• 6789",
      createdDate: "Created on Aug 28, 2026 • Order will be automatically scheduled",
      iconType: "cash",
      productLink: "/consumer/marketplace",
    },
    {
      id: "rec-2",
      title: "NSIC Rc 222 Rice",
      status: "Active",
      grade: "Grade A • 50 kg • 1 bag",
      seller: "Sold by Bulacan Grain Milling • Miller / Supplier • Bulacan",
      price: "₱2,450.00",
      frequency: "Monthly",
      nextDate: "Oct 1, 2026",
      deliveryAddress: "Office — Novaliches, QC",
      paymentMethod: "Visa •••• 4242",
      createdDate: "Created on Sep 1, 2026 • Order will be automatically scheduled",
      iconType: "box",
      productLink: "/consumer/marketplace",
    },
  ]);

  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    product: "Premium Dinorado Rice",
    frequency: "Every 2 Weeks",
    deliveryAddress: "Home — Bagong Silang, Caloocan",
    paymentMethod: "GCash •••• 6789",
    nextDate: "Sep 25, 2026",
  });

  const handleTogglePauseRecurring = (id) => {
    setRecurringOrders((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === "Active" ? "Paused" : "Active";
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
    showToast("Recurring order status updated!");
  };

  const handleCancelRecurring = (id) => {
    setRecurringOrders((prev) => prev.filter((item) => item.id !== id));
    showToast("Recurring order cancelled.");
  };

  const handleCreateRecurring = (e) => {
    e.preventDefault();
    const newRec = {
      id: `rec-${Date.now()}`,
      title: recurringForm.product,
      status: "Active",
      grade: "Premium Grade • 25 kg • 1 bag",
      seller: "Sold by Greenfield Rice Store • Retailer • Caloocan City",
      price: "₱1,500.00",
      frequency: recurringForm.frequency,
      nextDate: recurringForm.nextDate,
      deliveryAddress: recurringForm.deliveryAddress,
      paymentMethod: recurringForm.paymentMethod,
      createdDate: "Created just now • Order will be automatically scheduled",
      iconType: "cash",
      productLink: "/consumer/marketplace",
    };
    setRecurringOrders((prev) => [...prev, newRec]);
    setRecurringModalOpen(false);
    showToast("New recurring order scheduled successfully!");
  };

  // Filtered recurring orders
  const filteredRecurringOrders = recurringOrders.filter((o) => {
    if (recurringFilter === "active") return o.status === "Active";
    if (recurringFilter === "paused") return o.status === "Paused";
    return true; // history
  });

  // Breadcrumb title helper
  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case "profile":
        return "Profile Information";
      case "addresses":
        return "Delivery Addresses";
      case "payments":
        return "Payment Methods";
      case "security":
        return "Security";
      case "recurring":
        return "Recurring Orders";
      default:
        return "Profile Information";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* ── Top Consumer Navigation ────────────────────────── */}
      <ConsumerNavbar activePath="/consumer/account-settings" />

      {/* ── Main Content Container ─────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* ── Breadcrumb ────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <span
            onClick={() => setActiveTab("profile")}
            className="hover:text-emerald-800 cursor-pointer transition"
          >
            Account Settings
          </span>
          <span className="text-gray-400">&gt;</span>
          <span className="text-emerald-800 font-semibold">{getTabBreadcrumb()}</span>
        </div>

        {/* ── Page Title & Description ───────────────────────── */}
        <div className="mt-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your personal information, delivery addresses, payment methods, and account security.
          </p>
        </div>

        {/* ── Tabs Bar ───────────────────────────────────────── */}
        <div className="flex items-center gap-6 sm:gap-8 border-b border-gray-200 overflow-x-auto no-scrollbar mb-6">
          {/* Tab 1: Profile Information */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap relative select-none ${
              activeTab === "profile"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Profile Information
          </button>

          {/* Tab 2: Delivery Addresses */}
          <button
            onClick={() => setActiveTab("addresses")}
            className={`pb-3 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-2 relative select-none ${
              activeTab === "addresses"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>Delivery Addresses</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === "addresses"
                  ? "bg-emerald-100 text-[#00580C]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {addresses.length}
            </span>
          </button>

          {/* Tab 3: Payment Methods */}
          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-3 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-2 relative select-none ${
              activeTab === "payments"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>Payment Methods</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === "payments"
                  ? "bg-emerald-100 text-[#00580C]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {payments.length}
            </span>
          </button>

          {/* Tab 4: Security */}
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-3 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap relative select-none ${
              activeTab === "security"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Security
          </button>

          {/* Tab 5: Recurring Orders */}
          <button
            onClick={() => setActiveTab("recurring")}
            className={`pb-3 text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-2 relative select-none ${
              activeTab === "recurring"
                ? "text-[#00580C] border-b-2 border-[#00580C]"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>Recurring Orders</span>
            {activeTab === "recurring" ? (
              <span className="bg-[#E8F5E9] text-[#00580C] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                Active ({recurringOrders.filter((o) => o.status === "Active").length})
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                NEW
              </span>
            )}
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════
            TAB 1: PROFILE INFORMATION
        ═════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* ── Top Profile Card ─────────────────────────── */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                {/* Initials Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#00580C] text-white flex items-center justify-center font-extrabold text-3xl tracking-wider border-2 border-emerald-500 shadow-sm">
                    JD
                  </div>
                  <button
                    onClick={() => showToast("Photo change prompt opened")}
                    className="absolute bottom-0 right-0 p-2 bg-[#00580C] hover:bg-emerald-800 text-white rounded-full shadow transition cursor-pointer"
                    title="Edit profile photo"
                  >
                    <Camera size={14} />
                  </button>
                </div>

                {/* User Details */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Juan Dela Cruz
                    </h2>
                    <span className="bg-[#E8F5E9] text-[#00580C] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Consumer
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    {contactInfo.email}
                  </p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5 font-medium pt-0.5">
                    <Cake size={13} className="text-amber-500" />
                    Member since June 2025
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => showToast("Select photo file...")}
                  className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  Change Photo
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Profile photo removed.")}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer transition"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* ── Personal Information Form ────────────────── */}
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Personal Information
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Update your legal name and demographic details.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* First Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personalInfo.firstName}
                      onChange={(e) =>
                        setPersonalInfo({ ...personalInfo, firstName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                      required
                    />
                  </div>

                  {/* Middle Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={personalInfo.middleName}
                      onChange={(e) =>
                        setPersonalInfo({ ...personalInfo, middleName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personalInfo.lastName}
                      onChange={(e) =>
                        setPersonalInfo({ ...personalInfo, lastName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                      required
                    />
                  </div>

                  {/* Suffix */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Suffix
                    </label>
                    <input
                      type="text"
                      value={personalInfo.suffix}
                      placeholder="- e.g. Jr., III (Optional)"
                      onChange={(e) =>
                        setPersonalInfo({ ...personalInfo, suffix: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="text"
                      value={personalInfo.dateOfBirth}
                      onChange={(e) =>
                        setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })
                      }
                      placeholder="MM/DD/YYYY"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Gender
                    </label>
                    <div className="relative">
                      <select
                        value={personalInfo.gender}
                        onChange={(e) =>
                          setPersonalInfo({ ...personalInfo, gender: e.target.value })
                        }
                        className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition cursor-pointer pr-10"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Contact Information Card ─────────────────── */}
              <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Contact Information
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage the email address and mobile number associated with your orders.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, email: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition pr-24"
                        required
                      />
                      <span className="absolute right-3 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 select-none pointer-events-none">
                        <Check size={11} className="stroke-[3]" /> Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Changing your email will require verification via confirmation link.
                    </p>
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex rounded-xl overflow-hidden shadow-2xs">
                      <span className="inline-flex items-center px-3 text-center bg-gray-50 border border-r-0 border-gray-200 text-gray-600 text-xs font-semibold select-none leading-none">
                        <div className="text-[9px] text-gray-400 font-normal leading-tight">PH<br /><span className="text-xs text-gray-700 font-bold">+63</span></div>
                      </span>
                      <input
                        type="text"
                        value={contactInfo.phone}
                        onChange={(e) =>
                          setContactInfo({ ...contactInfo, phone: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-r-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Used for delivery notifications, courier SMS alerts, and order confirmations.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Save / Cancel Action Bar ─────────────────── */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelProfile}
                  className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} className="stroke-[3]" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════
            TAB 2: DELIVERY ADDRESSES
        ═════════════════════════════════════════════════════ */}
        {activeTab === "addresses" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header + Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    Delivery Addresses
                  </h3>
                  <span className="bg-[#E8F5E9] text-[#00580C] text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    {addresses.length} Saved
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage the addresses you use when placing GrainRise orders.
                </p>
                <p className="text-[11px] text-gray-400">
                  Your default address will be selected automatically during checkout.
                </p>
              </div>

              <button
                onClick={handleOpenAddAddress}
                className="self-start sm:self-auto px-4 py-2.5 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} className="stroke-[3]" /> Add New Address
              </button>
            </div>

            {/* Addresses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white rounded-2xl p-5 shadow-xs transition flex flex-col justify-between ${
                    addr.isDefault
                      ? "border-2 border-[#00580C] relative"
                      : "border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    {/* Top Badges & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-gray-100 text-gray-700 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          {addr.type === "HOME" ? (
                            <Home size={11} />
                          ) : (
                            <Building2 size={11} />
                          )}
                          {addr.type}
                        </span>

                        {addr.isDefault && (
                          <span className="bg-emerald-50 text-[#00580C] text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <Check size={11} className="stroke-[3]" /> Default Address
                          </span>
                        )}
                      </div>

                      {addr.isDefault && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00580C] shadow-xs" />
                      )}
                    </div>

                    {/* Recipient Details */}
                    <div className="mt-3 space-y-1">
                      <h4 className="text-sm font-bold text-gray-900">{addr.name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                        <Phone size={12} className="text-gray-400" />
                        {addr.phone}
                      </p>
                      <p className="text-xs text-gray-700 mt-1 font-medium">{addr.line1}</p>
                      <p className="text-xs text-gray-700 font-medium">{addr.city}</p>
                      <p className="text-xs text-gray-500">{addr.zip}</p>
                    </div>

                    {/* Delivery Note (if exists) */}
                    {addr.note && (
                      <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-gray-600 flex items-start gap-2">
                        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          <strong className="text-gray-800">Delivery Note:</strong> {addr.note}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleOpenEditAddress(addr)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleRemoveAddress(addr.id)}
                        disabled={addr.isDefault}
                        className={`text-xs font-semibold flex items-center gap-1 transition ${
                          addr.isDefault
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-rose-600 hover:text-rose-700 cursor-pointer"
                        }`}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>

                    {addr.isDefault ? (
                      <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                        <Check size={12} className="stroke-[3]" /> {addr.deliveryAvailable}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Check size={12} className="stroke-[3]" /> Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Info Banner: CHECKOUT CONNECTION */}
            <div className="bg-[#EFF9F3] border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#00580C] flex items-center justify-center shrink-0 mt-0.5">
                <Lock size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                  CHECKOUT CONNECTION
                </h4>
                <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                  Your default address is pre-selected for all orders. You can select another saved address or enter a temporary one during checkout without altering your default.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════
            TAB 3: PAYMENT METHODS
        ═════════════════════════════════════════════════════ */}
        {activeTab === "payments" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header + Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    Payment Methods
                  </h3>
                  <span className="bg-[#E8F5E9] text-[#00580C] text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    {payments.length} Saved
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage your saved payment methods for a faster and more convenient checkout.
                </p>
                <p className="text-[11px] text-gray-400">
                  Your default payment method will be selected automatically during checkout.
                </p>
              </div>

              <button
                onClick={() => setPaymentModalOpen(true)}
                className="self-start sm:self-auto px-4 py-2.5 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} className="stroke-[3]" /> Add Payment Method
              </button>
            </div>

            {/* Payments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {payments.map((pay) => (
                <div
                  key={pay.id}
                  className={`bg-white rounded-2xl p-5 shadow-xs transition flex flex-col justify-between ${
                    pay.isDefault
                      ? "border-2 border-[#00580C] relative"
                      : "border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    {/* Top Row: Logos & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pay.type === "gcash" ? (
                          <span className="bg-[#007DFE] text-white font-black text-[11px] px-2.5 py-0.5 rounded tracking-tight">
                            GCash
                          </span>
                        ) : pay.type === "maya" ? (
                          <span className="bg-[#000000] text-[#00E575] font-black text-[11px] px-2.5 py-0.5 rounded tracking-tight">
                            maya
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="bg-[#1A1F71] text-white font-extrabold text-[10px] px-2 py-0.5 rounded italic">
                              VISA
                            </span>
                            <span className="text-xs font-bold text-gray-800">
                              {pay.name}
                            </span>
                          </div>
                        )}

                        {pay.isDefault && (
                          <span className="bg-emerald-50 text-[#00580C] text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <Check size={11} className="stroke-[3]" /> Default
                          </span>
                        )}
                      </div>

                      {pay.badgeType && (
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">
                          {pay.badgeType}
                        </span>
                      )}

                      {pay.isDefault && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00580C] shadow-xs" />
                      )}
                    </div>

                    {/* Large Number */}
                    <div className="mt-4">
                      <p className="font-mono text-xl sm:text-2xl font-black text-gray-900 tracking-wider">
                        {pay.displayNumber}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1.5">
                        {pay.subtext}
                      </p>
                    </div>

                    {/* Benefit Highlight Box */}
                    <div className="mt-4 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-gray-700 flex items-center gap-2">
                      {pay.type === "gcash" ? (
                        <Sparkles size={13} className="text-amber-500 shrink-0" />
                      ) : (
                        <ShieldCheck size={13} className="text-emerald-700 shrink-0" />
                      )}
                      <span className="font-medium text-[11px]">{pay.benefit}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <span className="text-[11px] text-gray-400 font-medium">
                      {pay.connectedDate}
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRemovePayment(pay.id)}
                        disabled={pay.isDefault}
                        className={`text-xs font-semibold flex items-center gap-1 transition ${
                          pay.isDefault
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-rose-600 hover:text-rose-700 cursor-pointer"
                        }`}
                      >
                        <Trash2 size={12} /> Remove
                      </button>

                      {!pay.isDefault && (
                        <button
                          onClick={() => handleSetDefaultPayment(pay.id)}
                          className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          <Check size={12} className="stroke-[3]" /> Set as Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Info Banner: SECURE CHECKOUT GUARANTEE */}
            <div className="bg-[#EFF9F3] border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#00580C] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                  SECURE CHECKOUT GUARANTEE
                </h4>
                <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                  Your payment details are securely tokenized and encrypted by BSP-licensed payment gateways. Sensitive credentials like PINs, OTPs, or CVVs are never stored on GrainRise servers. Your default method is pre-selected for checkout, and you can switch payment methods or choose Cash on Delivery at checkout without altering your default settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════
            TAB 4: SECURITY
        ═════════════════════════════════════════════════════ */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* ── Security / Password Card ─────────────────── */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Security
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage your password and keep your GrainRise account secure.
                </p>
                <p className="text-[11px] text-gray-400">
                  Review your account security information and update your password when needed.
                </p>
              </div>

              {/* Password Row Box */}
              <div className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#EFF9F3] text-[#00580C] flex items-center justify-center shrink-0">
                    <Lock size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">Password</span>
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                        Last Updated: Aug 28, 2025
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Use a strong password that you do not use on other accounts.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPasswordModalOpen(true)}
                  className="self-start sm:self-auto px-4 py-2 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={13} /> Change Password
                </button>
              </div>
            </div>

            {/* ── Account Credentials Card ─────────────────── */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Account Credentials
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Review the basic information associated with your GrainRise account.
                </p>
              </div>

              <div className="space-y-3">
                {/* Username */}
                <div className="border border-gray-100 rounded-xl p-3.5 sm:p-4 flex items-center justify-between bg-slate-50/40">
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                      Username
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">
                      juandelacruz26
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Used to identify your GrainRise account.
                    </p>
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded">
                    Read-only
                  </span>
                </div>

                {/* Email Address */}
                <div className="border border-gray-100 rounded-xl p-3.5 sm:p-4 flex items-center justify-between bg-slate-50/40">
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                      Email Address
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">
                      juan.delacruz@email.com
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Used for account verification and important order notifications.
                    </p>
                  </div>
                  <span className="bg-emerald-50 text-[#00580C] border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1">
                    <Check size={11} className="stroke-[3]" /> Verified
                  </span>
                </div>

                {/* Contact Number */}
                <div className="border border-gray-100 rounded-xl p-3.5 sm:p-4 flex items-center justify-between bg-slate-50/40">
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                      Contact Number
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">
                      0912 345 6789
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Used for courier SMS and delivery alerts.
                    </p>
                  </div>
                  <span className="bg-emerald-50 text-[#00580C] border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1">
                    <Check size={11} className="stroke-[3]" /> Verified
                  </span>
                </div>
              </div>
            </div>

            {/* ── Recent Login Card ────────────────────────── */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Recent Login
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Recent devices used to access your GrainRise account.
                </p>
              </div>

              {/* Active Session */}
              <div className="bg-[#EFF9F3]/60 border border-emerald-200/80 rounded-xl p-3.5 sm:p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#00580C] flex items-center justify-center shrink-0">
                    <Laptop size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-gray-900">
                        Chrome on Windows 11
                      </span>
                      <span className="bg-emerald-100 text-[#00580C] text-[10px] font-extrabold px-2 py-0.5 rounded">
                        Current Session
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Active Now • Sep 9, 2026 at 9:32 AM
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>

              {/* Other Sessions */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Other Sessions</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sign out of GrainRise on other devices if you think someone else may have accessed your account.
                  </p>
                </div>
                <button
                  onClick={() => showToast("Signed out of all other active sessions.")}
                  className="self-start sm:self-auto px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Sign Out Other Devices
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════
            TAB 5: RECURRING ORDERS
        ═════════════════════════════════════════════════════ */}
        {activeTab === "recurring" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header + Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Recurring Orders
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                  Manage products you regularly purchase and control when your next orders are scheduled. You can pause, update, or cancel a recurring order anytime.
                </p>
              </div>

              <button
                onClick={() => setRecurringModalOpen(true)}
                className="self-start sm:self-auto px-4 py-2.5 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} className="stroke-[3]" /> Set Up Recurring Order
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecurringFilter("active")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  recurringFilter === "active"
                    ? "bg-[#EFF9F3] text-[#00580C] border border-emerald-300"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Active
                <span className="text-[10px] bg-emerald-100 text-[#00580C] px-1.5 py-0.2 rounded-full">
                  {recurringOrders.filter((o) => o.status === "Active").length}
                </span>
              </button>

              <button
                onClick={() => setRecurringFilter("paused")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  recurringFilter === "paused"
                    ? "bg-[#EFF9F3] text-[#00580C] border border-emerald-300"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Paused
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full">
                  {recurringOrders.filter((o) => o.status === "Paused").length}
                </span>
              </button>

              <button
                onClick={() => setRecurringFilter("history")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  recurringFilter === "history"
                    ? "bg-[#EFF9F3] text-[#00580C] border border-emerald-300"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                History
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full">
                  1
                </span>
              </button>
            </div>

            {/* Recurring Orders List */}
            <div className="space-y-4">
              {filteredRecurringOrders.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition"
                >
                  {/* Top Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {/* Product Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                          rec.iconType === "cash"
                            ? "bg-[#EFF9F3] text-[#00580C]"
                            : "bg-[#FEF9EE] text-[#D97706]"
                        }`}
                      >
                        {rec.iconType === "cash" ? (
                          <span className="text-xl">$</span>
                        ) : (
                          <Package size={22} />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-gray-900">
                            {rec.title}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                              rec.status === "Active"
                                ? "bg-emerald-50 text-[#00580C] border-emerald-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            <Check size={11} className="stroke-[3]" /> {rec.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{rec.grade}</p>
                        <p className="text-[11px] text-gray-400">{rec.seller}</p>
                      </div>
                    </div>

                    {/* Price on right */}
                    <div className="text-left sm:text-right self-start sm:self-center">
                      <p className="text-[11px] text-gray-400 font-medium">
                        Estimated Total per Order
                      </p>
                      <p className="text-lg sm:text-xl font-black text-slate-900">
                        {rec.price}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Based on current product price
                      </p>
                      <button
                        onClick={() => navigate(rec.productLink)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        View Product <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>

                  {/* 4 Columns Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {/* Frequency */}
                    <div className="p-3 bg-slate-50/70 border border-gray-100 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Frequency
                      </p>
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mt-1">
                        <RefreshCw size={12} className="text-emerald-700" />
                        {rec.frequency}
                      </p>
                    </div>

                    {/* Next Order Date */}
                    <div className="p-3 bg-[#F0FDF4] border border-emerald-200/90 rounded-xl">
                      <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                        Next Order Date
                      </p>
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mt-1">
                        <Calendar size={12} className="text-[#00580C]" />
                        {rec.nextDate}
                      </p>
                    </div>

                    {/* Delivery Address */}
                    <div className="p-3 bg-slate-50/70 border border-gray-100 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Delivery Address
                      </p>
                      <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mt-1 truncate" title={rec.deliveryAddress}>
                        <MapPin size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{rec.deliveryAddress}</span>
                      </p>
                    </div>

                    {/* Payment Method */}
                    <div className="p-3 bg-slate-50/70 border border-gray-100 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Payment Method
                      </p>
                      <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        {rec.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <p className="text-[11px] text-gray-400">
                      {rec.createdDate}
                    </p>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => showToast("Edit recurring order schedule dialog opened.")}
                        className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleTogglePauseRecurring(rec.id)}
                        className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                      >
                        {rec.status === "Active" ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => handleCancelRecurring(rec.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer ml-1"
                      >
                        Cancel Recurring Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Info Banner: Automatic Revalidation & Price Notice */}
            <div className="bg-[#EFF9F3] border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#00580C] flex items-center justify-center shrink-0 mt-0.5">
                <Info size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-900">
                  Automatic Revalidation & Price Notice
                </h4>
                <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                  Product price, stock, and seller availability are automatically re-checked before each order is placed. You will receive an SMS and email notification 48 hours before each scheduled order with final pricing and item confirmation.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════
          MODAL: ADD / EDIT ADDRESS
      ═════════════════════════════════════════════════════ */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingAddress ? "Edit Delivery Address" : "Add New Delivery Address"}
              </h3>
              <button
                onClick={() => setAddressModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Address Label / Type
                </label>
                <div className="flex items-center gap-3">
                  {["HOME", "OFFICE", "OTHER"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, type })}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                        addressForm.type === type
                          ? "bg-emerald-50 text-[#00580C] border-emerald-400"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.name}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Street Address & House / Unit No. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block 12 Lot 8, Phase 3, Bagong Silang"
                  value={addressForm.line1}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, line1: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    City / Municipality *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Caloocan City, Metro Manila"
                    value={addressForm.city}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, city: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Postal / Zip Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1428"
                    value={addressForm.zip}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, zip: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Delivery Note (Landmarks / Gate colors)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blue gate beside the barangay hall"
                  value={addressForm.note}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, note: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="addrDefaultCheck"
                  checked={addressForm.isDefault}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, isDefault: e.target.checked })
                  }
                  className="w-4 h-4 text-[#00580C] rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="addrDefaultCheck" className="text-xs text-gray-700 font-semibold cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {editingAddress ? "Update Address" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          MODAL: ADD PAYMENT METHOD
      ═════════════════════════════════════════════════════ */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                Connect Payment Method
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Select Payment Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPaymentType("gcash")}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      newPaymentType === "gcash"
                        ? "bg-blue-50 border-blue-500 text-blue-800"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-[#007DFE] text-white font-black text-[9px] flex items-center justify-center">G</span>
                    <span className="text-xs font-bold">GCash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPaymentType("maya")}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      newPaymentType === "maya"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-black text-[#00E575] font-black text-[9px] flex items-center justify-center">M</span>
                    <span className="text-xs font-bold">Maya</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPaymentType("card")}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      newPaymentType === "card"
                        ? "bg-purple-50 border-purple-500 text-purple-800"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <CreditCard size={20} className="text-purple-600" />
                    <span className="text-xs font-bold">Card</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {newPaymentType === "card" ? "Card Number" : "Mobile / Account Number"}
                </label>
                <input
                  type="text"
                  placeholder={newPaymentType === "card" ? "4242 •••• •••• ••••" : "0912 345 6789"}
                  value={newPaymentNumber}
                  onChange={(e) => setNewPaymentNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <ShieldCheck size={16} className="text-[#00580C] shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Your billing info is encrypted and tokenized via official payment gateways.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Connect Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          MODAL: CHANGE PASSWORD
      ═════════════════════════════════════════════════════ */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <KeyRound size={17} className="text-[#00580C]" />
                Change Account Password
              </h3>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Current Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwords.newPass}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPass: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwords.confirmPass}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirmPass: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-gray-800 flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showPassword ? "Hide password" : "Show password"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          MODAL: SET UP RECURRING ORDER
      ═════════════════════════════════════════════════════ */}
      {recurringModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw size={17} className="text-[#00580C]" />
                Set Up Recurring Order
              </h3>
              <button
                onClick={() => setRecurringModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Rice Variety / Product *
                </label>
                <select
                  value={recurringForm.product}
                  onChange={(e) =>
                    setRecurringForm({ ...recurringForm, product: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                >
                  <option value="Premium Dinorado Rice">Premium Dinorado Rice (25 kg)</option>
                  <option value="NSIC Rc 222 Rice">NSIC Rc 222 Rice (50 kg)</option>
                  <option value="Sinandomeng Special Rice">Sinandomeng Special Rice (25 kg)</option>
                  <option value="Jasponica Brown Rice">Jasponica Brown Rice (10 kg)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={recurringForm.frequency}
                    onChange={(e) =>
                      setRecurringForm({ ...recurringForm, frequency: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                  >
                    <option value="Every Week">Every Week</option>
                    <option value="Every 2 Weeks">Every 2 Weeks</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Next Order Date *
                  </label>
                  <input
                    type="text"
                    value={recurringForm.nextDate}
                    onChange={(e) =>
                      setRecurringForm({ ...recurringForm, nextDate: e.target.value })
                    }
                    placeholder="e.g. Sep 25, 2026"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Delivery Address *
                </label>
                <select
                  value={recurringForm.deliveryAddress}
                  onChange={(e) =>
                    setRecurringForm({ ...recurringForm, deliveryAddress: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={`${a.type} — ${a.city}`}>
                      {a.type} — {a.line1}, {a.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={recurringForm.paymentMethod}
                  onChange={(e) =>
                    setRecurringForm({ ...recurringForm, paymentMethod: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                >
                  {payments.map((p) => (
                    <option key={p.id} value={`${p.name} (${p.displayNumber})`}>
                      {p.name} ({p.displayNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRecurringModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00580C] hover:bg-[#0c432f] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Floating Toast Notification ───────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F533A] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
