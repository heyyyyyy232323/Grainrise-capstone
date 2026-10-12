import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Layers } from "lucide-react";

import CustomTextbox from "../../Minor-Components/CustomTextbox";
import CustomGreenButton from "../../Minor-Components/CustomGreenButton";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function EncoderUpdateUnmilledModal({
  isOpen,
  onClose,
  onSave,
  product,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    expirationDate: "",
    stockQuantity: "",
    unitCost: "",
    shelfLocation: "",
  });
  const [errors, setErrors] = useState({});

  const currentStock =
    product?.stock_quantity !== undefined && product?.stock_quantity !== null
      ? Number(product.stock_quantity)
      : null;

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        expirationDate: product.expiry_date || "",
        stockQuantity:
          product.stock_quantity !== undefined && product.stock_quantity !== null
            ? String(product.stock_quantity)
            : "",
        unitCost:
          product.unit_cost !== undefined && product.unit_cost !== null
            ? String(product.unit_cost)
            : "",
        shelfLocation: product.shelf_location || "",
      });
      setErrors({});
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.expirationDate) {
      newErrors.expirationDate = "Expiration Date is required.";
    } else {
      const todayStr = getTodayDateString();
      if (formData.expirationDate <= todayStr) {
        newErrors.expirationDate = "Expiry date must be a future date.";
      }
    }

    const stockNum = Number(formData.stockQuantity);
    if (formData.stockQuantity === "" || isNaN(stockNum)) {
      newErrors.stockQuantity = "Stock quantity is required.";
    } else if (stockNum <= 0) {
      newErrors.stockQuantity = "Stock quantity must be greater than 0.";
    } else if (currentStock !== null && stockNum > currentStock) {
      newErrors.stockQuantity = `Stock quantity cannot exceed the current unmilled stock of ${currentStock} kg.`;
    }

    const costNum = Number(formData.unitCost);
    if (formData.unitCost === "" || isNaN(costNum)) {
      newErrors.unitCost = "Unit cost is required.";
    } else if (costNum <= 0) {
      newErrors.unitCost = "Unit cost must be greater than 0.";
    }

    if (!formData.shelfLocation.trim()) {
      newErrors.shelfLocation = "Shelf Location is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const productId = product?.product_id || product?.id;
    const payload = {
      expiry_date: formData.expirationDate,
      stock_quantity: Number(formData.stockQuantity),
      unit_cost: Number(formData.unitCost),
      shelf_location: formData.shelfLocation.trim(),
    };

    onSave?.(productId, payload);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Layers size={19} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Update Unmilled Product
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Process unmilled inventory into active stock.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto flex-1 text-xs custom-scrollbar"
        >
          {/* Read-Only Product Identity */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 space-y-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Product Identity (Read-Only)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400 block text-[11px]">Product Code:</span>
                <span className="font-semibold text-gray-800">
                  {product?.product_code || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Variant:</span>
                <span className="font-semibold text-gray-800">
                  {product?.product_name || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Supplier:</span>
                <span className="font-medium text-gray-700">
                  {product?.supplier_display_name || product?.supplier || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Current Unmilled Stock:</span>
                <span className="font-bold text-emerald-700">
                  {currentStock !== null ? `${currentStock.toLocaleString("en-US")} kg` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Required Editable Fields */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Stock & Storage Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Expiration Date */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Expiration Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={getTomorrowDateString()}
                  value={formData.expirationDate}
                  onChange={(e) =>
                    handleInputChange("expirationDate", e.target.value)
                  }
                  className={`w-full px-3 py-2 rounded-xl border text-xs text-gray-700 focus:outline-none focus:border-emerald-500 ${
                    errors.expirationDate ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.expirationDate && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.expirationDate}
                  </p>
                )}
              </div>

              {/* Shelf Location */}
              <div>
                <CustomTextbox
                  label="Shelf Location *"
                  placeholder="e.g. Bay A-12, Silo 3"
                  value={formData.shelfLocation}
                  onChange={(e) =>
                    handleInputChange("shelfLocation", e.target.value)
                  }
                />
                {errors.shelfLocation && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.shelfLocation}
                  </p>
                )}
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Stock Quantity (kg) <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex rounded-xl border overflow-hidden bg-white focus-within:border-emerald-500 h-[38px] ${
                    errors.stockQuantity ? "border-red-500" : "border-gray-200"
                  }`}
                >
                  <input
                    type="number"
                    min="0.01"
                    max={currentStock !== null ? currentStock : undefined}
                    step="any"
                    placeholder="e.g. 500"
                    value={formData.stockQuantity}
                    onChange={(e) =>
                      handleInputChange("stockQuantity", e.target.value)
                    }
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none"
                  />
                  <span className="bg-gray-100 text-gray-500 text-xs px-3 flex items-center border-l border-gray-200 font-medium">
                    kg
                  </span>
                </div>
                {errors.stockQuantity && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.stockQuantity}
                  </p>
                )}
              </div>

              {/* Unit Cost */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Unit Cost (₱/kg) <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex rounded-xl border overflow-hidden bg-white focus-within:border-emerald-500 h-[38px] ${
                    errors.unitCost ? "border-red-500" : "border-gray-200"
                  }`}
                >
                  <span className="bg-gray-100 text-gray-500 text-xs px-3 flex items-center border-r border-gray-200 font-medium">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.unitCost}
                    onChange={(e) =>
                      handleInputChange("unitCost", e.target.value)
                    }
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none"
                  />
                </div>
                {errors.unitCost && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.unitCost}
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-[#F5F7FF] border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <CustomGreenButton
            text={isLoading ? "Processing..." : "Process & Activate Stock"}
            onClick={handleSubmit}
            disabled={isLoading}
            className="!py-1.5 !text-xs"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

