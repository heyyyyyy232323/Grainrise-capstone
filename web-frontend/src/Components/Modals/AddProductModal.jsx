import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload } from "lucide-react";

// Import reusable components
import Dropdown from "../Minor-Components/Dropdown";
import CustomTextbox from "../Minor-Components/CustomTextbox";
import CustomGreenButton from "../Minor-Components/CustomGreenButton";
import RichTextEditor from "../Minor-Components/RichTextEditor";

export default function AddProductModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    variant: "",
    productCode: "BATCH 2026 - 001",
    supplier: "",
    image: null,
    imageName: "",
    orderDate: "",
    arrivalDate: "",
    stockQuantity: "",
    unitCost: "",
    expirationDate: "",
    descriptionHtml: "",
    descriptionText: "",
  });

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        image: file,
        imageName: file.name,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(formData);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {/* Retained original max-w-2xl size */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col my-auto">
        
        {/* Header (Fixed height) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Product</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add a new inventory stock entry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Scrollable Content */}
        <form 
          onSubmit={handleSubmit} 
          className="p-5 space-y-4 overflow-y-auto flex-1 text-xs custom-scrollbar"
        >
          {/* Section 1: Product Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Product Information
            </h3>

            {/* Restored to original 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <CustomTextbox
                label="Variant *"
                placeholder="Enter variant name"
                value={formData.variant}
                onChange={(e) => handleInputChange("variant", e.target.value)}
              />

              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Code{" "}
                  <span className="text-[10px] text-gray-400 font-normal">
                    (Auto Generated)
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.productCode}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-xs font-medium text-gray-600 cursor-not-allowed outline-none"
                />
              </div>

              <Dropdown
                label="Supplier *"
                placeholder="Select supplier"
                options={[
                  { label: "AgriCorp Farms", value: "agricorp" },
                  { label: "Golden Grain Co.", value: "goldengrain" },
                ]}
                value={formData.supplier}
                onChange={(val) => handleInputChange("supplier", val)}
              />

              {/* Custom Image Upload */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Image
                </label>
                <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden bg-white h-[38px]">
                  <label className="flex items-center gap-1.5 px-3 h-full bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 border-r border-gray-200 transition shrink-0">
                    <Upload size={13} />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  <span className="px-3 text-xs text-gray-400 truncate">
                    {formData.imageName || "No File Chosen"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          {/* Section 2: Inventory & Dates */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Inventory & Dates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => handleInputChange("orderDate", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Arrival Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) => handleInputChange("arrivalDate", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Stock Quantity (kg) <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white focus-within:border-emerald-500 h-[38px]">
                  <input
                    type="number"
                    placeholder="e.g. 1,000"
                    value={formData.stockQuantity}
                    onChange={(e) => handleInputChange("stockQuantity", e.target.value)}
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none"
                  />
                  <span className="bg-gray-100 text-gray-500 text-xs px-3 flex items-center border-l border-gray-200 font-medium">
                    kg
                  </span>
                </div>
              </div>

              {/* Unit Cost */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Unit Cost (₱/kg) <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white focus-within:border-emerald-500 h-[38px]">
                  <span className="bg-gray-100 text-gray-500 text-xs px-3 flex items-center border-r border-gray-200 font-medium">
                    ₱
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.unitCost}
                    onChange={(e) => handleInputChange("unitCost", e.target.value)}
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Expiration Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => handleInputChange("expirationDate", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          {/* Section 3: Additional Information */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Additional Information
            </h3>
            <div>
              <label className="block mb-1.5 font-medium text-gray-700">
                Description
              </label>
              <RichTextEditor
                placeholder="Enter product description..."
                minHeight={90}
                onChange={(html, text) => {
                  setFormData((prev) => ({
                    ...prev,
                    descriptionHtml: html,
                    descriptionText: text,
                  }));
                }}
              />
            </div>
          </div>
        </form>

        {/* Footer Buttons (Fixed height) */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-[#F5F7FF] border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition cursor-pointer"
          >
            Cancel
          </button>
          <CustomGreenButton text="Save Product" onClick={handleSubmit} className="!py-1.5 !text-xs" />
        </div>
      </div>
    </div>,
    document.body
  );
}