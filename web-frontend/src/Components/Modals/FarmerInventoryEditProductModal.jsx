import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

import CustomGreenButton from "../Minor-Components/CustomGreenButton";

const GRADE_OPTIONS = [
  "Grade 1 (Premium)",
  "Grade 2 (Standard)",
  "Grade 3",
  "Commercial",
  "Other / Specify",
];

export default function FarmerInventoryEditProductModal({
  open,
  product,
  onClose,
  onSave,
  isSaving = false,
  apiError = "",
}) {
  const [form, setForm] = useState({
    product_grade_selection: "",
    product_grade_custom: "",
    selling_price_per_kg: "",
    description: "",
    product_image: "",
    product_image_name: "",
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [localError, setLocalError] = useState("");
  const [isReadingImage, setIsReadingImage] = useState(false);

  // Initialize from product
  useEffect(() => {
    if (open && product) {
      const existingGrade = product.product_grade || "";
      const isCustomGrade =
        existingGrade && !GRADE_OPTIONS.includes(existingGrade);

      setForm({
        product_grade_selection: isCustomGrade
          ? "Other / Specify"
          : existingGrade || "",
        product_grade_custom: isCustomGrade ? existingGrade : "",
        selling_price_per_kg:
          product.selling_price_per_kg !== null &&
          product.selling_price_per_kg !== undefined
            ? String(product.selling_price_per_kg)
            : "",
        description: product.description || product.product_description || "",
        product_image: product.product_image || "",
        product_image_name: product.product_image ? "Existing Image" : "",
      });

      setPreviewUrl(product.product_image || null);
      setLocalError("");
    }
  }, [open, product]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !product) return null;

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setLocalError("");
  };

  const handleReset = () => {
    if (!product) return;
    const existingGrade = product.product_grade || "";
    const isCustomGrade =
      existingGrade && !GRADE_OPTIONS.includes(existingGrade);

    setForm({
      product_grade_selection: isCustomGrade
        ? "Other / Specify"
        : existingGrade || "",
      product_grade_custom: isCustomGrade ? existingGrade : "",
      selling_price_per_kg:
        product.selling_price_per_kg !== null &&
        product.selling_price_per_kg !== undefined
          ? String(product.selling_price_per_kg)
          : "",
      description: product.description || product.product_description || "",
      product_image: product.product_image || "",
      product_image_name: product.product_image ? "Existing Image" : "",
    });

    setPreviewUrl(product.product_image || null);
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

    let sellingPrice = null;
    if (form.selling_price_per_kg) {
      sellingPrice = parseFloat(form.selling_price_per_kg);
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        setLocalError("Selling Price per kg must be greater than ₱0.00.");
        return;
      }
    }

    const grade =
      form.product_grade_selection === "Other / Specify"
        ? form.product_grade_custom.trim()
        : form.product_grade_selection.trim();

    const payload = {
      product_grade: grade || null,
      selling_price_per_kg: sellingPrice,
      description: form.description.trim() || null,
      product_image: form.product_image || null,
    };

    onSave(product.farm_product_id, payload);
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
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">
              Edit Product — {product.product_code}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Update commercial and presentation details for {product.rice_variety}.
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

          {/* READ-ONLY SUMMARY BOX */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Product Code
              </span>
              <span className="font-semibold text-slate-700">
                {product.product_code || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Variety
              </span>
              <span className="font-semibold text-slate-700">
                {product.rice_variety || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Product Type
              </span>
              <span className="font-semibold text-slate-700">
                {product.product_type || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Stock
              </span>
              <span className="font-semibold text-emerald-700">
                {Number(product.total_stock_quantity_kg || product.stock_quantity_kg || 0).toLocaleString()} kg
              </span>
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          {/* EDITABLE FIELDS */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Commercial & Presentation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                <div className="sm:col-span-2">
                  <label className="block mb-1.5 font-medium text-gray-700">
                    Specify Grade Name
                  </label>
                  <input
                    type="text"
                    value={form.product_grade_custom}
                    onChange={(e) => updateField("product_grade_custom", e.target.value)}
                    placeholder="e.g. Export Grade"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Product Image */}
              <div className="sm:col-span-2">
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Image
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

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter details on moisture, storage bag, or grain condition..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* FOOTER: STRICT EXIT RULES -> Clear + Save Changes, NO Cancel button, top-right X is ONLY exit */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#F5F7FF] border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || isReadingImage}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            Clear
          </button>
          <CustomGreenButton
            text={isSaving ? "Saving Changes..." : "Save Changes"}
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
