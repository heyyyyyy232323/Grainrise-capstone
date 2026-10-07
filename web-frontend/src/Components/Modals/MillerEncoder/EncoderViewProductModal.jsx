import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Pencil, Image as ImageIcon } from "lucide-react";

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

const getBaseServerUrl = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (!envUrl) return "";
  return envUrl.replace(/\/api$/, "");
};

const resolveProductImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return null;
  const trimmed = imagePath.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = getBaseServerUrl();
  let cleanPath = trimmed.replace(/^\/+/, "");
  while (cleanPath.startsWith("media/")) {
    cleanPath = cleanPath.slice(6);
  }
  const mediaPath = `/media/${cleanPath}`;
  return base ? `${base}${mediaPath}` : mediaPath;
};

const getDisplayFilename = (path) => {
  if (!path || typeof path !== "string") return "";
  return path.split("/").pop().split("\\").pop();
};

const hasVisibleContent = (htmlString) => {
  if (!htmlString || typeof htmlString !== "string") return false;
  const stripped = htmlString.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return stripped.length > 0;
};

const sanitizeHtml = (rawHtml) => {
  if (!rawHtml || typeof rawHtml !== "string") return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    const ALLOWED_TAGS = new Set([
      "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL",
      "P", "DIV", "SPAN", "BR", "HR",
      "H1", "H2", "H3", "H4", "H5", "H6",
      "UL", "OL", "LI",
      "A", "BLOCKQUOTE", "CODE", "PRE"
    ]);

    const ALLOWED_STYLES = new Set([
      "text-align", "font-weight", "font-style", "text-decoration", "color"
    ]);

    const cleanNode = (node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!ALLOWED_TAGS.has(child.tagName)) {
            child.remove();
          } else {
            const attrs = Array.from(child.attributes);
            for (const attr of attrs) {
              const attrName = attr.name.toLowerCase();
              if (attrName === "style") {
                const cleanStyles = [];
                const styleObj = child.style;
                for (let i = 0; i < styleObj.length; i++) {
                  const prop = styleObj[i];
                  if (ALLOWED_STYLES.has(prop)) {
                    cleanStyles.push(`${prop}: ${styleObj.getPropertyValue(prop)}`);
                  }
                }
                if (cleanStyles.length > 0) {
                  child.setAttribute("style", cleanStyles.join("; "));
                } else {
                  child.removeAttribute("style");
                }
              } else if (attrName === "href" && child.tagName === "A") {
                const href = attr.value.trim();
                if (/^(https?:|\/|mailto:)/i.test(href)) {
                  child.setAttribute("href", href);
                  child.setAttribute("target", "_blank");
                  child.setAttribute("rel", "noopener noreferrer");
                } else {
                  child.removeAttribute("href");
                }
              } else {
                child.removeAttribute(attr.name);
              }
            }
            cleanNode(child);
          }
        } else if (child.nodeType !== Node.TEXT_NODE) {
          child.remove();
        }
      }
    };

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch (err) {
    console.error("Sanitizing error:", err);
    return "";
  }
};

export default function EncoderViewProductModal({
  isOpen,
  onClose,
  onSave,
  product,
  suppliers = [],
  isLoading = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    variant: "",
    productCode: "",
    supplierId: "",
    image: null,
    imageName: "",
    imagePath: "",
    orderDate: "",
    arrivalDate: "",
    stockQuantity: "",
    unitCost: "",
    expirationDate: "",
    shelfLocation: "",
    descriptionHtml: "",
    descriptionText: "",
  });
  const [initialData, setInitialData] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [errors, setErrors] = useState({});
  const editorContainerRef = useRef(null);

  useEffect(() => {
    if (product && isOpen) {
      const rawImagePath =
        product.product_image || product.productImage || product.image || "";
      const data = {
        variant: product.product_name || product.variant || "",
        productCode: product.product_code || product.productCode || "",
        supplierId: product.farmer_contact_id || product.farmerContactId || "",
        image: null,
        imageName: rawImagePath,
        imagePath: rawImagePath,
        orderDate: product.order_date || "",
        arrivalDate: product.arrival_date || "",
        stockQuantity:
          product.stock_quantity !== undefined && product.stock_quantity !== null
            ? String(product.stock_quantity)
            : product.stockQty
            ? String(product.stockQty).replace(/[^0-9.]/g, "")
            : "",
        unitCost:
          product.unit_cost !== undefined && product.unit_cost !== null
            ? String(product.unit_cost)
            : "",
        expirationDate: product.expiry_date || product.expirationDate || "",
        shelfLocation: product.shelf_location || "",
        descriptionHtml: product.product_description || product.description || "",
        descriptionText: product.product_description || product.description || "",
      };
      setFormData(data);
      setInitialData(data);
      setIsEditing(false);
      setErrors({});
      setImageError(false);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [product, isOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (isEditing && editorContainerRef.current) {
      const editorEl = editorContainerRef.current.querySelector(".rte-editor");
      if (editorEl) {
        editorEl.innerHTML = sanitizeHtml(formData.descriptionHtml || "");
        editorEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }, [isEditing]);

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
    }
  };

  const handleRemoveReplacement = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setImageError(false);
    setFormData((prev) => ({
      ...prev,
      image: null,
      imageName: initialData.imageName || "",
    }));
  };

  const handleCancelEdit = () => {
    // IMPORTANT: Discard unsaved edits and return to View Mode without closing the modal
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setImageError(false);
    setFormData(initialData);
    setErrors({});
    setIsEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.variant.trim()) {
      newErrors.variant = "Variant / Product Name is required.";
    }

    const stockNum = Number(formData.stockQuantity);
    if (formData.stockQuantity === "" || isNaN(stockNum)) {
      newErrors.stockQuantity = "Stock quantity is required.";
    } else if (stockNum <= 0) {
      newErrors.stockQuantity = "Stock quantity must be greater than 0.";
    }

    if (formData.unitCost !== "" && formData.unitCost !== null && formData.unitCost !== undefined) {
      const costNum = Number(formData.unitCost);
      if (isNaN(costNum)) {
        newErrors.unitCost = "Unit cost must be a valid number.";
      } else if (costNum <= 0) {
        newErrors.unitCost = "Unit cost must be greater than 0.";
      }
    }

    if (formData.expirationDate) {
      const todayStr = getTodayDateString();
      if (formData.expirationDate <= todayStr) {
        newErrors.expirationDate = "Expiry date must be a future date.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const productId = product?.product_id || product?.id;
    const desc = hasVisibleContent(formData.descriptionHtml)
      ? formData.descriptionHtml.trim()
      : null;

    if (formData.image instanceof File) {
      const fd = new FormData();
      fd.append("product_name", formData.variant.trim());
      if (formData.supplierId) fd.append("farmer_contact_id", formData.supplierId);
      fd.append("stock_quantity", formData.stockQuantity);
      if (formData.unitCost !== "") fd.append("unit_cost", formData.unitCost);
      if (formData.shelfLocation.trim()) fd.append("shelf_location", formData.shelfLocation.trim());
      if (formData.expirationDate) fd.append("expiry_date", formData.expirationDate);
      if (desc) fd.append("product_description", desc);
      else fd.append("product_description", "");
      fd.append("product_image", formData.image);

      onSave?.(productId, fd, () => {
        setIsEditing(false);
      });
    } else {
      const jsonPayload = {
        product_name: formData.variant.trim(),
        stock_quantity: Number(formData.stockQuantity),
        unit_cost: formData.unitCost !== "" ? Number(formData.unitCost) : null,
        shelf_location: formData.shelfLocation.trim() || null,
        expiry_date: formData.expirationDate || null,
        product_description: desc,
      };

      if (formData.supplierId) {
        jsonPayload.farmer_contact_id = Number(formData.supplierId);
      }

      onSave?.(productId, jsonPayload, () => {
        setIsEditing(false);
      });
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    label: s.supplier_display_name || s.contact_person || `Supplier #${s.farmer_contact_id}`,
    value: s.farmer_contact_id,
  }));

  // Resolve current supplier label in View Mode
  const currentSupplierLabel =
    suppliers.find((s) => s.farmer_contact_id === formData.supplierId)
      ?.supplier_display_name ||
    product?.supplier_display_name ||
    product?.supplier ||
    "Not specified";

  const activeImageUrl =
    previewUrl || resolveProductImageUrl(formData.imagePath || initialData.imagePath);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditing ? "Edit Product Details" : "Product Details"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEditing
                ? "Update product stock information."
                : "View complete product entry information."}
            </p>
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
                  disabled={!isEditing}
                  value={formData.variant}
                  onChange={(e) => handleInputChange("variant", e.target.value)}
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
                  value={formData.productCode || "—"}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-xs font-medium text-gray-600 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                {isEditing && suppliers.length > 0 ? (
                  <Dropdown
                    label="Supplier"
                    placeholder="Select supplier"
                    options={supplierOptions}
                    value={formData.supplierId}
                    onChange={(val) => handleInputChange("supplierId", val)}
                  />
                ) : (
                  <div>
                    <label className="block mb-1.5 font-medium text-gray-700">
                      Supplier
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={currentSupplierLabel}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700 cursor-not-allowed outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Product Image */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Product Image
                </label>
                <div className="flex items-center gap-3 p-1.5 rounded-xl border border-gray-200 bg-gray-50/60 min-h-[58px]">
                  {/* Image Preview Box */}
                  <div className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center shadow-2xs">
                    {activeImageUrl && !imageError ? (
                      <img
                        src={activeImageUrl}
                        alt={formData.variant || "Product"}
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

                  {/* Info or Edit Controls */}
                  {isEditing ? (
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
                          {formData.image
                            ? formData.image.name
                            : formData.imageName
                            ? getDisplayFilename(formData.imageName)
                            : "No file chosen"}
                        </span>
                      </div>
                      {formData.image && (
                        <button
                          type="button"
                          onClick={handleRemoveReplacement}
                          className="text-[10px] text-red-500 hover:text-red-700 font-medium self-start cursor-pointer transition"
                        >
                          Revert to current image
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 flex flex-col justify-center px-1">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {formData.imagePath
                          ? getDisplayFilename(formData.imagePath)
                          : "No image uploaded"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formData.imagePath && !imageError
                          ? "Product thumbnail"
                          : "No image available"}
                      </span>
                    </div>
                  )}
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
                  Order Date{" "}
                  <span className="text-[10px] text-gray-400 font-normal">
                    (Read-Only)
                  </span>
                </label>
                <input
                  type="date"
                  disabled
                  readOnly
                  value={formData.orderDate}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-500 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Arrival Date{" "}
                  <span className="text-[10px] text-gray-400 font-normal">
                    (Read-Only)
                  </span>
                </label>
                <input
                  type="date"
                  disabled
                  readOnly
                  value={formData.arrivalDate}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-500 cursor-not-allowed outline-none"
                />
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
                    disabled={!isEditing}
                    placeholder="e.g. 1000"
                    value={formData.stockQuantity}
                    onChange={(e) => handleInputChange("stockQuantity", e.target.value)}
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none disabled:bg-gray-50 disabled:text-gray-500"
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
                  Unit Cost (₱/kg)
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
                    disabled={!isEditing}
                    placeholder="0.00"
                    value={formData.unitCost}
                    onChange={(e) => handleInputChange("unitCost", e.target.value)}
                    className="w-full px-3 py-2 text-xs text-gray-700 border-none outline-none disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                {errors.unitCost && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.unitCost}</p>
                )}
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block mb-1.5 font-medium text-gray-700">
                  Expiration Date
                </label>
                <input
                  type="date"
                  min={getTomorrowDateString()}
                  disabled={!isEditing}
                  value={formData.expirationDate}
                  onChange={(e) => handleInputChange("expirationDate", e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs text-gray-700 focus:outline-none focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500 ${
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
                  label="Shelf Location"
                  placeholder="e.g. Bay A-12, Silo 1"
                  disabled={!isEditing}
                  value={formData.shelfLocation}
                  onChange={(e) => handleInputChange("shelfLocation", e.target.value)}
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
              {isEditing ? (
                <div ref={editorContainerRef}>
                  <RichTextEditor
                    placeholder="Enter product description..."
                    minHeight={90}
                    value={formData.descriptionHtml}
                    onChange={(html, text) => {
                      setFormData((prev) => ({
                        ...prev,
                        descriptionHtml: html,
                        descriptionText: text,
                      }));
                    }}
                  />
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-xs min-h-[60px] leading-relaxed break-words space-y-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-semibold [&_a]:text-emerald-600 [&_a]:underline">
                  {hasVisibleContent(formData.descriptionHtml) ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(formData.descriptionHtml),
                      }}
                    />
                  ) : (
                    <p className="text-gray-400 italic">No description available.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-[#F5F7FF] border-t border-gray-100 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isLoading}
                className="px-4 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <CustomGreenButton
                text={isLoading ? "Saving..." : "Save Changes"}
                onClick={handleSubmit}
                disabled={isLoading}
                className="!py-1.5 !text-xs"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg active:scale-95 transition cursor-pointer"
            >
              <Pencil size={13} />
              Edit Product
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

