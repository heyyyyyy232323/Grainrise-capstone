import { useState } from "react";
import { Edit3, CheckCircle2, KeyRound, Camera, Mail, Phone, MapPin, Shield, Save, X } from "lucide-react";
import Breadcrumbs from "../Minor-Components/Breadcrumbs";

export default function UserAccountProfile() {
  // Left Card State
  const [profile] = useState({
    fullName: "Kerbie H. Abanid",
    email: "kerbieabanid@gmail.com",
    phone: "09063502141",
    role: "Retailer Account",
    location: "Malolos, Bulacan",
  });

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "Kerbie",
    middleInitial: "H",
    lastName: "Abanid",
    suffix: "None",
    gender: "Male",
  });
  const [tempPersonal, setTempPersonal] = useState({ ...personalInfo });
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);

  // Address Info State
  const [addressInfo, setAddressInfo] = useState({
    province: "Bulacan",
    municipality: "Malolos",
    postalCode: "3000",
    barangay: "Barangay 1",
    streetAddress: "123 Sample Street",
  });
  const [tempAddress, setTempAddress] = useState({ ...addressInfo });
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Account & Security State
  const [accountSecurity] = useState({
    email: "kerbieabanid@gmail.com",
    username: "kerbieabanid",
    contactNumber: "09063502141",
    password: "••••••••••••",
  });

  // Handlers for Personal Info Edit
  const handleStartEditPersonal = () => {
    setTempPersonal({ ...personalInfo });
    setIsEditingPersonal(true);
  };
  const handleSavePersonal = () => {
    setPersonalInfo({ ...tempPersonal });
    setIsEditingPersonal(false);
  };
  const handleCancelPersonal = () => {
    setTempPersonal({ ...personalInfo });
    setIsEditingPersonal(false);
  };

  // Handlers for Address Info Edit
  const handleStartEditAddress = () => {
    setTempAddress({ ...addressInfo });
    setIsEditingAddress(true);
  };
  const handleSaveAddress = () => {
    setAddressInfo({ ...tempAddress });
    setIsEditingAddress(false);
  };
  const handleCancelAddress = () => {
    setTempAddress({ ...addressInfo });
    setIsEditingAddress(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Account" }, { label: "Profile & Settings" }]} />
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          User Profile
        </h2>
        <p className="text-sm text-slate-500">
          Manage your personal details, address information, and account credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── 1ST COLUMN: Left Profile Summary Card (Scrolls with page) ────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-3xl border-2 border-emerald-500">
              {profile.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow transition cursor-pointer">
              <Camera size={14} />
            </button>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 text-lg">{profile.fullName}</h3>
            <p className="text-xs text-gray-500 font-medium">{profile.role}</p>
          </div>

          <div className="w-full pt-4 border-t border-gray-100 space-y-2.5 text-xs text-gray-600 text-left">
            <div className="flex items-center gap-2.5">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <span>{profile.phone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin size={14} className="text-gray-400 shrink-0" />
              <span>{profile.location}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Shield size={14} className="text-gray-400 shrink-0" />
              <span className="text-emerald-700 font-semibold">Account Verified</span>
            </div>
          </div>
        </div>

        {/* ── 2ND COLUMN: Right Side Form Sections ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* ── Personal Information Section ───────────────────────────────── */}
          <div
            className={`border rounded-xl p-6 shadow-sm space-y-4 transition-all duration-200 ${
              isEditingPersonal
                ? "bg-emerald-50/30 border-emerald-300 ring-2 ring-emerald-500/20"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Personal Information</h3>
                  <p className="text-xs text-gray-500">Review and update your personal details.</p>
                </div>
                {isEditingPersonal && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Editing Mode
                  </span>
                )}
              </div>

              {isEditingPersonal ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelPersonal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={handleSavePersonal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                  >
                    <Save size={14} /> Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEditPersonal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Edit3 size={14} /> Edit Information
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"}`}>
                  First Name
                </label>
                <input
                  type="text"
                  disabled={!isEditingPersonal}
                  value={isEditingPersonal ? tempPersonal.firstName : personalInfo.firstName}
                  onChange={(e) => setTempPersonal({ ...tempPersonal, firstName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingPersonal
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"}`}>
                  Middle Initial
                </label>
                <input
                  type="text"
                  disabled={!isEditingPersonal}
                  value={isEditingPersonal ? tempPersonal.middleInitial : personalInfo.middleInitial}
                  onChange={(e) => setTempPersonal({ ...tempPersonal, middleInitial: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingPersonal
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"}`}>
                  Last Name
                </label>
                <input
                  type="text"
                  disabled={!isEditingPersonal}
                  value={isEditingPersonal ? tempPersonal.lastName : personalInfo.lastName}
                  onChange={(e) => setTempPersonal({ ...tempPersonal, lastName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingPersonal
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"}`}>
                  Suffix
                </label>
                <input
                  type="text"
                  disabled={!isEditingPersonal}
                  value={isEditingPersonal ? tempPersonal.suffix : personalInfo.suffix}
                  onChange={(e) => setTempPersonal({ ...tempPersonal, suffix: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingPersonal
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"}`}>
                  Gender
                </label>
                <input
                  type="text"
                  disabled={!isEditingPersonal}
                  value={isEditingPersonal ? tempPersonal.gender : personalInfo.gender}
                  onChange={(e) => setTempPersonal({ ...tempPersonal, gender: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingPersonal
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ── Address Information Section ──────────────────────────────────── */}
          <div
            className={`border rounded-xl p-6 shadow-sm space-y-4 transition-all duration-200 ${
              isEditingAddress
                ? "bg-emerald-50/30 border-emerald-300 ring-2 ring-emerald-500/20"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Address Information</h3>
                  <p className="text-xs text-gray-500">Review and update your address details.</p>
                </div>
                {isEditingAddress && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Editing Mode
                  </span>
                )}
              </div>

              {isEditingAddress ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelAddress}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                  >
                    <Save size={14} /> Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEditAddress}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Edit3 size={14} /> Edit Address
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingAddress ? "text-emerald-900" : "text-gray-500"}`}>
                  Province
                </label>
                <input
                  type="text"
                  disabled={!isEditingAddress}
                  value={isEditingAddress ? tempAddress.province : addressInfo.province}
                  onChange={(e) => setTempAddress({ ...tempAddress, province: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingAddress
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingAddress ? "text-emerald-900" : "text-gray-500"}`}>
                  Municipality
                </label>
                <input
                  type="text"
                  disabled={!isEditingAddress}
                  value={isEditingAddress ? tempAddress.municipality : addressInfo.municipality}
                  onChange={(e) => setTempAddress({ ...tempAddress, municipality: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingAddress
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingAddress ? "text-emerald-900" : "text-gray-500"}`}>
                  Postal Code
                </label>
                <input
                  type="text"
                  disabled={!isEditingAddress}
                  value={isEditingAddress ? tempAddress.postalCode : addressInfo.postalCode}
                  onChange={(e) => setTempAddress({ ...tempAddress, postalCode: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingAddress
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isEditingAddress ? "text-emerald-900" : "text-gray-500"}`}>
                  Barangay
                </label>
                <input
                  type="text"
                  disabled={!isEditingAddress}
                  value={isEditingAddress ? tempAddress.barangay : addressInfo.barangay}
                  onChange={(e) => setTempAddress({ ...tempAddress, barangay: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingAddress
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${isEditingAddress ? "text-emerald-900" : "text-gray-500"}`}>
                  Street Address
                </label>
                <input
                  type="text"
                  disabled={!isEditingAddress}
                  value={isEditingAddress ? tempAddress.streetAddress : addressInfo.streetAddress}
                  onChange={(e) => setTempAddress({ ...tempAddress, streetAddress: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${
                    isEditingAddress
                      ? "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ── Account & Security Section ───────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Account &amp; Security</h3>
              <p className="text-xs text-gray-500">Manage your contact information and credentials.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-1">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={accountSecurity.email}
                    className="w-full pl-3.5 pr-28 py-2.5 bg-gray-100/80 border border-transparent rounded-lg text-sm font-semibold text-gray-800 outline-none"
                  />
                  <div className="absolute right-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} /> Verified
                    </span>
                    <button
                      onClick={() => alert("Change Email process initiated")}
                      className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Username</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={accountSecurity.username}
                    className="w-full pl-3.5 pr-20 py-2.5 bg-gray-100/80 border border-transparent rounded-lg text-sm font-semibold text-gray-800 outline-none"
                  />
                  <span className="absolute right-3 text-[11px] font-semibold text-gray-400">
                    Read-only
                  </span>
                </div>
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Contact Number</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={accountSecurity.contactNumber}
                    className="w-full pl-3.5 pr-28 py-2.5 bg-gray-100/80 border border-transparent rounded-lg text-sm font-semibold text-gray-800 outline-none"
                  />
                  <div className="absolute right-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} /> Verified
                    </span>
                    <button
                      onClick={() => alert("Change Contact Number process initiated")}
                      className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={accountSecurity.password}
                    className="w-full px-3.5 py-2.5 bg-gray-100/80 border border-transparent rounded-lg text-sm font-semibold text-gray-800 outline-none"
                  />
                  <button
                    onClick={() => alert("Open Change Password modal")}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                  >
                    <KeyRound size={14} /> Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}