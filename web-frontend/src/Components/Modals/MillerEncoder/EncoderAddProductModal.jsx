import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Image as ImageIcon } from "lucide-react";

import Dropdown from "../../Minor-Components/Dropdown";
import CustomTextbox from "../../Minor-Components/CustomTextbox";
import CustomGreenButton from "../../Minor-Components/CustomGreenButton";
import RichTextEditor from "../../Minor-Components/RichTextEditor";

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

const hasVisibleContent = (htmlString) => {
  if (!htmlString || typeof htmlString !== "string") return false;
  const stripped = htmlString.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return stripped.length > 0;
};

export default function EncoderAddProductModal({
  isOpen,
  onClose,
  onSave,
  suppliers = [],
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    variant: "",
    supplierId: "",
    image: null,
    imageName: "",
    orderDate: "",
    arrivalDate: "",
    stockQuantity: "",
    unitCost: "",
    expirationDate: "",
    shelfLocation: "",
    descriptionHtml: "",
    descriptionText: "",
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        variant: "",
        supplierId: "",
        image: null,
        imageName: "",
        orderDate: "",
        arrivalDate: "",
        stockQuantity: "",
        unitCost: "",
        expirationDate: "",
        shelfLocation: "",
        descriptionHtml: "",
        descriptionText: "",
      });
      setErrors({});
      setImageError(false);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setImageError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setImageError(false);
    onClose?.();
  };

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setImageError(false);
      setFormData((prev) => ({
        ...prev,
        image: file,
        imageName: file.name,
      }));
      if (errors.image) {
        setErrors((prev) => ({ ...prev, image: null }));
      }
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setImageError(false);
    setFormData((prev) => ({
      ...prev,
      image: null,
      imageName: "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};

    // 1. Variant
    if (!formData.variant.trim()) {
      newErrors.variant = "Variant / Product Name is required.";
    }

    // 2. Supplier
    if (!formData.supplierId) {
      newErrors.supplierId = "Supplier is required.";
    }

    // 3. Product Image
    if (!formData.image || !(formData.image instanceof File)) {
      newErrors.image = "Product image is required.";
    }

    // 4. Stock Quantity
    const stockNum = Number(formData.stockQuantity);
    if (formData.stockQuantity === "" || formData.stockQuantity === null || formData.stockQuantity === undefined || isNaN(stockNum)) {
      newErrors.stockQuantity = "Stock quantity is required.";
    } else if (stockNum <= 0) {
      newErrors.stockQuantity = "Stock quantity must be greater than 0.";
    }

    // 5. Unit Cost
    const costNum = Number(formData.unitCost);
    if (formData.unitCost === "" || formData.unitCost === null || formData.unitCost === undefined || isNaN(costNum)) {
      newErrors.unitCost = "Unit cost is required.";
    } else if (costNum <= 0) {
      newErrors.unitCost = "Unit cost must be greater than 0.";
    }

    // 6. Dates
    const todayStr = getTodayDateString();

    if (!formData.orderDate) {
      newErrors.orderDate = "Order date is required.";
    } else if (formData.orderDate > todayStr) {
      newErrors.orderDate = "Order date cannot be in the future.";
    }

    if (!formData.arrivalDate) {
      newErrors.arrivalDate = "Arrival date is required.";
    } else if (formData.arrivalDate > todayStr) {
      newErrors.arrivalDate = "Arrival date cannot be in the future.";
    }

    if (!formData.expirationDate) {
      newErrors.expirationDate = "Expiry date is required.";
    } else if (formData.expirationDate <= todayStr) {
      newErrors.expirationDate = "Expiry date must be a future date.";
    }

    // 7. Shelf Location
    if (!formData.shelfLocation.trim()) {
      newErrors.shelfLocation = "Shelf location is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const desc = hasVisibleContent(formData.descriptionHtml)
      ? formData.descriptionHtml.trim()
      : null;

    // Build payload
    if (formData.image instanceof File) {
      const fd = new FormData();
      fd.append("product_name", formData.variant.trim());
      fd.append("farmer_contact_id", formData.supplierId);
      fd.append("stock_quantity", formData.stockQuantity);
      fd.append("unit_cost", formData.unitCost);
      fd.append("shelf_location", formData.shelfLocation.trim());
      fd.append("order_date", formData.orderDate);
      fd.append("arrival_date", formData.arrivalDate);
      fd.append("expiry_date", formData.expirationDate);
      if (desc) fd.append("product_description", desc);
      fd.append("product_image", formData.image);

      onSave?.(fd);
    } else {
      const jsonPayload = {
        product_name: formData.variant.trim(),
        farmer_contact_id: Number(formData.supplierId),
        stock_quantity: Number(formData.stockQuantity),
        unit_cost: Number(formData.unitCost),
        shelf_location: formData.shelfLocation.trim(),
        order_date: formData.orderDate,
        arrival_date: formData.arrivalDate,
        expiry_date: formData.expirationDate,
        product_description: desc,
      };

      onSave?.(jsonPayload);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    label: s.supplier_display_name || s.contact_person || `Supplier #${s.farmer_contact_id}`,
    value: s.farmer_contact_id,
  }));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Product</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add a new inventory stock entry.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
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
          {/* Section 1: Product Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#00580C] uppercase tracking-wider">
              Product Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <CustomTextbox
                  label="Variant *"
                  placeholder="Enter variant name"
                  value={formData.variant}
                  onChange={(e) => handleInputChange("variant", e.target.value)}
                  className={errors.variant ? "!border-red-500" : ""}
                />
                {errors.variant && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.variant}</p>
                )}
              </div>

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
                  disabled
                  value="Automatically generated when product is added"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-xs font-medium text-gray-500 cursor-not-allowed outline-none italic"
                />
              </div>

              <div>
                <Dropdown
                  label="Supplier *"
                  placeholder="Select supplier"
                  options={supplierOptions}
                  value={formData.supplierId}
                  onChange={(val) => handleInputChange("supplierId", val)}
                  error={Boolean(errors.supplierId)}
                />
                {errors.supplierId && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.supplierId}</p>
                )}
              </div>

              {/* Product Image */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Image <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center gap-3 p-1.5 rounded-xl border bg-gray-50/60 min-h-[58px] ${
                    errors.image ? "border-red-500" : "border-gray-200"
                  }`}
                >
                  {/* Image Preview Box */}
                  <div className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center shadow-2xs">
                    {previewUrl && !imageError ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 select-none">
                        <ImageIcon size={18} className="text-gray-300 mb-0.5" />
                        <span className="text-[9px] font-bold text-gray-400 tracking-wider">
                          IMG
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1 pr-1">
                    <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden bg-white h-[34px]">
                      <label className="flex items-center gap-1.5 px-2.5 h-full bg-gray-100 text-[11px] font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 border-r border-gray-200 transition shrink-0">
                        <Upload size={12} />
                        {formData.image ? "Change" : "Choose File"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                      <span className="px-2.5 text-[11px] text-gray-500 truncate">
                        {formData.imageName || "No file chosen"}
                      </span>
                    </div>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[10px] text-red-500 hover:text-red-700 font-medium self-start cursor-pointer transition"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
                {errors.image && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.image}</p>
                )}
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
                  max={getTodayDateString()}
                  value={formData.orderDate}
                  onChange={(e) => handleInputChange("orderDate", e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs text-gray-700 focus:outline-none focus:border-emerald-500 ${
                    errors.orderDate ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.orderDate && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.orderDate}</p>
                )}
              </div>

              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Arrival Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  max={getTodayDateString()}
                  value={formData.arrivalDate}
                  onChange={(e) => handleInputChange("arrivalDate", e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs text-gray-700 focus:outline-none focus:border-emerald-500 ${
                    errors.arrivalDate ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.arrivalDate && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.arrivalDate}</p>
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
                    step="any"
                    placeholder="e.g. 1000"
                    value={formData.stockQuantity}
                    onChange={(e) => handleInputChange("stockQuantity", e.target.value)}
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none"
                  />
                  <span className="bg-gray-100 text-gray-500 text-xs px-3 flex items-center border-l border-gray-200 font-medium">
                    kg
                  </span>
                </div>
                {errors.stockQuantity && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.stockQuantity}</p>
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
                    onChange={(e) => handleInputChange("unitCost", e.target.value)}
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none"
                  />
                </div>
                {errors.unitCost && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.unitCost}</p>
                )}
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Expiration Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={getTomorrowDateString()}
                  value={formData.expirationDate}
                  onChange={(e) => handleInputChange("expirationDate", e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs text-gray-700 focus:outline-none focus:border-emerald-500 ${
                    errors.expirationDate ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.expirationDate && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.expirationDate}</p>
                )}
              </div>

              {/* Shelf Location */}
              <div>
                <CustomTextbox
                  label="Shelf Location *"
                  placeholder="e.g. Bay A-12, Silo 1"
                  value={formData.shelfLocation}
                  onChange={(e) => handleInputChange("shelfLocation", e.target.value)}
                  className={errors.shelfLocation ? "!border-red-500" : ""}
                />
                {errors.shelfLocation && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.shelfLocation}</p>
                )}
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

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-[#F5F7FF] border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <CustomGreenButton
            text={isLoading ? "Saving..." : "Save Product"}
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

