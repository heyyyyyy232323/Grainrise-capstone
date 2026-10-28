import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

import CustomGreenButton from "../Minor-Components/CustomGreenButton";

// ============================================================
// CONSTANTS & OPTIONS
// ============================================================

const PRODUCT_TYPE_OPTIONS = [
  { value: "Unmilled Palay", label: "Unmilled Palay" },
  { value: "Milled Rice", label: "Milled Rice" },
];

const RICE_VARIETY_OPTIONS = [
  "Inbred (NSIC Rc 222)",
  "Inbred (NSIC Rc 160)",
  "Hybrid (Mestiso 20)",
  "Hybrid (SL-8H)",
  "Organic / Traditional Rice",
  "Dinorado",
  "Sinandomeng",
  "Other / Specify",
];

const GRADE_OPTIONS = [
  "Grade 1 (Premium)",
  "Grade 2 (Standard)",
  "Grade 3",
  "Commercial",
  "Other / Specify",
];

const SOURCE_TYPE_OPTIONS = [
  { value: "Own Farm", label: "Own Farm" },
  { value: "Other Source", label: "Other Source" },
];

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const EMPTY_FORM = {
  product_type: "Unmilled Palay",
  rice_variety_selection: "",
  rice_variety_custom: "",
  product_grade_selection: "",
  product_grade_custom: "",
  stock_quantity_kg: "",
  selling_price_per_kg: "",
  acquisition_source_type: "Own Farm",
  source_farm_id: "",
  harvest_acquisition_date: getTodayDateString(),
  source_acquisition_remarks: "",
  description: "",
  product_image: "",
  product_image_name: "",
};

export default function FarmerInventoryAddProductModal({
  open,
  onClose,
  onSave,
  farmOptions = [],
  isSaving = false,
  apiError = "",
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [localError, setLocalError] = useState("");
  const [isReadingImage, setIsReadingImage] = useState(false);

  // Initialize or reset when opened
  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        source_farm_id: farmOptions.length > 0 ? String(farmOptions[0].farm_id) : "",
      });
      setPreviewUrl(null);
      setLocalError("");
    }
  }, [open, farmOptions]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Compute live read-only Product Code Preview matching [FARM]-[OWNER]-[MMDDYYYY]-[HHMM]
  const previewProductCode = useMemo(() => {
    let farmName = "Farm Lot";
    if (form.acquisition_source_type === "Other Source") {
      farmName = "Other Source";
    } else if (form.source_farm_id) {
      const match = farmOptions.find(
        (f) => String(f.farm_id) === String(form.source_farm_id)
      );
      if (match?.farm_name) farmName = match.farm_name;
    } else if (farmOptions.length > 0 && farmOptions[0].farm_name) {
      farmName = farmOptions[0].farm_name;
    }

    const words = String(farmName).match(/[A-Za-z0-9]+/g) || ["FM"];
    const farmInitials =
      words.length === 1
        ? words[0].slice(0, 2).toUpperCase()
        : words.map((w) => w[0]).join("").toUpperCase();

    let ownerInitials = "CA";
    try {
      const stored = localStorage.getItem("grainrise_user");
      if (stored) {
        const u = JSON.parse(stored);
        const fn = (u.first_name || "").trim();
        const ln = (u.last_name || "").trim();
        if (fn || ln) {
          ownerInitials = `${fn ? fn[0] : ""}${ln ? ln[0] : ""}`.toUpperCase();
        }
      }
    } catch (_) {}

    const now = new Date();
    const manilaString = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const manilaDate = new Date(manilaString);
    const mm = String(manilaDate.getMonth() + 1).padStart(2, "0");
    const dd = String(manilaDate.getDate()).padStart(2, "0");
    const yyyy = manilaDate.getFullYear();
    const hh = String(manilaDate.getHours()).padStart(2, "0");
    const min = String(manilaDate.getMinutes()).padStart(2, "0");

    return `${farmInitials}-${ownerInitials}-${mm}${dd}${yyyy}-${hh}${min}`;
  }, [form.acquisition_source_type, form.source_farm_id, farmOptions]);

  if (!open) return null;

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalError("");
  };

  const handleClear = () => {
    setForm({
      ...EMPTY_FORM,
      source_farm_id: farmOptions.length > 0 ? String(farmOptions[0].farm_id) : "",
    });
    setPreviewUrl(null);
    setLocalError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setLocalError("Product image must be JPG, PNG, or WEBP.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError("Product image must not exceed 5 MB.");
      e.target.value = "";
      return;
    }

    setLocalError("");
    setIsReadingImage(true);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === "string" ? reader.result : "";
      setForm((prev) => ({
        ...prev,
        product_image: base64,
        product_image_name: file.name,
      }));
      setPreviewUrl(base64);
      setIsReadingImage(false);
    };
    reader.onerror = () => {
      setIsReadingImage(false);
      setLocalError("Unable to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({
      ...prev,
      product_image: "",
      product_image_name: "",
    }));
    setPreviewUrl(null);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    // Validation
    if (!form.product_type) {
      setLocalError("Product Type is required.");
      return;
    }

    const variety =
      form.rice_variety_selection === "Other / Specify"
        ? form.rice_variety_custom.trim()
        : form.rice_variety_selection.trim();

    if (!variety) {
      setLocalError("Rice Variety / Variant is required.");
      return;
    }

    const stockQty = parseFloat(form.stock_quantity_kg);
    if (!stockQty || stockQty <= 0) {
      setLocalError("Stock Quantity must be greater than 0 kg.");
      return;
    }

    let sellingPrice = null;
    if (form.selling_price_per_kg) {
      sellingPrice = parseFloat(form.selling_price_per_kg);
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        setLocalError("Selling price per kg must be greater than ₱0.00.");
        return;
      }
    }

    if (form.acquisition_source_type === "Own Farm" && !form.source_farm_id) {
      setLocalError("Source Farm is required when Source Type is Own Farm.");
      return;
    }

    if (!form.harvest_acquisition_date) {
      setLocalError("Harvest / Acquisition Date is required.");
      return;
    }

    const grade =
      form.product_grade_selection === "Other / Specify"
        ? form.product_grade_custom.trim()
        : form.product_grade_selection.trim();

    const payload = {
      product_type: form.product_type,
      rice_variety: variety,
      product_grade: grade || null,
      stock_quantity_kg: stockQty,
      selling_price_per_kg: sellingPrice,
      acquisition_source_type: form.acquisition_source_type,
      source_farm_id:
        form.acquisition_source_type === "Own Farm"
          ? parseInt(form.source_farm_id, 10)
          : null,
      harvest_acquisition_date: form.harvest_acquisition_date,
      source_acquisition_remarks: form.source_acquisition_remarks.trim() || null,
      description: form.description.trim() || null,
      product_image: form.product_image || null,
    };

    onSave(payload);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER: Top-right X is ONLY exit control */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">Add Inventory Product</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter details for on-farm harvested or acquired rice stock.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs"
        >
          {(localError || apiError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              {localError || apiError}
            </div>
          )}

          {/* Section 1: Product Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Product Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Product Code (Read-Only Auto-Generated Field) */}
              <div className="sm:col-span-2">
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Code{" "}
                  <span className="text-[10px] text-gray-400 font-normal">
                    (Auto-generated: [FARM]-[OWNER]-[MMDDYYYY]-[HHMM])
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={previewProductCode}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-xs font-mono font-bold text-gray-700 cursor-not-allowed outline-none select-none"
                />
              </div>

              {/* Product Type */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.product_type}
                  onChange={(e) => updateField("product_type", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                >
                  {PRODUCT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rice Variety */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Rice Variety / Variant <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.rice_variety_selection}
                  onChange={(e) => updateField("rice_variety_selection", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Variety</option>
                  {RICE_VARIETY_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {form.rice_variety_selection === "Other / Specify" && (
                <div className="sm:col-span-2">
                  <label className="block mb-1.5 font-medium text-gray-700">
                    Specify Variety Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.rice_variety_custom}
                    onChange={(e) => updateField("rice_variety_custom", e.target.value)}
                    placeholder="e.g. Traditional Red Rice, Jasmine"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Product Grade */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Grade / Classification
                </label>
                <select
                  value={form.product_grade_selection}
                  onChange={(e) => updateField("product_grade_selection", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Grade (Optional)</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {form.product_grade_selection === "Other / Specify" && (
                <div>
                  <label className="block mb-1.5 font-medium text-gray-700">
                    Specify Grade Name
                  </label>
                  <input
                    type="text"
                    value={form.product_grade_custom}
                    onChange={(e) => updateField("product_grade_custom", e.target.value)}
                    placeholder="e.g. Export Quality"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Product Image */}
              <div className="sm:col-span-2">
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={22} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden bg-white h-[36px]">
                      <label className="flex items-center gap-1.5 px-3 h-full bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 border-r border-gray-200 transition shrink-0">
                        <Upload size={13} />
                        {form.product_image ? "Change" : "Choose File"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                      <span className="px-3 text-xs text-gray-500 truncate">
                        {form.product_image_name || "No file chosen"}
                      </span>
                    </div>
                    {form.product_image && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[11px] text-red-500 hover:text-red-700 font-medium self-start cursor-pointer transition"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          {/* Section 2: Stock & Commercial */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Stock & Commercial
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Stock Quantity */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Initial Stock Quantity (kg) <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white focus-within:border-emerald-500 h-[38px]">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="e.g. 5000"
                    value={form.stock_quantity_kg}
                    onChange={(e) => updateField("stock_quantity_kg", e.target.value)}
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none"
                  />
                  <span className="bg-gray-100 text-gray-500 text-xs px-3 flex items-center border-l border-gray-200 font-medium">
                    kg
                  </span>
                </div>
              </div>

              {/* Selling Price */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Selling Price (₱/kg)
                </label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white focus-within:border-emerald-500 h-[38px]">
                  <span className="bg-gray-100 text-gray-500 text-xs px-3 flex items-center border-r border-gray-200 font-medium">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 25.00"
                    value={form.selling_price_per_kg}
                    onChange={(e) => updateField("selling_price_per_kg", e.target.value)}
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          {/* Section 3: Origin & Acquisition */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Origin & Acquisition
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Source Type */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Source Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.acquisition_source_type}
                  onChange={(e) => updateField("acquisition_source_type", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                >
                  {SOURCE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Farm */}
              {form.acquisition_source_type === "Own Farm" && (
                <div>
                  <label className="block mb-1.5 font-medium text-gray-700">
                    Source Farm <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.source_farm_id}
                    onChange={(e) => updateField("source_farm_id", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select Farm Lot</option>
                    {farmOptions.map((f) => (
                      <option key={f.farm_id} value={f.farm_id}>
                        {f.farm_name} ({f.farm_location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Harvest / Acquisition Date */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Harvest / Acquisition Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  max={getTodayDateString()}
                  value={form.harvest_acquisition_date}
                  onChange={(e) => updateField("harvest_acquisition_date", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Remarks */}
              <div className={form.acquisition_source_type === "Own Farm" ? "sm:col-span-1" : "sm:col-span-2"}>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Acquisition Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purchased from cooperative..."
                  value={form.source_acquisition_remarks}
                  onChange={(e) => updateField("source_acquisition_remarks", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter details on moisture, storage bag, or grain condition..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* FOOTER: STRICT EXIT RULES -> Clear + Add Product, NO Cancel button, top-right X is ONLY exit */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#F5F7FF] border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleClear}
            disabled={isSaving || isReadingImage}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            Clear
          </button>
          <CustomGreenButton
            text={isSaving ? "Adding Product..." : "Add Product"}
            onClick={handleSubmit}
            disabled={isSaving || isReadingImage}
            className="!py-1.5 !text-xs"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
