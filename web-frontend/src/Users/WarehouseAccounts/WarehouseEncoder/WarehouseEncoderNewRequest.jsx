import { useState } from "react";
import { Upload, Info } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import CustomTextbox from "../../../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import Toast from "../../../Components/Modals/Toast";
import CategoryBarCard from "../../../Components/Graphs/BarGraphsCard";
import SalesTrendCard from "../../../Components/Graphs/LineGraphsCard";

const WarehouseEncoderNewRequest = () => {
  const [toast, setToast] = useState({ isOpen: false, message: "", type: "success" });
  const [formData, setFormData] = useState({
    productVariant: null,
    supplier: null,
    batchNumber: "",
    stockQuantity: "",
    targetArrivalDate: "",
    requiredByDate: "",
    notes: "",
  });

  // Mock data for Historical Demand Chart
  const historicalDemandData = [
  ];

  // Mock data for Forecast Trend
  const forecastData = [
   
  ];

  const forecastRangeOptions = [
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
  ];

  // Mock data
  const productVariants = [
    { value: "dinorado", label: "Dinorado" },
    { value: "japonica", label: "Japonica" },
    { value: "basmati", label: "Basmati" },
  ];

  const suppliers = [
    { value: "supplier1", label: "Local Farm Supply Co." },
    { value: "supplier2", label: "Regional Grain Traders" },
    { value: "supplier3", label: "Premium Rice Exporters" },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    // Validate form
    if (!formData.productVariant || !formData.supplier || !formData.stockQuantity) {
      setToast({
        isOpen: true,
        message: "Please fill in all required fields",
        type: "error",
      });
      return;
    }

    // Show success toast
    setToast({
      isOpen: true,
      message: "Order Request Submitted Successfully!",
      type: "success",
    });

    // Reset form after 2 seconds
    setTimeout(() => {
      setFormData({
        productVariant: null,
        supplier: null,
        batchNumber: "",
        stockQuantity: "",
        targetArrivalDate: "",
        requiredByDate: "",
        notes: "",
      });
    }, 2000);
  };

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Management", path: "/warehouse-encoder/dashboard" },
          { label: "New Request" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">New Request</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create a new supply request for the selected product variant and supplier.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Left Section - Form */}
        <div className="md:col-span-2 space-y-6">
          {/* PRODUCT DETAILS */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">PRODUCT DETAILS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Dropdown
                label="Product Variant *"
                options={productVariants}
                value={formData.productVariant}
                onChange={(val) => handleInputChange("productVariant", val)}
                placeholder="Select Variant"
              />
              <Dropdown
                label="Select Supplier *"
                options={suppliers}
                value={formData.supplier}
                onChange={(val) => handleInputChange("supplier", val)}
                placeholder="Select Supplier"
              />
            </div>
            <div className="mt-3 flex items-start gap-2 text-[12px] text-gray-500">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <p>Selecting a supplier automatically updates demand forecasting</p>
            </div>
          </div>

          {/* ORDER SETUP */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">ORDER SETUP</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomTextbox
                label="Batch Number (Auto-Generated)"
                placeholder="Batch-2024/0029-1430"
                type="text"
                value={formData.batchNumber}
                onChange={(e) => handleInputChange("batchNumber", e.target.value)}
              />
              <CustomTextbox
                label="Stock Quantity (kg) *"
                placeholder="Enter Quantity"
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => handleInputChange("stockQuantity", e.target.value)}
              />
            </div>
            <div className="mt-3 flex items-start gap-2 text-[12px] text-gray-500">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <p>Dates must be at least 5 days from today</p>
            </div>
          </div>

          {/* TARGET DATES */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">TARGET DATES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Target Arrival Date
                </label>
                <input
                  type="date"
                  value={formData.targetArrivalDate}
                  onChange={(e) => handleInputChange("targetArrivalDate", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#CECECE] bg-white text-gray-700 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Required By Date
                </label>
                <input
                  type="date"
                  value={formData.requiredByDate}
                  onChange={(e) => handleInputChange("requiredByDate", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#CECECE] bg-white text-gray-700 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition"
                />
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-[12px] text-gray-500">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <p>Dates must be at least 5 days from today</p>
            </div>
          </div>

          {/* ATTACHMENTS */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">ATTACHMENTS</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
              <Upload size={40} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here or click to select
              </p>
              <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-full hover:bg-green-700 transition">
                Upload
              </button>
            </div>
            <div className="mt-3 flex items-start gap-2 text-[12px] text-gray-500">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <p>Accepted: PNG, JPG, JPEG, WEBP, PDF, XLS, XLSX (Max. 10MB)</p>
            </div>
          </div>

          {/* NOTES */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">NOTES</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Add additional instructions for the supplier..."
              className="w-full px-4 py-3 rounded-xl border border-[#CECECE] bg-white text-gray-700 placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition resize-none"
              rows={4}
            />
            <div className="text-right text-xs text-gray-400 mt-1">0 / 1000</div>
          </div>

          {/* Submit Button */}
          <CustomGreenButton
            text="Submit Order Request"
            onClick={handleSubmit}
            className="w-full! py-3! text-base! font-semibold!"
          />
        </div>

        {/* Right Section - Info Panels */}
        <div className="space-y-6">
          {/* RECOMMENDED QUANTITY */}
          <div className="bg-green-600 rounded-lg text-white p-6">
            <h3 className="font-bold text-lg mb-2">RECOMMENDED QUANTITY</h3>
            <p className="text-2xl font-bold mb-2">1200 kg</p>
            <p className="text-xs opacity-90">
              Calculated using historical demand and inventory trends.
            </p>
          </div>

          {/* HISTORICAL DEMAND */}
          <CategoryBarCard
            title="HISTORICAL DEMAND (Last 12 Months)"
            items={historicalDemandData}
            maxValue={1200}
            height={200}
          />

          {/* CURRENT MONTH FORECAST */}
          <SalesTrendCard
            title="CURRENT MONTH FORECAST"
            data={forecastData}
            rangeOptions={forecastRangeOptions}
            selectedValue="Week"
            height={200}
            maxValue={500}
          />

          {/* FORECAST GUIDE */}
          <div className="bg-gray-100 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-3">FORECAST GUIDE</h3>
            <p className="text-xs text-gray-700 mb-3">
              Learn how our predictive engine calculates suggested stock levels based on seasonal trends and market data.
            </p>
            <button className="w-full px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ isOpen: false, message: "", type: "success" })}
      />
    </>
  );
};

export default WarehouseEncoderNewRequest;
