import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  RotateCw,
  Upload,
  CheckCircle2,
  Eye,
  X,
  FileText,
  Check,
} from "lucide-react";

export default function MillerDriverPaymentsView({
  paymentsData,
  onPaymentSubmitted,
}) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedRecordForSubmit, setSelectedRecordForSubmit] = useState(null);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [receiptProof, setReceiptProof] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [visibleCount, setVisibleCount] = useState(5);

  const todayGroup = paymentsData?.groups?.find((g) => g.id === "today") || {
    label: "TODAY",
    countText: "3 payment records",
    records: [],
  };

  const yesterdayGroup = paymentsData?.groups?.find((g) => g.id === "yesterday") || {
    label: "YESTERDAY",
    countText: "4 payment records",
    records: [],
  };

  const filterRecord = (r) => {
    const matchesKeyword =
      r.batchNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      r.variety.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      r.amount.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      r.quantity.toLowerCase().includes(searchKeyword.toLowerCase());

    if (!matchesKeyword) return false;

    if (filterType === "All") return true;
    if (filterType === "Pending") return r.status === "Pending";
    if (filterType === "Paid") return r.status === "Paid";
    if (filterType === "Online Payment") return r.paymentMethod === "Online Payment";
    if (filterType === "Cash on Delivery") return r.paymentMethod === "Cash on Delivery";
    return true;
  };

  const filteredTodayRecords = todayGroup.records.filter(filterRecord);
  const filteredYesterdayRecords = yesterdayGroup.records.filter(filterRecord);

  const handleOpenSubmitReceipt = (record) => {
    setSelectedRecordForSubmit(record);
    setReferenceNo("");
    setReceiptProof(null);
  };

  const handleOpenViewDetails = (record) => {
    setSelectedRecordForDetails(record);
  };

  const handleConfirmSubmitReceipt = (e) => {
    e.preventDefault();
    if (!selectedRecordForSubmit) return;

    if (onPaymentSubmitted) {
      onPaymentSubmitted({
        batchNo: selectedRecordForSubmit.batchNo,
        amount: selectedRecordForSubmit.amount,
        refNo: referenceNo || "RCPT-" + Math.floor(100000 + Math.random() * 900000),
      });
    }

    setToastMessage(`Receipt submitted for ${selectedRecordForSubmit.batchNo}!`);
    setTimeout(() => setToastMessage(null), 3500);
    setSelectedRecordForSubmit(null);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, paymentsData?.totalCount || 75));
  };

  const renderPaymentCard = (item) => (
    <div
      key={item.id}
      className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-xs transition-all"
    >
      {/* Row 1: Batch & Status Badge */}
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-[15px] text-slate-900 tracking-tight">
          {item.batchNo}
        </span>

        {item.status === "Pending" ? (
          <span className="bg-[#fef3c7] text-[#b45309] text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
            Pending
          </span>
        ) : (
          <span className="bg-[#ebf8ee] text-[#16a34a] text-[11px] font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 size={13} className="text-[#16a34a]" />
            <span>Paid</span>
          </span>
        )}
      </div>

      {/* Row 2: Variety */}
      <p className="text-xs text-slate-500 font-normal">
        {item.variety}
      </p>

      {/* Row 3: Two Columns: QUANTITY and AMOUNT */}
      <div className="grid grid-cols-2 gap-4 pt-0.5">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            QUANTITY
          </span>
          <p className="text-xs font-black text-slate-900 mt-0.5">
            {item.quantity}
          </p>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            AMOUNT
          </span>
          <p className="text-xs font-black text-slate-900 mt-0.5">
            {item.amount}
          </p>
        </div>
      </div>

      {/* Row 4: Payment Method Pill on Left & Paid Time on Right */}
      <div className="flex items-center justify-between pt-0.5">
        <span
          className={`font-semibold text-[10px] px-2.5 py-0.5 rounded-full ${
            item.paymentMethod === "Cash on Delivery"
              ? "bg-[#fef3c7] text-[#b45309]"
              : "bg-[#e0f2fe] text-[#0284c7]"
          }`}
        >
          {item.paymentMethod}
        </span>

        <span className="text-xs text-slate-500 font-normal">
          {item.paidAt}
        </span>
      </div>

      {/* Row 5: Full-width Action Button */}
      {item.status === "Pending" ? (
        <button
          type="button"
          onClick={() => handleOpenSubmitReceipt(item)}
          className="w-full bg-white hover:bg-[#ebf8ee] active:scale-98 border border-[#0d5921] text-[#0d5921] font-semibold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs mt-1"
        >
          <Upload size={14} className="text-[#0d5921]" />
          <span>Submit Receipt</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleOpenViewDetails(item)}
          className="w-full bg-[#f8fafc] hover:bg-slate-100 active:scale-98 text-slate-600 font-semibold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs mt-1"
        >
          <Eye size={14} className="text-slate-400" />
          <span>View Details</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-3.5 pb-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Title & Total Counter ─────────────────────────────────── */}
      <div className="flex items-center justify-between pt-0.5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Payments Submission
        </h1>
        <span className="bg-slate-100 text-slate-500 font-semibold text-xs px-2.5 py-0.5 rounded-md shadow-2xs">
          {paymentsData?.totalCount || 75} total
        </span>
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────────── */}
      <div className="flex items-center gap-2 relative">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search batch....."
            className="w-full bg-white border border-slate-200/90 rounded-xl py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0d5921]/40"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-2xs text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
          >
            <SlidersHorizontal size={14} className="text-slate-700" strokeWidth={2} />
            <span>{filterType}</span>
            <ChevronDown size={13} className="text-slate-500" />
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 w-44 text-xs font-semibold text-slate-700 space-y-0.5">
              {["All", "Pending", "Paid", "Online Payment", "Cash on Delivery"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFilterType(type);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    filterType === type
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

      {/* ── TODAY Group Section ───────────────────────────────────── */}
      <div className="space-y-3">
        {/* Mint Banner */}
        <div className="bg-[#ebf8ee] rounded-xl px-3.5 py-1.5 flex items-center justify-between">
          <span className="font-extrabold text-xs text-[#0d5921] uppercase tracking-wider">
            {todayGroup.label}
          </span>
          <span className="font-semibold text-xs text-[#0d5921]">
            {filteredTodayRecords.length} payment records
          </span>
        </div>

        {/* Today Payment Cards */}
        {filteredTodayRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-400 border border-slate-200/80">
            No payment records found for today.
          </div>
        ) : (
          filteredTodayRecords.map(renderPaymentCard)
        )}
      </div>

      {/* ── YESTERDAY Group Section ───────────────────────────────── */}
      <div className="space-y-3 pt-1">
        {/* Mint Banner */}
        <div className="bg-[#ebf8ee] rounded-xl px-3.5 py-1.5 flex items-center justify-between">
          <span className="font-extrabold text-xs text-[#0d5921] uppercase tracking-wider">
            {yesterdayGroup.label}
          </span>
          <span className="font-semibold text-xs text-[#0d5921]">
            {filteredYesterdayRecords.length} payment records
          </span>
        </div>

        {/* Yesterday Payment Cards */}
        {filteredYesterdayRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-400 border border-slate-200/80">
            No payment records found for yesterday.
          </div>
        ) : (
          filteredYesterdayRecords.map(renderPaymentCard)
        )}
      </div>

      {/* ── Footer: Showing Count & Load More ─────────────────────── */}
      <div className="pt-2 text-center space-y-2">
        <p className="text-xs text-slate-500 font-medium">
          Showing 5 of {paymentsData?.totalCount || 75} payment records
        </p>

        <button
          type="button"
          onClick={handleLoadMore}
          className="inline-flex items-center justify-center gap-1.5 text-slate-700 hover:text-[#0d5921] font-semibold text-xs py-1.5 px-3 rounded-full hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
        >
          <RotateCw size={14} strokeWidth={2.2} />
          <span>Load More</span>
        </button>
      </div>

      {/* ── Submit Receipt Modal ───────────────────────────────────── */}
      {selectedRecordForSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Submit Receipt
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {selectedRecordForSubmit.batchNo} &bull; {selectedRecordForSubmit.variety}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForSubmit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmSubmitReceipt} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Quantity
                  </span>
                  <span className="font-black text-slate-900 text-sm">
                    {selectedRecordForSubmit.quantity}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Amount Due
                  </span>
                  <span className="font-black text-[#0d5921] text-sm">
                    {selectedRecordForSubmit.amount}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Receipt / Transaction Ref No.
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OR-2026-99210"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 outline-none focus:border-[#0d5921]"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Upload Receipt Proof / Photo
                </label>
                <label className="border-2 border-dashed border-slate-200 hover:border-[#0d5921] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 bg-slate-50 cursor-pointer transition-colors">
                  <Upload size={20} className="text-[#0d5921]" />
                  <span className="text-xs font-bold text-[#0d5921]">
                    {receiptProof ? receiptProof.name : "Tap to upload receipt image"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    PNG, JPG or PDF up to 10MB
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setReceiptProof(e.target.files[0])}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForSubmit(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0d5921] hover:bg-[#0a461a] text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Details Modal ────────────────────────────────────── */}
      {selectedRecordForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Payment Record Details
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {selectedRecordForDetails.batchNo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Commodity
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {selectedRecordForDetails.variety}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Quantity
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {selectedRecordForDetails.quantity}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Amount Paid
                  </span>
                  <span className="font-black text-[#0d5921] text-sm">
                    {selectedRecordForDetails.amount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Status
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-xs text-[#16a34a]">
                    <CheckCircle2 size={13} />
                    Paid
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-800">
                    {selectedRecordForDetails.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecordForDetails.paidAt}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Retailer / Location:</span>
                  <span className="font-medium text-slate-800 text-right">
                    {selectedRecordForDetails.retailer || "Central Market, Manila"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verified By:</span>
                  <span className="font-bold text-[#0d5921]">
                    Depot Finance System
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecordForDetails(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs mt-2 cursor-pointer hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
