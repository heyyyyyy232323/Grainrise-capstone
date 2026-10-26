import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Upload,
  Camera,
  X,
  AlertCircle,
  Loader2,
  FileText,
  RotateCcw,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import CustomTextbox from "../../../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import RichTextEditor from "../../../Components/Minor-Components/RichTextEditor";
import useAuth from "../../../Components/hooks/useAuth";
import useApi from "../../../Components/hooks/useApi";
import useToast from "../../../Components/hooks/useToast";
import Toast from "../../../Components/Minor-Components/Toast";

const CATEGORY_OPTIONS = [
  { label: "Transportation & Travel", value: "Transportation & Travel" },
  { label: "Meals & Allowances", value: "Meals & Allowances" },
  { label: "Emergency", value: "Emergency" },
  { label: "Equipment & Repair", value: "Equipment & Repair" },
  { label: "Communication Expenses", value: "Communication Expenses" },
  { label: "Logistics", value: "Logistics" },
  { label: "Office & Operating Supplies", value: "Office & Operating Supplies" },
  { label: "Others", value: "Others" },
];

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function MillerDriverReimbursement() {
  const { user: authenticatedUser } = useAuth();
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  // Form States
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [cost, setCost] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // File & Camera Refs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Camera Modal States
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("environment"); // back camera by default
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Today's date in YYYY-MM-DD to prevent future dates
  const todayString = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Compute authenticated driver's full name (read-only)
  const requestedByName = useMemo(() => {
    if (!authenticatedUser) return "Assigned Driver";
    const parts = [
      authenticatedUser.first_name,
      authenticatedUser.middle_initial || authenticatedUser.middle_name,
      authenticatedUser.last_name,
      authenticatedUser.suffix,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" ").trim();
    return (
      authenticatedUser.name ||
      authenticatedUser.full_name ||
      authenticatedUser.email ||
      "Assigned Driver"
    );
  }, [authenticatedUser]);

  // Clean up file preview object URL on change
  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith("blob:")) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  // File Validation Handler
  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    const ext = selectedFile.name?.split(".").pop()?.toLowerCase();
    const isValidType =
      ALLOWED_MIME_TYPES.includes(selectedFile.type) ||
      (ext && ALLOWED_EXTENSIONS.includes(ext));

    if (!isValidType) {
      showToast({
        type: "error",
        title: "Unsupported File Format",
        message: "Only PNG, JPG, JPEG, and WEBP files are accepted. PDF or other formats are not supported.",
      });
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      showToast({
        type: "error",
        title: "File Too Large",
        message: "Attachment file exceeds the 10 MB size limit.",
      });
      return;
    }

    setFile(selectedFile);
    try {
      const previewUrl = URL.createObjectURL(selectedFile);
      setFilePreview(previewUrl);
    } catch {
      setFilePreview(null);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const removeFile = () => {
    if (filePreview && filePreview.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview);
    }
    setFile(null);
    setFilePreview(null);
  };

  // Cost Input Handler (Numeric only, maximum 2 decimal places, strictly non-negative)
  const handleCostChange = (e) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setCost(val);
    }
  };

  // ─── Camera Functions ────────────────────────────────────────────────────────
  const stopCameraStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  const startCameraStream = useCallback(
    async (mode = facingMode) => {
      stopCameraStream();
      setCameraError("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Camera access is not supported by your browser. Please use Choose File or mobile camera capture."
        );
        return;
      }

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback with basic video constraint
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("Camera access error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError(
            "Camera permission was denied. Please allow camera access in your browser settings to take a photo."
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No camera device was found on this system.");
        } else {
          setCameraError("Could not access device camera. Please check your permissions.");
        }
      }
    },
    [facingMode, stopCameraStream]
  );

  const handleOpenPhotoCapture = () => {
    setIsCameraModalOpen(true);
    startCameraStream("environment");
  };

  const handleCloseCameraModal = () => {
    stopCameraStream();
    setIsCameraModalOpen(false);
    setCameraError("");
  };

  useEffect(() => {
    if (isCameraModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isCameraModalOpen]);

  const handleFlipCamera = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCameraStream(newMode);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 960;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showToast({
            type: "error",
            title: "Capture Error",
            message: "Failed to capture image snapshot. Please try again.",
          });
          return;
        }
        const snapFile = new File([blob], `receipt_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        validateAndSetFile(snapFile);
        handleCloseCameraModal();
      },
      "image/jpeg",
      0.9
    );
  };

  // Fallback Camera File Input Handler (Mobile Direct Native Camera)
  const handleFallbackCameraCapture = (e) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
    e.target.value = "";
  };

  // ─── Submit Handler ─────────────────────────────────────────────────────────
  const onSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    if (!category) {
      showToast({
        type: "error",
        title: "Category Required",
        message: "Please select an expense category.",
      });
      return;
    }

    if (category === "Others" && !customCategory.trim()) {
      showToast({
        type: "error",
        title: "Custom Category Required",
        message: "Please specify the custom category name for 'Others'.",
      });
      return;
    }

    const numericCost = parseFloat(cost);
    if (isNaN(numericCost) || numericCost <= 0) {
      showToast({
        type: "error",
        title: "Invalid Cost",
        message: "Please enter a valid expense cost greater than ₱ 0.00.",
      });
      return;
    }

    if (!expenseDate) {
      showToast({
        type: "error",
        title: "Expense Date Required",
        message: "Please enter the date when the expense was incurred.",
      });
      return;
    }

    if (expenseDate > todayString) {
      showToast({
        type: "error",
        title: "Future Date Not Allowed",
        message: "Expense date cannot be in the future.",
      });
      return;
    }

    if (!description.trim()) {
      showToast({
        type: "error",
        title: "Description Required",
        message: "Please provide a description explaining the expense.",
      });
      return;
    }

    if (descriptionLength > 1000) {
      showToast({
        type: "error",
        title: "Description Too Long",
        message: "Description cannot exceed 1,000 characters.",
      });
      return;
    }

    if (!file) {
      showToast({
        type: "error",
        title: "Attachment Required",
        message: "Please attach a photo or image of the receipt/expense proof.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("category", category);
      if (category === "Others") {
        formData.append("custom_category", customCategory.trim());
      }
      formData.append("cost", numericCost.toFixed(2));
      formData.append("expense_date", expenseDate);
      formData.append("description", description);
      formData.append("attachment", file);

      const res = await request("/miller-employees/driver/reimbursements/submit/", {
        method: "POST",
        body: formData,
      });

      if (res && res.success) {
        showToast({
          type: "success",
          title: "Reimbursement Submitted",
          message: res.message || "Your reimbursement request has been submitted to Finance.",
        });

        // Reset form
        setCategory("");
        setCustomCategory("");
        setCost("");
        setExpenseDate("");
        setDescription("");
        setDescriptionLength(0);
        removeFile();
        setEditorKey((prev) => prev + 1);
      } else {
        throw new Error(res?.message || "Failed to submit reimbursement request.");
      }
    } catch (err) {
      console.error("Error submitting driver reimbursement request:", err);
      showToast({
        type: "error",
        title: "Submission Failed",
        message: err.message || "Failed to submit reimbursement request. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Reimbursement" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Reimbursement Request
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Submit driver and delivery reimbursement requests.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Dropdown */}
            <div>
              <Dropdown
                label={"Expense Category *"}
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(val) => setCategory(val)}
                placeholder="Select Category"
                className="mt-2"
              />
            </div>

            {/* Requested By (Authenticated Driver, Read-Only) */}
            <div>
              <CustomTextbox
                label={"Requested By"}
                value={requestedByName}
                readOnly
                className="mt-2 bg-slate-100 text-slate-700 cursor-not-allowed font-medium"
              />
            </div>

            {/* Custom Category input if Others */}
            {category === "Others" && (
              <div className="md:col-span-2 animate-in fade-in duration-200">
                <CustomTextbox
                  label={"Specify Custom Category *"}
                  placeholder="e.g., Delivery Toll Fee Adjustment"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
            )}

            {/* Cost (Numeric Only, > 0, max 2 decimals) */}
            <div>
              <CustomTextbox
                label={"Cost (₱) *"}
                type="text"
                inputMode="decimal"
                value={cost}
                onChange={handleCostChange}
                className="mt-2"
                placeholder="0.00"
                required
              />
            </div>

            {/* Expense Date (Non-future) */}
            <div>
              <CustomTextbox
                label={"Expense Date *"}
                type="date"
                max={todayString}
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-2"
                required
              />
            </div>
          </div>

          {/* Description (RichTextEditor, max 1,000 chars) */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">
                Description <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-xs ${
                  descriptionLength > 1000
                    ? "text-rose-600 font-bold"
                    : "text-slate-400"
                }`}
              >
                {descriptionLength} / 1,000 characters
              </span>
            </div>

            <RichTextEditor
              key={editorKey}
              onChange={(html, text) => {
                setDescription(html);
                setDescriptionLength(text.length);
              }}
              placeholder="Provide detailed context for this delivery or driver expense ..."
              maxLength={1000}
            />
          </div>

          {/* Attachment (PNG, JPG, JPEG, WEBP, max 10MB) */}
          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700">
              Attachment <span className="text-rose-500">*</span>
            </label>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="mt-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-emerald-300"
            >
              {file ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Receipt preview"
                        className="w-12 h-12 rounded object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                    )}
                    <div className="text-left overflow-hidden">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || "Image"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeFile}
                    className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  <div className="flex justify-center mb-2 text-slate-400">
                    <Upload size={32} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Drag and drop receipt image here, or choose an option:
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepted: PNG, JPG, JPEG, WEBP. Maximum file size: 10 MB.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    {/* Option 1: Choose File */}
                    <CustomGreenButton
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      text="Choose File"
                      className="rounded-lg px-4 py-2 text-xs font-semibold"
                    />

                    {/* Option 2: Take Photo */}
                    <button
                      type="button"
                      onClick={handleOpenPhotoCapture}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-gray-50 transition shadow-xs cursor-pointer"
                    >
                      <Camera size={14} className="text-emerald-600" />
                      Take Photo
                    </button>
                  </div>
                </div>
              )}

              {/* Standard File Picker */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept="image/png,image/jpg,image/jpeg,image/webp"
              />

              {/* Native Mobile Camera Fallback Input */}
              <input
                ref={cameraInputRef}
                type="file"
                onChange={handleFallbackCameraCapture}
                className="hidden"
                accept="image/png,image/jpg,image/jpeg,image/webp"
                capture="environment"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6">
            <CustomGreenButton
              type="submit"
              disabled={submitting}
              text={
                submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Submitting...
                  </span>
                ) : (
                  "Submit Reimbursement"
                )
              }
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition cursor-pointer ${
                submitting ? "opacity-75 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </div>
      </form>

      {/* ── Take Photo Camera Modal ────────────────────────────────────────── */}
      {isCameraModalOpen && (
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">Take Photo of Receipt</h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseCameraModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Camera Video Stream */}
              <div className="relative bg-black flex items-center justify-center min-h-[280px] max-h-[360px] overflow-hidden">
                {cameraError ? (
                  <div className="p-6 text-center text-white space-y-3">
                    <AlertCircle size={32} className="mx-auto text-amber-400" />
                    <p className="text-xs text-slate-200">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
                    >
                      <Camera size={13} /> Open Device Camera Directly
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Capture target frame overlay */}
                    <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-xl pointer-events-none" />
                  </>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Camera Action Buttons */}
              <div className="p-4 bg-white flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  disabled={!!cameraError}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                  title="Switch Front/Rear Camera"
                >
                  <RotateCcw size={14} /> Flip
                </button>

                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={!!cameraError}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] px-4 py-2.5 text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Camera size={16} /> Capture Photo
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Toast Notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
