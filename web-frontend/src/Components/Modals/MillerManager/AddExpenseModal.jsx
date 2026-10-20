import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertCircle, Sparkles, Check } from "lucide-react";
import useApi from "../../hooks/useApi";

const PRESET_EXPENSE_TYPES = [
  "Utilities",
  "Transportation",
  "Machinery Maintenance & Repair",
  "Operating Supplies",
  "Rent & Facilities",
  "Salaries & Wages",
  "Taxes & Government Fees",
  "Equipments",
  "Administrative",
  "Others",
];

// Calculate minimum deadline: 5 calendar days from today in Philippine local time (UTC+8)
const getMinDeadlineDate = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const phtDate = new Date(utc + 3600000 * 8);
  phtDate.setDate(phtDate.getDate() + 5);
  const yyyy = phtDate.getFullYear();
  const mm = String(phtDate.getMonth() + 1).padStart(2, "0");
  const dd = String(phtDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function AddExpenseModal({
  isOpen,
  onClose,
  branches = [],
  onSuccess,
}) {
  const { request } = useApi();

  const [branchId, setBranchId] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [customTypeInput, setCustomTypeInput] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [deadline, setDeadline] = useState("");

  // Sub-modal states ('others_custom_type' | 'clear_confirm' | null)
  // Strictly unstacked: parent modal is hidden when a sub-modal is active
  const [activeSubModal, setActiveSubModal] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const minDeadlineStr = useMemo(() => getMinDeadlineDate(), []);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Set default branch if only 1 branch exists
  useEffect(() => {
    if (branches && branches.length === 1 && !branchId) {
      setBranchId(String(branches[0].supplier_profile_id));
    }
  }, [branches, branchId]);

  if (!isOpen) return null;

  const isFormEmpty =
    !branchId &&
    !expenseType &&
    !description.trim() &&
    !price &&
    !deadline;

  // Handle Type dropdown selection
  const handleTypeSelect = (val) => {
    if (val === "Others") {
      setCustomTypeInput("");
      setErrorMessage("");
      setActiveSubModal("others_custom_type");
    } else {
      setExpenseType(val);
      setErrorMessage("");
    }
  };

  // Confirm Custom Type from "Others" small modal
  const handleConfirmCustomType = (e) => {
    e.preventDefault();
    const trimmed = customTypeInput.trim();
    if (!trimmed) {
      setErrorMessage("Please enter the custom expense type.");
      return;
    }
    setExpenseType(trimmed);
    setErrorMessage("");
    setActiveSubModal(null);
  };

  // Cancel Custom Type small modal
  const handleCancelCustomType = () => {
    setActiveSubModal(null);
    setErrorMessage("");
  };

  // Clear modal handlers
  const handleOpenClearConfirm = () => {
    if (isFormEmpty) return;
    setErrorMessage("");
    setActiveSubModal("clear_confirm");
  };

  const handleConfirmClear = () => {
    setBranchId(branches.length === 1 ? String(branches[0].supplier_profile_id) : "");
    setExpenseType("");
    setCustomTypeInput("");
    setDescription("");
    setPrice("");
    setDeadline("");
    setErrorMessage("");
    setActiveSubModal(null);
  };

  const handleCancelClear = () => {
    setActiveSubModal(null);
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!branchId) {
      setErrorMessage("Please select a branch.");
      return;
    }
    if (!expenseType) {
      setErrorMessage("Please select or specify an expense type.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please provide a description.");
      return;
    }
    if (description.length > 10000) {
      setErrorMessage("Description cannot exceed 10,000 characters.");
      return;
    }
    const cleanPrice = String(price).replace(/,/g, "").trim();
    const numPrice = Number(cleanPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMessage("Price must be a valid number greater than zero.");
      return;
    }
    // Check max 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(cleanPrice)) {
      setErrorMessage("Price cannot exceed 2 decimal places.");
      return;
    }
    if (!deadline) {
      setErrorMessage("Please select a deadline date.");
      return;
    }
    if (deadline < minDeadlineStr) {
      setErrorMessage(
        `Deadline must be at least 5 calendar days from today (${minDeadlineStr} or later in Philippine Time).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await request("/miller/expenses/create/", {
        method: "POST",
        body: {
          supplier_profile_id: branchId,
          expense_type: expenseType,
          description: description.trim(),
          price: cleanPrice,
          deadline: deadline,
        },
        throwOnError: true,
      });

      if (res && res.success) {
        onSuccess(res.data);
      } else {
        setErrorMessage(res?.message || "Failed to create expense. Please try again.");
      }
    } catch (err) {
      console.error("Failed to create expense:", err);
      const msg = err?.message || err?.detail || "An error occurred while creating the expense.";
      setErrorMessage(typeof msg === "string" ? msg : "Failed to create expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 1. OTHERS CUSTOM TYPE SUB-MODAL (STRICTLY UNSTACKED) ───────────────────
  if (activeSubModal === "others_custom_type") {
    return createPortal(
      <div className="fixed inset-0 z-[9992] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div
          className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Specify Custom Type</h3>
              <p className="text-xs text-slate-500">Enter a custom category for this expense</p>
            </div>
            <button
              type="button"
              onClick={handleCancelCustomType}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleConfirmCustomType} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Expense Type <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                maxLength={150}
                value={customTypeInput}
                onChange={(e) => {
                  setCustomTypeInput(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="e.g. Office Renovation, Marketing"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              {errorMessage && (
                <p className="text-xs text-rose-600 mt-1">{errorMessage}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelCustomType}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!customTypeInput.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#018311] hover:bg-[#016b0f] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer"
              >
                Apply Type
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }

  // ─── 2. CLEAR FORM CONFIRMATION MODAL (STRICTLY UNSTACKED) ──────────────────
  if (activeSubModal === "clear_confirm") {
    return createPortal(
      <div className="fixed inset-0 z-[9992] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div
          className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertCircle size={24} />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">Clear All Fields?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to discard all entered information? This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCancelClear}
              className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClear}
              className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs"
            >
              Yes, Clear
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ─── 3. MAIN ADD EXPENSE MODAL ──────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — Header X Only */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Add New Expense
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Create an operational expense record for disbursement
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close modal"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(92vh-140px)] space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Branch Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Branch <span className="text-rose-500">*</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setErrorMessage("");
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="">Select an owned branch</option>
              {branches.map((b) => (
                <option key={b.supplier_profile_id} value={b.supplier_profile_id}>
                  {b.display_name || b.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Set Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Set Expense Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={PRESET_EXPENSE_TYPES.includes(expenseType) ? expenseType : expenseType ? "custom" : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") return;
                handleTypeSelect(val);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="">Select expense category</option>
              {PRESET_EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {expenseType && !PRESET_EXPENSE_TYPES.includes(expenseType) && (
                <option value="custom">Custom: {expenseType}</option>
              )}
            </select>

            {/* Display custom type tag if selected */}
            {expenseType && !PRESET_EXPENSE_TYPES.includes(expenseType) && (
              <div className="flex items-center justify-between mt-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                <span className="font-semibold truncate">Custom: {expenseType}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomTypeInput(expenseType);
                    setActiveSubModal("others_custom_type");
                  }}
                  className="text-emerald-700 hover:text-emerald-900 underline font-medium text-[11px] cursor-pointer ml-2 shrink-0"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* 3. Description (max 10,000 chars with live counter) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Description <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[11px] font-medium ${
                  description.length > 9500
                    ? "text-rose-600 font-bold"
                    : "text-slate-400"
                }`}
              >
                {description.length.toLocaleString()} / 10,000 characters
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={10000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrorMessage("");
              }}
              placeholder="Provide complete breakdown, purpose, or details for this expense..."
              className="w-full p-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50/40 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none resize-y leading-relaxed"
            />
          </div>

          {/* 4. Price & 5. Deadline (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Price (PHP) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs sm:text-sm">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Deadline <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={minDeadlineStr}
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Min. 5 calendar days from today (PHT)
              </p>
            </div>
          </div>
        </div>

        {/* Footer: Clear (gray, lower-left) & Save (green, lower-right) */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex items-center justify-between">
          <button
            type="button"
            disabled={isFormEmpty || isSubmitting}
            onClick={handleOpenClearConfirm}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-7 py-2 rounded-xl bg-[#018311] hover:bg-[#016b0f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Saving Expense...</span>
              </>
            ) : (
              <span>Save Expense</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

