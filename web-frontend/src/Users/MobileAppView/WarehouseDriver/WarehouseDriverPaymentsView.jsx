import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Upload,
  Eye,
  CheckCircle2,
  RotateCw,
  Check,
  X,
  FileText,
  CreditCard,
  Calendar,
  Image as ImageIcon,
} from "lucide-react";

export default function WarehouseDriverPaymentsView({
  paymentsData,
  onPaymentSubmitted,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modals state
  const [submitModalRecord, setSubmitModalRecord] = useState(null);
  const [detailsModalRecord, setDetailsModalRecord] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [refNumber, setRefNumber] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // Grouped records from mock data
  const initialGroups = paymentsData?.groups || [];
  const [groups, setGroups] = useState(initialGroups);
  const totalCount = paymentsData?.totalCount || 75;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Flatten records for filtering
  const allRecordsWithGroup = groups.flatMap((group) =>
    (group.records || []).map((rec) => ({
      ...rec,
      groupId: group.id,
      groupLabel: group.label,
    }))
  );

  // Filter based on search query and filter dropdown
  const filteredRecords = allRecordsWithGroup.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.amount.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "All") return true;
    if (filterType === "Pending") return item.status === "Pending";
    if (filterType === "Paid") return item.status === "Paid";
    if (filterType === "Cash on Delivery") return item.paymentMethod === "Cash on Delivery";
    if (filterType === "Online Payment") return item.paymentMethod === "Online Payment";
    if (filterType === "Today") return item.groupId === "today";
    if (filterType === "Yesterday") return item.groupId === "yesterday";
    return true;
  });

  const displayedRecords = filteredRecords.slice(0, visibleCount);

  // Regroup displayed records by group
  const displayedGroups = groups
    .map((group) => {
      const recordsInGroup = displayedRecords.filter((r) => r.groupId === group.id);
      return {
        ...group,
        records: recordsInGroup,
      };
    })
    .filter((g) => g.records.length > 0);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 4, allRecordsWithGroup.length));
      setIsLoadingMore(false);
    }, 400);
  };

  const handleConfirmSubmitReceipt = (e) => {
    e.preventDefault();
    if (!submitModalRecord) return;

    // Update status to Paid
    const updatedGroups = groups.map((g) => ({
      ...g,
      records: g.records.map((r) => {
        if (r.id === submitModalRecord.id) {
          return {
            ...r,
            status: "Paid",
            receiptImage: receiptFile?.name || "WH-RECEIPT-UPLOADED.jpg",
            paidAt: "Paid Just now",
          };
        }
        return r;
      }),
    }));

    setGroups(updatedGroups);
    if (onPaymentSubmitted) onPaymentSubmitted(submitModalRecord);
    showToast(`Receipt for ${submitModalRecord.batchNo} submitted successfully!`);
    setSubmitModalRecord(null);
    setReceiptFile(null);
    setRefNumber("");
  };

  const filterOptions = [
    "All",
    "Pending",
    "Paid",
    "Cash on Delivery",
    "Online Payment",
    "Today",
    "Yesterday",
  ];

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Title Row: "Payments Submission" & "75 total" badge ──────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Payments Submission
        </h1>
        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200/60 shadow-2xs">
          {totalCount} total
        </span>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search input field */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batch....."
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5921]/20 focus:border-[#0d5921] shadow-2xs transition-all"
          />
        </div>

        {/* Filter dropdown button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <SlidersHorizontal size={15} className="text-slate-600" />
            <span>{filterType}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Filter options menu */}
          {isFilterDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-150">
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setFilterType(opt);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    filterType === opt
                      ? "text-[#0d5921] bg-emerald-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{opt}</span>
                  {filterType === opt && <Check size={14} className="text-[#0d5921]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grouped Payment Cards (TODAY & YESTERDAY) ────────────────── */}
      <div className="space-y-4">
        {displayedGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2 shadow-2xs">
            <p className="text-xs font-bold text-slate-700">No payment records found</p>
            <p className="text-[11px] text-slate-400">
              Try adjusting your search query or reset the filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterType("All");
              }}
              className="mt-2 text-xs font-bold text-[#0d5921] hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          displayedGroups.map((group) => (
            <div key={group.id} className="space-y-3">
              {/* Group Header Banner matching Figma */}
              <div className="bg-[#eef8f1] rounded-xl px-3.5 py-2 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0d5921]">
                  {group.label}
                </span>
                <span className="text-xs font-bold text-[#0d5921]">
                  {group.countText || `${group.records.length} payment records`}
                </span>
              </div>

              {/* Payment Cards in Group */}
              <div className="space-y-3">
                {group.records.map((rec) => {
                  const isPending = rec.status === "Pending";

                  return (
                    <article
                      key={rec.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                    >
                      {/* Row 1: Batch Number, Variety & Status Badge */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                            {rec.batchNo}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {rec.variety}
                          </p>
                        </div>

                        {isPending ? (
                          <span className="bg-[#fef9c3] text-[#a16207] border border-[#fef08a] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            Pending
                          </span>
                        ) : (
                          <span className="bg-[#e6f4ea] text-[#0d5921] border border-emerald-200/70 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-[#0d5921] fill-emerald-200/50" />
                            Paid
                          </span>
                        )}
                      </div>

                      {/* Row 2: Two Columns (QUANTITY & AMOUNT) */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            QUANTITY
                          </p>
                          <p className="text-sm font-black text-slate-900 mt-0.5">
                            {rec.quantity}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            AMOUNT
                          </p>
                          <p className="text-sm font-black text-slate-900 mt-0.5">
                            {rec.amount}
                          </p>
                        </div>
                      </div>

                      {/* Row 3: Payment Method Badge & Paid Timestamp */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        {rec.methodBadgeType === "online" ? (
                          <span className="bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            {rec.paymentMethod}
                          </span>
                        ) : (
                          <span className="bg-[#fef9c3] text-[#a16207] border border-[#fef08a] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            {rec.paymentMethod}
                          </span>
                        )}

                        <span className="text-slate-500 font-medium text-xs">
                          {rec.paidAt}
                        </span>
                      </div>

                      {/* Row 4: Action Button */}
                      <div className="pt-1">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => setSubmitModalRecord(rec)}
                            className="w-full bg-white hover:bg-emerald-50 active:scale-[0.98] border border-[#0d5921] text-[#0d5921] font-bold text-xs py-2.5 px-4 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Upload size={14} strokeWidth={2.2} />
                            <span>Submit Receipt</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDetailsModalRecord(rec)}
                            className="w-full bg-[#f8fafc] hover:bg-slate-100 active:scale-[0.98] border border-slate-200/80 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Eye size={14} strokeWidth={2.2} />
                            <span>View Details</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Footer: "Showing X of 75 payment records" & "Load More" ── */}
      {displayedRecords.length > 0 && (
        <div className="pt-2 pb-4 text-center space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            Showing {displayedRecords.length} of {totalCount} payment records
          </p>

          {displayedRecords.length < allRecordsWithGroup.length && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900 font-extrabold text-sm py-2 px-4 rounded-xl transition-all cursor-pointer hover:bg-slate-100 active:scale-95"
            >
              <RotateCw
                size={16}
                className={`text-slate-600 ${isLoadingMore ? "animate-spin" : ""}`}
              />
              <span>{isLoadingMore ? "Loading..." : "Load More"}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Submit Receipt Modal ─────────────────────────────────────── */}
      {submitModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Cash on Hand
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Submit Payment Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSubmitModalRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmSubmitReceipt} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <p className="font-extrabold text-slate-900">{submitModalRecord.batchNo}</p>
                <p className="text-[11px] text-slate-500">
                  {submitModalRecord.variety} &bull; {submitModalRecord.quantity}
                </p>
                <p className="text-sm font-black text-[#0d5921] pt-1">
                  Collection: {submitModalRecord.amount}
                </p>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">
                  Cashier Receipt / Reference No.
                </label>
                <input
                  type="text"
                  required
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. WH-RCPT-2026-9041"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d5921]"
                />
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">
                  Upload Receipt Slip / Proof Photo
                </label>
                <label className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer bg-slate-50/50">
                  <ImageIcon size={22} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-[#0d5921]">
                    {receiptFile ? receiptFile.name : "Tap to browse or take photo"}
                  </span>
                  <span className="text-[9px] text-slate-400">PNG, JPG, PDF up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setReceiptFile(e.target.files[0])}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalRecord(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0d5921] text-white font-bold text-xs shadow-xs hover:bg-[#0b4b1c] transition-all cursor-pointer"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Details Modal ───────────────────────────────────────── */}
      {detailsModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Paid & Verified
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Payment Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Batch Number:</span>
                  <span className="font-extrabold text-slate-900">{detailsModalRecord.batchNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Commodity:</span>
                  <span className="font-bold text-slate-800">{detailsModalRecord.variety} ({detailsModalRecord.quantity})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Amount Collected:</span>
                  <span className="font-black text-[#0d5921] text-sm">{detailsModalRecord.amount}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-400 font-medium">Payment Mode:</span>
                  <span className="font-bold text-slate-800">{detailsModalRecord.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Status Timestamp:</span>
                  <span className="font-bold text-slate-800">{detailsModalRecord.paidAt}</span>
                </div>
              </div>

              {detailsModalRecord.receiptImage && (
                <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3 flex items-center gap-2.5 text-emerald-900">
                  <FileText size={18} className="text-emerald-700 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[11px] truncate">
                      {detailsModalRecord.receiptImage}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Official Remittance Slip on File
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDetailsModalRecord(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
