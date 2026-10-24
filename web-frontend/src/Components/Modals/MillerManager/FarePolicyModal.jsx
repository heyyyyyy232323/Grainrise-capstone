import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertCircle } from "lucide-react";
import useApi from "../../hooks/useApi";

export default function FarePolicyModal({
  isOpen,
  mode = "add", // "add" | "edit"
  policy = null,
  branches = [],
  onClose,
  onSuccess,
}) {
  const { request } = useApi();

  const [rateName, setRateName] = useState("");
  const [description, setDescription] = useState("");
  const [freeDistance, setFreeDistance] = useState("");
  const [baseFee, setBaseFee] = useState("");
  const [additionalFee, setAdditionalFee] = useState("");
  const [status, setStatus] = useState("Active"); // "Active" | "Archive"
  const [archiveReason, setArchiveReason] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Initialize or reset form state when modal opens or policy changes
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage("");

    if (mode === "edit" && policy) {
      setRateName(policy.rate_name || policy.rateName || "");
      setDescription(policy.description || "");
      setFreeDistance(
        policy.free_delivery_distance !== undefined && policy.free_delivery_distance !== null
          ? String(policy.free_delivery_distance)
          : policy.freeDeliveryDistance !== undefined && policy.freeDeliveryDistance !== null
          ? String(policy.freeDeliveryDistance)
          : ""
      );
      setBaseFee(
        policy.base_fee !== undefined && policy.base_fee !== null
          ? String(policy.base_fee)
          : policy.rawBaseFee !== undefined && policy.rawBaseFee !== null
          ? String(policy.rawBaseFee)
          : ""
      );
      setAdditionalFee(
        policy.additional_fee_per_kilometers !== undefined && policy.additional_fee_per_kilometers !== null
          ? String(policy.additional_fee_per_kilometers)
          : policy.rawAdditionalFee !== undefined && policy.rawAdditionalFee !== null
          ? String(policy.rawAdditionalFee)
          : ""
      );

      const rawSt = (policy.raw_status || policy.status || "Active").toLowerCase();
      setStatus(rawSt === "archived" || rawSt === "archive" ? "Archive" : "Active");
      setArchiveReason(policy.archive_reason || policy.archiveReason || "");

      const branchIds =
        policy.effective_branch_ids ||
        policy.effectiveBranchIds ||
        (Array.isArray(policy.effective_branches) ? policy.effective_branches.map((b) => b.supplier_profile_id) : []) ||
        [];
      setSelectedBranchIds(branchIds);
    } else {
      // Add mode defaults
      setRateName("");
      setDescription("");
      setFreeDistance("");
      setBaseFee("");
      setAdditionalFee("");
      setStatus("Active");
      setArchiveReason("");
      // Default: select all branches if available or keep empty
      if (branches && branches.length > 0) {
        setSelectedBranchIds(branches.map((b) => b.supplier_profile_id));
      } else {
        setSelectedBranchIds([]);
      }
    }
  }, [isOpen, mode, policy, branches]);

  if (!isOpen) return null;

  // Numeric only, non-negative helper
  const handleNumericChange = (setter) => (e) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setter(val);
      setErrorMessage("");
    }
  };

  const handleToggleBranch = (branchId) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
    setErrorMessage("");
  };

  const handleToggleAllBranches = () => {
    if (selectedBranchIds.length === branches.length) {
      setSelectedBranchIds([]);
    } else {
      setSelectedBranchIds(branches.map((b) => b.supplier_profile_id));
    }
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    // Frontend validations
    const trimmedRateName = rateName.trim();
    if (!trimmedRateName) {
      setErrorMessage("Please enter a Rate Name.");
      return;
    }
    if (trimmedRateName.length > 20) {
      setErrorMessage("Rate Name cannot exceed 20 characters.");
      return;
    }

    if (description.trim().length > 50) {
      setErrorMessage("Description cannot exceed 50 characters.");
      return;
    }

    if (freeDistance === "" || isNaN(Number(freeDistance)) || Number(freeDistance) < 0) {
      setErrorMessage("Please provide a valid, non-negative Free Delivery Distance.");
      return;
    }

    if (baseFee === "" || isNaN(Number(baseFee)) || Number(baseFee) < 0) {
      setErrorMessage("Please provide a valid, non-negative Base Fee.");
      return;
    }

    if (additionalFee === "" || isNaN(Number(additionalFee)) || Number(additionalFee) < 0) {
      setErrorMessage("Please provide a valid, non-negative Additional Fee per km.");
      return;
    }

    if (mode === "edit" && status === "Archive" && !archiveReason.trim()) {
      setErrorMessage("Archive reason is required when archiving a fare policy.");
      return;
    }

    if (selectedBranchIds.length === 0) {
      setErrorMessage("Please select at least one applicable branch.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        rate_name: trimmedRateName,
        description: description.trim(),
        free_delivery_distance: Number(freeDistance),
        base_fee: Number(baseFee),
        additional_fee_per_kilometers: Number(additionalFee),
        branch_ids: selectedBranchIds,
      };

      let endpoint = "/miller/fare-fee/";
      let method = "POST";

      if (mode === "edit") {
        const fareFeeId = policy.fare_fee_id || policy.fareFeeId || policy.id;
        endpoint = `/miller/fare-fee/${fareFeeId}/`;
        method = "PUT";
        payload.status = status; // "Active" | "Archive"
        payload.archive_reason = status === "Archive" ? archiveReason.trim() : "";
      }

      const res = await request(endpoint, {
        method,
        body: payload,
      });

      if (res && res.success) {
        if (onSuccess) {
          onSuccess(res.data, mode === "edit" ? "Policy updated successfully." : "New policy created successfully.");
        }
        onClose();
      } else {
        const msg = res?.message || res?.error || "Failed to save fare policy. Please try again.";
        setErrorMessage(typeof msg === "string" ? msg : "Validation error occurred.");
      }
    } catch (err) {
      console.error("Fare policy save error:", err);
      const msg = err?.message || "An unexpected error occurred while saving.";
      setErrorMessage(typeof msg === "string" ? msg : "Failed to save policy.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {/* Modal Card - Clicking outside does NOT close (no backdrop click handler) */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - X Icon Only */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {mode === "edit" ? "Edit Fare Policy" : "Add New Fare Policy"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {mode === "edit"
                ? "Update transportation rates and effective branches"
                : "Set transportation and delivery fare rates for eligible branches"}
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

          {/* 1. Rate Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Rate Name <span className="text-rose-500">*</span>
              </label>
            </div>
            <input
              type="text"
              maxLength={20}
              value={rateName}
              onChange={(e) => {
                setRateName(e.target.value);
                setErrorMessage("");
              }}
              placeholder="e.g. Standard Delivery"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <div className="flex justify-end text-[11px] text-gray-400 mt-1">
              {rateName.length}/20
            </div>
          </div>

          {/* 2. Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Description <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
            </div>
            <input
              type="text"
              maxLength={50}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrorMessage("");
              }}
              placeholder="e.g. Temporary hike during harvest peak."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <div className="flex justify-end text-[11px] text-gray-400 mt-1">
              {description.length}/50
            </div>
          </div>

          {/* 3. Numeric Fields: Free Delivery Distance, Base Fee, Additional Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Free Delivery (km) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={freeDistance}
                onChange={handleNumericChange(setFreeDistance)}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Base Fee (₱) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={baseFee}
                onChange={handleNumericChange(setBaseFee)}
                placeholder="e.g. 500.00"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional (₱/km) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={additionalFee}
                onChange={handleNumericChange(setAdditionalFee)}
                placeholder="e.g. 25.00"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* 4. Status Dropdown (EDIT MODE ONLY) */}
          {mode === "edit" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Archive">Archive</option>
              </select>
            </div>
          )}

          {/* 5. Archive Reason (EDIT MODE + ARCHIVE STATUS ONLY) */}
          {mode === "edit" && status === "Archive" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Archive Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={archiveReason}
                onChange={(e) => {
                  setArchiveReason(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="Specify the reason for archiving this fare policy..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>
          )}

          {/* 6. Applicable Branches */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Applicable Branches <span className="text-rose-500">*</span>
              </label>
              {branches.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleAllBranches}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  {selectedBranchIds.length === branches.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            <div className="max-h-36 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              {branches.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No owned branches found.</p>
              ) : (
                branches.map((b) => (
                  <label
                    key={b.supplier_profile_id}
                    className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBranchIds.includes(b.supplier_profile_id)}
                      onChange={() => handleToggleBranch(b.supplier_profile_id)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>{b.business_name || b.organization_name || `Branch #${b.supplier_profile_id}`}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer - Centered Green Save Button Only */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 bg-white flex items-center justify-center">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-10 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>{mode === "edit" ? "Saving Changes..." : "Saving Policy..."}</span>
              </>
            ) : (
              <span>{mode === "edit" ? "Save Changes" : "Save Policy"}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

