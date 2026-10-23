import React, { useState } from "react";
import {
  X,
  FileText,
  ClipboardCheck,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  Clock,
  RotateCw,
  Search,
  SlidersHorizontal,
  Store,
  MapPin,
  UploadCloud,
  Camera,
  Image as ImageIcon,
  Eye,
  Trash2,
  Info,
  Send,
  Bold,
  Italic,
  List,
  CreditCard,
  Receipt,
  UserCheck,
  Landmark,
} from "lucide-react";

export default function WarehouseDriverMoreView({
  driverInfo = {
    driverName: "Juan Dela Cruz",
    driverId: "DRV-8821",
    driverInitials: "KA",
  },
  onCloseToDashboard,
  initialSubView = "menu",
  onLogout,
}) {
  // Check URL query param ?subview=... or default to initialSubView
  const [currentSubView, setCurrentSubView] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get("subview");
      if (
        sub &&
        ["menu", "reimbursement", "assigned-history", "reimbursement-history"].includes(sub)
      ) {
        return sub;
      }
    }
    return initialSubView || "menu";
  });

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // REIMBURSEMENT REQUEST FORM STATE (Matches Figma Exactly)
  // ─────────────────────────────────────────────────────────────────────────
  const [expenseCategory, setExpenseCategory] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("10/12/2023");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([
    {
      id: "file-01",
      name: "fuel_receipt_oct12.jpg",
      size: "1.8 MB",
      status: "Ready",
    },
  ]);
  const [previewFileModal, setPreviewFileModal] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFileObj = {
        id: `file-${Date.now()}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        status: "Ready",
      };
      setAttachedFiles((prev) => [...prev, newFileObj]);
      showToast(`Attached ${file.name}`);
    }
  };

  const handleRemoveFile = (fileId) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
    showToast("Attachment removed");
  };

  const handleSubmitReimbursement = (e) => {
    e.preventDefault();
    if (!costAmount && !expenseCategory) {
      showToast("Reimbursement submitted for Juan Dela Cruz (DRV-8821)!");
      setCurrentSubView("menu");
      return;
    }
    showToast(`Reimbursement of ₱${costAmount || "0.00"} submitted successfully!`);
    setCurrentSubView("menu");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ASSIGNED HISTORY STATE & DATA (Matches Figma Exactly)
  // ─────────────────────────────────────────────────────────────────────────
  const [historySearchKeyword, setHistorySearchKeyword] = useState("");
  const [historyFilterType, setHistoryFilterType] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [visibleDutiesCount, setVisibleDutiesCount] = useState(5);

  const initialTodayDuties = [
    {
      id: "duty-today-1",
      batchNo: "BATCH 2026 - 001",
      status: "Completed",
      commodity: "Premium Rice · Qty: 200 kg",
      market: "Central Market",
      location: "Sampaloc, Manila",
      paymentMethod: "Online Payment",
      time: "Today · 10:00 AM",
    },
    {
      id: "duty-today-2",
      batchNo: "BATCH 2026 - 001",
      status: "Completed",
      commodity: "Premium Rice · Qty: 200 kg",
      market: "Central Market",
      location: "Sampaloc, Manila",
      paymentMethod: "Cash on Delivery",
      time: "Today · 10:00 AM",
    },
    {
      id: "duty-today-3",
      batchNo: "BATCH 2026 - 001",
      status: "Completed",
      commodity: "Premium Rice · Qty: 200 kg",
      market: "Central Market",
      location: "Sampaloc, Manila",
      paymentMethod: "Online Payment",
      time: "Today · 10:00 AM",
    },
  ];

  const initialYesterdayDuties = [
    {
      id: "duty-yest-1",
      batchNo: "BATCH 2026 - 001",
      status: "Completed",
      commodity: "Premium Rice · Qty: 200 kg",
      market: "Central Market",
      location: "Sampaloc, Manila",
      paymentMethod: "Cash on Delivery",
      time: "Yesterday · 10:00 AM",
    },
    {
      id: "duty-yest-2",
      batchNo: "BATCH 2026 - 001",
      status: "Completed",
      commodity: "Premium Rice · Qty: 200 kg",
      market: "Central Market",
      location: "Sampaloc, Manila",
      paymentMethod: "Online Payment",
      time: "Yesterday · 10:00 AM",
    },
  ];

  const extraDutiesToLoad = [
    {
      id: "duty-extra-1",
      batchNo: "BATCH 2026 - 002",
      status: "Completed",
      commodity: "Sinandomeng · Qty: 350 kg",
      market: "Divisoria Grain Depot",
      location: "Binondo, Manila",
      paymentMethod: "Online Payment",
      time: "Oct 10 · 02:30 PM",
    },
    {
      id: "duty-extra-2",
      batchNo: "BATCH 2026 - 003",
      status: "Completed",
      commodity: "Dinorado · Qty: 500 kg",
      market: "Paco Public Market",
      location: "Paco, Manila",
      paymentMethod: "Cash on Delivery",
      time: "Oct 09 · 11:15 AM",
    },
  ];

  const [yesterdayDuties, setYesterdayDuties] = useState(initialYesterdayDuties);

  const handleLoadMore = () => {
    if (visibleDutiesCount < 7) {
      setYesterdayDuties((prev) => [...prev, ...extraDutiesToLoad]);
      setVisibleDutiesCount(7);
      showToast("Loaded additional historical duties");
    } else {
      showToast("All assigned history records loaded (75 total)");
    }
  };

  // Filter logic
  const filterDuty = (duty) => {
    const matchesKeyword =
      duty.batchNo.toLowerCase().includes(historySearchKeyword.toLowerCase()) ||
      duty.market.toLowerCase().includes(historySearchKeyword.toLowerCase()) ||
      duty.location.toLowerCase().includes(historySearchKeyword.toLowerCase()) ||
      duty.commodity.toLowerCase().includes(historySearchKeyword.toLowerCase());

    if (!matchesKeyword) return false;

    if (historyFilterType === "All") return true;
    if (historyFilterType === "Online Payment") return duty.paymentMethod === "Online Payment";
    if (historyFilterType === "Cash on Delivery") return duty.paymentMethod === "Cash on Delivery";
    return true;
  };

  const filteredTodayDuties = initialTodayDuties.filter(filterDuty);
  const filteredYesterdayDuties = yesterdayDuties.filter(filterDuty);

  // ─────────────────────────────────────────────────────────────────────────
  // REIMBURSEMENT HISTORY STATE & DATA (Matches Figma Exactly)
  // ─────────────────────────────────────────────────────────────────────────
  const [reimbSearchKeyword, setReimbSearchKeyword] = useState("");
  const [reimbFilterType, setReimbFilterType] = useState("All");
  const [showReimbFilterDropdown, setShowReimbFilterDropdown] = useState(false);
  const [selectedReimbRecord, setSelectedReimbRecord] = useState(null);
  const [visibleReimbCount, setVisibleReimbCount] = useState(5);

  const initialTodayReimbursements = [
    {
      id: "reimb-today-1",
      category: "Warehouse Operation",
      status: "Paid",
      amountReceived: "₱10,310.20",
      disbursedBy: "Finance A",
      refNo: "VCH-2026-8819",
      date: "Today · 10:30 AM",
      notes: "Emergency pallet wrapping materials & forklift battery fluid",
    },
    {
      id: "reimb-today-2",
      category: "Warehouse Operation",
      status: "Paid",
      amountReceived: "₱10,310.20",
      disbursedBy: "Finance A",
      refNo: "VCH-2026-8820",
      date: "Today · 11:15 AM",
      notes: "Warehouse dock maintenance and loading ramp lubricant",
    },
    {
      id: "reimb-today-3",
      category: "Warehouse Operation",
      status: "Paid",
      amountReceived: "₱10,310.20",
      disbursedBy: "Finance A",
      refNo: "VCH-2026-8821",
      date: "Today · 01:45 PM",
      notes: "Driver safety vests, gloves and digital weighing scale calibration",
    },
  ];

  const initialYesterdayReimbursements = [
    {
      id: "reimb-yest-1",
      category: "Warehouse Operation",
      status: "Paid",
      amountReceived: "₱10,310.20",
      disbursedBy: "Finance A",
      refNo: "VCH-2026-8790",
      date: "Yesterday · 09:20 AM",
      notes: "Bulk grain moisture testing kit supplies",
    },
    {
      id: "reimb-yest-2",
      category: "Warehouse Operation",
      status: "Paid",
      amountReceived: "₱10,310.20",
      disbursedBy: "Finance A",
      refNo: "VCH-2026-8791",
      date: "Yesterday · 02:10 PM",
      notes: "Warehouse security badge scanner battery replacement",
    },
  ];

  const extraReimbursementsToLoad = [
    {
      id: "reimb-extra-1",
      category: "Warehouse Operation",
      status: "Paid",
      amountReceived: "₱10,310.20",
      disbursedBy: "Finance A",
      refNo: "VCH-2026-8785",
      date: "Yesterday · 04:30 PM",
      notes: "Dispatch loading bay sanitization",
    },
    {
      id: "reimb-extra-2",
      category: "Warehouse Operation",
      status: "Paid",
      amountReceived: "₱10,310.20",
      disbursedBy: "Finance A",
      refNo: "VCH-2026-8780",
      date: "Yesterday · 05:15 PM",
      notes: "Conveyor belt inspection fees",
    },
  ];

  const [yesterdayReimbursements, setYesterdayReimbursements] = useState(
    initialYesterdayReimbursements
  );

  const handleLoadMoreReimbursements = () => {
    if (visibleReimbCount < 7) {
      setYesterdayReimbursements((prev) => [...prev, ...extraReimbursementsToLoad]);
      setVisibleReimbCount(7);
      showToast("Loaded additional reimbursement records");
    } else {
      showToast("All reimbursement records loaded (75 total)");
    }
  };

  const filterReimb = (rec) => {
    const matchesKeyword =
      rec.category.toLowerCase().includes(reimbSearchKeyword.toLowerCase()) ||
      rec.disbursedBy.toLowerCase().includes(reimbSearchKeyword.toLowerCase()) ||
      rec.amountReceived.toLowerCase().includes(reimbSearchKeyword.toLowerCase());

    if (!matchesKeyword) return false;

    if (reimbFilterType === "All") return true;
    if (reimbFilterType === "Paid") return rec.status === "Paid";
    return true;
  };

  const filteredTodayReimbursements = initialTodayReimbursements.filter(filterReimb);
  const filteredYesterdayReimbursements = yesterdayReimbursements.filter(filterReimb);

  // ─────────────────────────────────────────────────────────────────────────
  // SUB-VIEW 1: REIMBURSEMENT REQUEST (Figma Images 2 & 3)
  // ─────────────────────────────────────────────────────────────────────────
  if (currentSubView === "reimbursement") {
    return (
      <div className="space-y-4 pb-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Title with Back Arrow */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setCurrentSubView("menu")}
            className="w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all cursor-pointer"
            aria-label="Back to more menu"
          >
            <ArrowLeft size={17} strokeWidth={2.4} />
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Reimbursement Request
          </h1>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitReimbursement} className="space-y-4 text-xs">
          {/* 1. Expense Category * */}
          <div className="space-y-1.5">
            <label className="text-slate-800 font-bold block text-xs">
              Expense Category <span className="text-rose-500 font-black">*</span>
            </label>
            <div className="relative">
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full bg-white border border-slate-200/90 rounded-2xl px-3.5 py-3 text-xs font-medium text-slate-800 appearance-none shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0d5921]/30 cursor-pointer"
              >
                <option value="" disabled>
                  Select Category
                </option>
                <option value="Fuel / Diesel">Fuel / Diesel</option>
                <option value="Toll Fees">Toll Fees</option>
                <option value="Vehicle Maintenance">Vehicle Maintenance</option>
                <option value="Meals / Food Allowance">Meals / Food Allowance</option>
                <option value="Parking & Terminal">Parking & Terminal</option>
                <option value="Others">Others</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
            </div>
          </div>

          {/* 2. Requested By (Card with Auto Generated pill) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-800 font-bold text-xs">Requested By</span>
              <span className="bg-[#e8f0fe] text-[#1967d2] text-[10px] font-bold px-2 py-0.5 rounded-full">
                Auto Generated
              </span>
            </div>

            <div className="bg-[#f0f4ff]/80 border border-slate-200/70 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="text-slate-600">
                  <CreditCard size={18} strokeWidth={2} />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  {driverInfo.driverName || "Juan Dela Cruz"}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                ID: {driverInfo.driverId || "DRV-8821"}
              </span>
            </div>
          </div>

          {/* 3. Cost (₱) * */}
          <div className="space-y-1.5">
            <label className="text-slate-800 font-bold block text-xs">
              Cost (₱) <span className="text-rose-500 font-black">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-700 text-xs pointer-events-none">
                ₱
              </span>
              <input
                type="text"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-200/90 rounded-2xl py-3 pl-8 pr-3.5 text-xs font-bold text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0d5921]/30"
              />
            </div>
          </div>

          {/* 4. Expense Date * */}
          <div className="space-y-1.5">
            <label className="text-slate-800 font-bold block text-xs">
              Expense Date <span className="text-rose-500 font-black">*</span>
            </label>
            <input
              type="text"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              placeholder="10/12/2023"
              className="w-full bg-white border border-slate-200/90 rounded-2xl px-3.5 py-3 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0d5921]/30"
            />
          </div>

          {/* 5. Description * */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold text-xs">
                Description <span className="text-rose-500 font-black">*</span>
              </label>
              <span className="text-slate-400 text-[11px] font-medium">Min. 10 chars</span>
            </div>

            {/* Editor Box */}
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              {/* Toolbar */}
              <div className="bg-[#f4f6fc] border-b border-slate-200/80 px-3 py-2 flex items-center gap-3">
                <button
                  type="button"
                  className="font-black text-slate-700 text-xs hover:text-slate-900 px-1 cursor-pointer"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  className="italic font-serif font-bold text-slate-700 text-xs hover:text-slate-900 px-1 cursor-pointer"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  className="text-slate-700 hover:text-slate-900 cursor-pointer"
                  title="List"
                >
                  <List size={14} strokeWidth={2.4} />
                </button>
                <div className="h-3.5 w-px bg-slate-300" />
                <span className="text-[11px] text-slate-400 font-medium">Fuel / Route context</span>
              </div>

              {/* Textarea */}
              <textarea
                rows={3}
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="Provide detailed context for this expense (e.g. Diesel refill for Isuzu 6-wheeler truck during Bulacan Depot to Manila Port run)..."
                className="w-full p-3.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none resize-none min-h-[90px] leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* 6. Attachment * */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold text-xs">
                Attachment <span className="text-rose-500 font-black">*</span>
              </label>
              <span className="text-slate-400 text-[11px] font-medium">
                {attachedFiles.length} file{attachedFiles.length === 1 ? "" : "s"} attached
              </span>
            </div>

            {/* Upload Box */}
            <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-2xs flex flex-col items-center justify-center text-center space-y-2.5">
              {/* Circular Cloud Icon */}
              <div className="w-12 h-12 rounded-full bg-[#f0fdf4] border border-emerald-100 flex items-center justify-center text-[#15803d]">
                <UploadCloud size={24} strokeWidth={2.2} />
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-900">
                  Upload receipt or supporting document
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Accepted: PNG, JPG, JPEG, WEBP, PDF - Max 10MB
                </p>
              </div>

              {/* Pill Button */}
              <label className="bg-[#f0f4ff] hover:bg-[#e0e7ff] text-[#3730a3] text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all">
                <Camera size={14} strokeWidth={2.2} />
                <span>Choose File / Take Photo</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Attached File Cards */}
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-[#f4f6fc] border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-[#ecfdf5] border border-emerald-200 flex items-center justify-center text-[#0d5921] shrink-0">
                    <ImageIcon size={16} strokeWidth={2} />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs text-slate-800 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {file.size} &bull;{" "}
                      <span className="text-[#b45309] font-bold">{file.status}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewFileModal(file)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                    title="Preview"
                  >
                    <Eye size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 7. Fast Processing Tip */}
          <div className="bg-[#f4f6fc] border border-slate-200/70 rounded-2xl p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-[#15803d] shrink-0" strokeWidth={2.4} />
              <h5 className="font-bold text-xs text-slate-800">Fast Processing Tip</h5>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pl-5.5">
              Ensure the receipt image clearly displays the date, total amount (₱),
              vendor/station name, and official invoice number.
            </p>
          </div>

          {/* 8. Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              className="w-full bg-[#0d5921] hover:bg-[#0a461a] text-white font-bold text-xs py-3.5 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all"
            >
              <Send size={14} className="rotate-45" strokeWidth={2.4} />
              <span>Submit Reimbursement</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubView("menu")}
              className="w-full bg-transparent hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all text-center"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* File Preview Modal */}
        {previewFileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-black text-slate-900 truncate">
                  {previewFileModal.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewFileModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="h-48 bg-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 p-4 border border-dashed border-slate-200">
                <ImageIcon size={36} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Receipt Image Preview</span>
                <span className="text-[11px] text-slate-400">{previewFileModal.size} &bull; Validated</span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewFileModal(null)}
                className="w-full py-2.5 rounded-xl bg-[#0d5921] text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUB-VIEW 2: ASSIGNED HISTORY (Figma Images 1 & 4)
  // ─────────────────────────────────────────────────────────────────────────
  if (currentSubView === "assigned-history") {
    return (
      <div className="space-y-4 pb-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Title Row with 75 total Badge */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentSubView("menu")}
              className="w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all cursor-pointer"
              aria-label="Back to more menu"
            >
              <ArrowLeft size={17} strokeWidth={2.4} />
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Assigned History
            </h1>
          </div>
          <span className="bg-slate-100 text-slate-600 font-bold text-xs px-2.5 py-1 rounded-full shadow-2xs">
            75 total
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 relative">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={historySearchKeyword}
              onChange={(e) => setHistorySearchKeyword(e.target.value)}
              placeholder="Search order....."
              className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 pl-9 pr-3 text-xs placeholder:text-slate-400 font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0d5921]/30"
            />
          </div>

          {/* Filter Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="bg-white border border-slate-200/90 rounded-2xl px-3 py-2.5 flex items-center gap-1.5 shadow-2xs text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
            >
              <SlidersHorizontal size={14} className="text-slate-700" strokeWidth={2.2} />
              <span>{historyFilterType}</span>
              <ChevronDown size={13} className="text-slate-500" />
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 w-40 text-xs font-semibold text-slate-700 space-y-0.5">
                {["All", "Online Payment", "Cash on Delivery"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setHistoryFilterType(type);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                      historyFilterType === type
                        ? "bg-[#eef8f1] text-[#0d5921] font-bold"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── TODAY Group Section ─────────────────────────────────── */}
        <div className="space-y-3">
          {/* TODAY Banner */}
          <div className="bg-[#eef8f1] rounded-xl px-3.5 py-2 flex items-center justify-between">
            <span className="font-black text-xs text-[#0d5921] uppercase tracking-wider">
              TODAY
            </span>
            <span className="font-bold text-xs text-[#0d5921]">
              {filteredTodayDuties.length} completed duties
            </span>
          </div>

          {/* Today Duty Cards */}
          {filteredTodayDuties.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-400 border border-slate-200/80">
              No matching duties found for today.
            </div>
          ) : (
            filteredTodayDuties.map((duty) => (
              <div
                key={duty.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5 hover:shadow-xs transition-all"
              >
                {/* Top Row: Batch & Completed Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 tracking-tight">
                    {duty.batchNo}
                  </span>
                  <span className="bg-[#ecfdf5] border border-emerald-200/70 text-[#0d5921] font-bold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-[#0d5921]" strokeWidth={2.5} />
                    <span>{duty.status}</span>
                  </span>
                </div>

                {/* Line 2: Commodity & Qty */}
                <p className="text-xs text-slate-600 font-medium">{duty.commodity}</p>

                {/* Line 3: Market */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Store size={14} className="text-slate-700 shrink-0" strokeWidth={2} />
                  <span>{duty.market}</span>
                </div>

                {/* Line 4: Location */}
                <div className="flex items-center gap-2 text-xs text-slate-500 font-normal">
                  <MapPin size={14} className="text-slate-500 shrink-0" strokeWidth={2} />
                  <span>{duty.location}</span>
                </div>

                {/* Line 5: Payment Method & Time */}
                <div className="flex items-center justify-between pt-0.5">
                  <span
                    className={`font-bold text-[11px] px-2.5 py-0.5 rounded-full ${
                      duty.paymentMethod === "Cash on Delivery"
                        ? "bg-[#fef3c7] text-[#b45309]"
                        : "bg-[#e0edff] text-[#1d4ed8]"
                    }`}
                  >
                    {duty.paymentMethod}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Clock size={13} className="text-slate-400" />
                    <span>{duty.time}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── YESTERDAY Group Section (Figma Image 4) ──────────────── */}
        <div className="space-y-3 pt-1">
          {/* YESTERDAY Banner */}
          <div className="bg-[#eef8f1] rounded-xl px-3.5 py-2 flex items-center justify-between">
            <span className="font-black text-xs text-[#0d5921] uppercase tracking-wider">
              YESTERDAY
            </span>
            <span className="font-bold text-xs text-[#0d5921]">
              {filteredYesterdayDuties.length} completed duties
            </span>
          </div>

          {/* Yesterday Duty Cards */}
          {filteredYesterdayDuties.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-400 border border-slate-200/80">
              No matching duties found for yesterday.
            </div>
          ) : (
            filteredYesterdayDuties.map((duty) => (
              <div
                key={duty.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5 hover:shadow-xs transition-all"
              >
                {/* Top Row: Batch & Completed Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 tracking-tight">
                    {duty.batchNo}
                  </span>
                  <span className="bg-[#ecfdf5] border border-emerald-200/70 text-[#0d5921] font-bold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-[#0d5921]" strokeWidth={2.5} />
                    <span>{duty.status}</span>
                  </span>
                </div>

                {/* Line 2: Commodity & Qty */}
                <p className="text-xs text-slate-600 font-medium">{duty.commodity}</p>

                {/* Line 3: Market */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Store size={14} className="text-slate-700 shrink-0" strokeWidth={2} />
                  <span>{duty.market}</span>
                </div>

                {/* Line 4: Location */}
                <div className="flex items-center gap-2 text-xs text-slate-500 font-normal">
                  <MapPin size={14} className="text-slate-500 shrink-0" strokeWidth={2} />
                  <span>{duty.location}</span>
                </div>

                {/* Line 5: Payment Method & Time */}
                <div className="flex items-center justify-between pt-0.5">
                  <span
                    className={`font-bold text-[11px] px-2.5 py-0.5 rounded-full ${
                      duty.paymentMethod === "Cash on Delivery"
                        ? "bg-[#fef3c7] text-[#b45309]"
                        : "bg-[#e0edff] text-[#1d4ed8]"
                    }`}
                  >
                    {duty.paymentMethod}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Clock size={13} className="text-slate-400" />
                    <span>{duty.time}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer: Showing count & Load More ───────────────────── */}
        <div className="pt-2 text-center space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            Showing {filteredTodayDuties.length + filteredYesterdayDuties.length} of 75 duties
          </p>

          <button
            type="button"
            onClick={handleLoadMore}
            className="inline-flex items-center justify-center gap-2 text-slate-700 hover:text-[#0d5921] font-bold text-xs py-2 px-4 rounded-full hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
          >
            <RotateCw size={14} strokeWidth={2.3} />
            <span>Load More</span>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUB-VIEW 3: REIMBURSEMENT HISTORY (Figma Images - Pixel Perfect)
  // ─────────────────────────────────────────────────────────────────────────
  if (currentSubView === "reimbursement-history") {
    return (
      <div className="space-y-4 pb-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Title Row with 75 total Badge */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentSubView("menu")}
              className="w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all cursor-pointer"
              aria-label="Back to more menu"
            >
              <ArrowLeft size={17} strokeWidth={2.4} />
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Reimbursement History
            </h1>
          </div>
          <span className="bg-slate-100 text-slate-600 font-bold text-xs px-2.5 py-1 rounded-full shadow-2xs">
            75 total
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 relative">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={reimbSearchKeyword}
              onChange={(e) => setReimbSearchKeyword(e.target.value)}
              placeholder="Search category....."
              className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 pl-9 pr-3 text-xs placeholder:text-slate-400 font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0d5921]/30"
            />
          </div>

          {/* Filter Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReimbFilterDropdown(!showReimbFilterDropdown)}
              className="bg-white border border-slate-200/90 rounded-2xl px-3 py-2.5 flex items-center gap-1.5 shadow-2xs text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
            >
              <SlidersHorizontal size={14} className="text-slate-700" strokeWidth={2.2} />
              <span>{reimbFilterType}</span>
              <ChevronDown size={13} className="text-slate-500" />
            </button>

            {showReimbFilterDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 w-40 text-xs font-semibold text-slate-700 space-y-0.5">
                {["All", "Paid"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setReimbFilterType(type);
                      setShowReimbFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                      reimbFilterType === type
                        ? "bg-[#eef8f1] text-[#0d5921] font-bold"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── TODAY Group Section (Figma Image 2) ─────────────────── */}
        <div className="space-y-3">
          {/* TODAY Banner */}
          <div className="bg-[#eef8f1] rounded-xl px-3.5 py-2 flex items-center justify-between">
            <span className="font-black text-xs text-[#0d5921] uppercase tracking-wider">
              TODAY
            </span>
            <span className="font-bold text-xs text-[#0d5921]">
              {filteredTodayReimbursements.length} records
            </span>
          </div>

          {/* Today Reimbursement Cards */}
          {filteredTodayReimbursements.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-400 border border-slate-200/80">
              No reimbursement records found for today.
            </div>
          ) : (
            filteredTodayReimbursements.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 hover:shadow-xs transition-all"
              >
                {/* Row 1: Title & Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 tracking-tight">
                    {item.category}
                  </span>
                  <span className="bg-[#ecfdf5] border border-emerald-200/70 text-[#0d5921] font-bold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-[#0d5921]" strokeWidth={2.5} />
                    <span>{item.status}</span>
                  </span>
                </div>

                {/* Row 2: Amount Received & Disbursed By */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium">Amount Received</p>
                    <p className="font-black text-base text-slate-900 tracking-tight mt-0.5">
                      {item.amountReceived}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 font-medium">Disbursed By</p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mt-0.5">
                      <Landmark size={14} className="text-slate-600 shrink-0" strokeWidth={2} />
                      <span>{item.disbursedBy}</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: View Details Button */}
                <button
                  type="button"
                  onClick={() => setSelectedReimbRecord(item)}
                  className="w-full bg-[#f4f6fc] hover:bg-slate-100 border border-slate-200/70 rounded-xl py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <Eye size={14} className="text-slate-500" strokeWidth={2} />
                  <span>View Details</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── YESTERDAY Group Section (Figma Image 1) ──────────────── */}
        <div className="space-y-3 pt-1">
          {/* YESTERDAY Banner */}
          <div className="bg-[#eef8f1] rounded-xl px-3.5 py-2 flex items-center justify-between">
            <span className="font-black text-xs text-[#0d5921] uppercase tracking-wider">
              YESTERDAY
            </span>
            <span className="font-bold text-xs text-[#0d5921]">
              {filteredYesterdayReimbursements.length} records
            </span>
          </div>

          {/* Yesterday Reimbursement Cards */}
          {filteredYesterdayReimbursements.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-400 border border-slate-200/80">
              No reimbursement records found for yesterday.
            </div>
          ) : (
            filteredYesterdayReimbursements.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 hover:shadow-xs transition-all"
              >
                {/* Row 1: Title & Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 tracking-tight">
                    {item.category}
                  </span>
                  <span className="bg-[#ecfdf5] border border-emerald-200/70 text-[#0d5921] font-bold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-[#0d5921]" strokeWidth={2.5} />
                    <span>{item.status}</span>
                  </span>
                </div>

                {/* Row 2: Amount Received & Disbursed By */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium">Amount Received</p>
                    <p className="font-black text-base text-slate-900 tracking-tight mt-0.5">
                      {item.amountReceived}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 font-medium">Disbursed By</p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mt-0.5">
                      <Landmark size={14} className="text-slate-600 shrink-0" strokeWidth={2} />
                      <span>{item.disbursedBy}</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: View Details Button */}
                <button
                  type="button"
                  onClick={() => setSelectedReimbRecord(item)}
                  className="w-full bg-[#f4f6fc] hover:bg-slate-100 border border-slate-200/70 rounded-xl py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <Eye size={14} className="text-slate-500" strokeWidth={2} />
                  <span>View Details</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Footer: Showing count & Load More (Figma Image 1) ────── */}
        <div className="border border-slate-200/90 rounded-2xl p-4 bg-white text-center space-y-2.5 shadow-2xs mt-2">
          <p className="text-xs text-slate-600 font-medium">
            Showing {filteredTodayReimbursements.length + filteredYesterdayReimbursements.length} of 75 reimbursement records
          </p>

          <button
            type="button"
            onClick={handleLoadMoreReimbursements}
            className="inline-flex items-center justify-center gap-2 text-slate-800 hover:text-[#0d5921] font-bold text-xs py-2 px-4 rounded-full hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
          >
            <RotateCw size={14} strokeWidth={2.3} />
            <span>Load More</span>
          </button>
        </div>

        {/* View Details Modal */}
        {selectedReimbRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#ecfdf5] border border-emerald-200 flex items-center justify-center text-[#0d5921]">
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Disbursement Details
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Ref: {selectedReimbRecord.refNo}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReimbRecord(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-3 text-xs">
                <div className="bg-[#f0fdf4] border border-emerald-200/70 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#0d5921] uppercase tracking-wider">
                      Total Disbursed
                    </p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {selectedReimbRecord.amountReceived}
                    </p>
                  </div>
                  <span className="bg-[#ecfdf5] border border-emerald-200 text-[#0d5921] font-bold text-xs px-3 py-1 rounded-full">
                    {selectedReimbRecord.status}
                  </span>
                </div>

                <div className="space-y-2 border border-slate-100 rounded-2xl p-3.5 bg-slate-50/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Expense Category:</span>
                    <span className="font-bold text-slate-800">{selectedReimbRecord.category}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Disbursed By:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Landmark size={12} className="text-slate-600" />
                      {selectedReimbRecord.disbursedBy}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Timestamp:</span>
                    <span className="font-bold text-slate-800">{selectedReimbRecord.date}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Driver Beneficiary:</span>
                    <span className="font-bold text-slate-800">
                      {driverInfo.driverName || "Juan Dela Cruz"} ({driverInfo.driverId || "DRV-8821"})
                    </span>
                  </div>
                </div>

                {selectedReimbRecord.notes && (
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Expense Notes
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {selectedReimbRecord.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedReimbRecord(null)}
                className="w-full py-2.5 rounded-xl bg-[#0d5921] hover:bg-[#0a461a] text-white font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT MORE VIEW (Matching exact Figma design)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-5 -mx-1">
      {/* Top Drag Handle (Figma) */}
      <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />

      {/* Header: "More" & Close "✕" Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          More
        </h1>
        <button
          type="button"
          onClick={() => {
            if (onCloseToDashboard) onCloseToDashboard();
          }}
          className="w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shadow-2xs"
          aria-label="Close"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── 1. FINANCE Section (Figma) ─────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-1">
          FINANCE
        </p>

        {/* Reimbursement Card (Highlighted in Mint with Badge '3') */}
        <div
          onClick={() => setCurrentSubView("reimbursement")}
          className="bg-[#eef8f1] border-l-4 border-[#0d5921] rounded-2xl p-3 flex items-center justify-between transition-all hover:opacity-95 active:scale-[0.99] cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3">
            {/* Deep Green Badge with Document Icon */}
            <div className="w-10 h-10 rounded-xl bg-[#0d5921] text-white flex items-center justify-center shadow-xs">
              <FileText size={18} strokeWidth={2.2} />
            </div>

            <span className="text-sm font-extrabold text-[#0d5921]">
              Reimbursement
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Red Badge '3' matching Figma */}
            <span className="w-5 h-5 rounded-full bg-[#f43f5e] text-white text-[11px] font-black flex items-center justify-center shadow-xs">
              3
            </span>
            <ChevronRight size={18} className="text-[#0d5921]" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* ── 2. HISTORY Section (Figma) ─────────────────────────────────── */}
      <div className="space-y-2 pt-1">
        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-1">
          HISTORY
        </p>

        {/* Card 1: Assigned History */}
        <div
          onClick={() => setCurrentSubView("assigned-history")}
          className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-100 hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3">
            {/* Mint Green Badge with Clipboard Check */}
            <div className="w-10 h-10 rounded-xl bg-[#eef8f1] text-[#0d5921] flex items-center justify-center border border-emerald-200/50">
              <ClipboardCheck size={20} strokeWidth={2.2} />
            </div>

            <span className="text-sm font-extrabold text-slate-800">
              Assigned History
            </span>
          </div>

          <ChevronRight size={18} className="text-slate-400" strokeWidth={2} />
        </div>

        {/* Card 2: Reimbursement History */}
        <div
          onClick={() => setCurrentSubView("reimbursement-history")}
          className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-100 hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3">
            {/* Mint Green Badge with Receipt/Document Icon */}
            <div className="w-10 h-10 rounded-xl bg-[#eef8f1] text-[#0d5921] flex items-center justify-center border border-emerald-200/50">
              <Receipt size={19} strokeWidth={2.2} />
            </div>

            <span className="text-sm font-extrabold text-slate-800">
              Reimbursement History
            </span>
          </div>

          <ChevronRight size={18} className="text-slate-400" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
