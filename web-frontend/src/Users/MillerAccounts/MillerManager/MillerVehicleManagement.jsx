import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  X,
  Check,
  Edit3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Truck,
  UploadCloud,
  Building2,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Minor-Components/Toast";
import useToast from "../../../Components/hooks/useToast";
import useMillerVehicleManagement from "../../../Components/hooks/Miller/useMillerVehicleManagement";

// ─── Status Options & Styles ──────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "all", label: "Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "for maintenance", label: "For Maintenance" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Truck", label: "Truck" },
  { value: "Car", label: "Car" },
  { value: "Motor", label: "Motor" },
];

const WHEEL_OPTIONS = [
  { value: "all", label: "All Wheels" },
  { value: "2", label: "2 Wheels" },
  { value: "3", label: "3 Wheels" },
  { value: "4", label: "4 Wheels" },
  { value: "6", label: "6 Wheels" },
  { value: "8", label: "8 Wheels" },
  { value: "10", label: "10 Wheels" },
  { value: "12", label: "12 Wheels" },
];

const SORT_OPTIONS = [
  { value: "plate_asc", label: "Plate Number A–Z" },
  { value: "plate_desc", label: "Plate Number Z–A" },
];

const MOTOR_WHEEL_OPTIONS = [2, 3, 4, 6, 8];
const CAR_TRUCK_WHEEL_OPTIONS = [6, 8, 10, 12];

const getWheelsForType = (type) => {
  return String(type || "").toLowerCase() === "motor"
    ? MOTOR_WHEEL_OPTIONS
    : CAR_TRUCK_WHEEL_OPTIONS;
};

const statusStyleMap = {
  active: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  inactive: "bg-slate-100 text-slate-700 border border-slate-200",
  "for maintenance": "bg-amber-100 text-amber-700 border border-amber-200",
};

const getStatusLabel = (status) => {
  if (!status) return "";
  const key = String(status).toLowerCase();
  if (key === "for maintenance") return "For Maintenance";
  return key.charAt(0).toUpperCase() + key.slice(1);
};

// ─── Photo URL Resolver ───────────────────────────────────────────────────────
const resolvePhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  const path = String(photoPath).trim();
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("//") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  let clean = path.replace(/^\/+/, "");
  while (clean.startsWith("media/")) {
    clean = clean.slice(6);
  }
  const backendBase = (
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
  return `${backendBase}/media/${clean}`;
};

// ─── Format Capacity for Display ──────────────────────────────────────────────
const formatCapacityDisplay = (val) => {
  if (!val) return "—";
  const clean = String(val).replace(/[^0-9.]/g, "");
  if (!clean) return String(val);
  const num = parseFloat(clean);
  if (isNaN(num)) return String(val);
  return `${num.toLocaleString()} kg`;
};

// ─── Modal Detail Row Sub-Component ───────────────────────────────────────────
function ModalDetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0 pt-0.5">{label}:</span>
      {children ? (
        <div className="text-right flex-1 flex justify-end">{children}</div>
      ) : isBadge ? (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badgeStyle}`}
        >
          {value}
        </span>
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words max-w-[65%]">
          {value || "—"}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MillerVehicleManagement() {
  const { toasts, showToast, removeToast } = useToast();

  const {
    fetchVehicles,
    fetchBranches,
    fetchVehicleDetail,
    createVehicle,
    updateVehicle,
    checkPlateNumber,
    loading,
    detailLoading,
    actionLoading,
    detailError,
  } = useMillerVehicleManagement();

  // State
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("plate_asc");
  const [typeFilter, setTypeFilter] = useState("all");
  const [wheelsFilter, setWheelsFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // View / Edit Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedVehicleSummary, setSelectedVehicleSummary] = useState(null);
  const [vehicleDetail, setVehicleDetail] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewImageError, setViewImageError] = useState(false);
  const modalBodyRef = useRef(null);

  // Plate Inline Validation Errors
  const [addPlateError, setAddPlateError] = useState("");
  const [editPlateError, setEditPlateError] = useState("");

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    plate_number: "",
    type: "Truck",
    model: "",
    number_of_wheels: "6",
    capacity: "",
    status: "active",
    branch_ids: [],
    photo_file: null,
    photo_preview: null,
    remove_photo: false,
  });

  // Add Vehicle Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    plate_number: "",
    type: "Truck",
    model: "",
    number_of_wheels: "6",
    capacity: "",
    status: "active",
    branch_ids: [],
    photo_file: null,
    photo_preview: null,
  });

  // Clear Confirmation States
  const [showAddClearConfirm, setShowAddClearConfirm] = useState(false);
  const [showEditClearConfirm, setShowEditClearConfirm] = useState(false);

  // Photo Input Refs
  const addPhotoInputRef = useRef(null);
  const editPhotoInputRef = useRef(null);

  // ─── Load Branches ──────────────────────────────────────────────────────────
  const loadBranches = useCallback(async () => {
    try {
      const data = await fetchBranches();
      setBranches(data);
    } catch (err) {
      showToast({
        type: "error",
        title: "Load Error",
        message: err.message || "Failed to load branches.",
      });
    }
  }, [fetchBranches, showToast]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // ─── Load Vehicles ──────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    try {
      const data = await fetchVehicles({
        search,
        sortBy,
        type: typeFilter,
        wheels: wheelsFilter,
      });
      setVehicles(data);
    } catch (err) {
      showToast({
        type: "error",
        title: "Load Error",
        message: err?.message || "Failed to load delivery vehicles.",
      });
    }
  }, [fetchVehicles, search, sortBy, typeFilter, wheelsFilter, showToast]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // ─── View Modal Actions ─────────────────────────────────────────────────────
  const handleOpenViewModal = async (vehicleRow) => {
    setSelectedVehicleSummary(vehicleRow);
    setIsViewModalOpen(true);
    setIsEditMode(false);
    setShowEditClearConfirm(false);
    setEditPlateError("");
    setViewImageError(false);
    setVehicleDetail(null);

    try {
      const detail = await fetchVehicleDetail(vehicleRow.id || vehicleRow.vehicle_id);
      setVehicleDetail(detail);
      setViewImageError(false);
      const rawCap = String(detail.capacity || "").replace(/[^0-9.]/g, "");
      const rawBranchIds = (
        detail.branch_ids ||
        (Array.isArray(detail.branches)
          ? detail.branches.map((b) => b.supplier_profile_id)
          : [])
      ).map(Number);
      setEditFormData({
        plate_number: detail.plate_number || "",
        type: detail.type || "Truck",
        model: detail.model || "",
        number_of_wheels: String(detail.number_of_wheels || "6"),
        capacity: rawCap,
        status: detail.status || "active",
        branch_ids: rawBranchIds,
        photo_file: null,
        photo_preview: resolvePhotoUrl(detail.photo || detail.photo_url),
        remove_photo: false,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Detail Load Error",
        message: err?.message || "Failed to load vehicle details.",
      });
    }
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedVehicleSummary(null);
    setVehicleDetail(null);
    setIsEditMode(false);
    setShowEditClearConfirm(false);
    setEditPlateError("");
    setViewImageError(false);
  };

  const handleRetryDetail = async () => {
    if (!selectedVehicleSummary) return;
    setViewImageError(false);
    setEditPlateError("");
    try {
      const detail = await fetchVehicleDetail(
        selectedVehicleSummary.id || selectedVehicleSummary.vehicle_id
      );
      setVehicleDetail(detail);
      setViewImageError(false);
      const rawCap = String(detail.capacity || "").replace(/[^0-9.]/g, "");
      const rawBranchIds = (
        detail.branch_ids ||
        (Array.isArray(detail.branches)
          ? detail.branches.map((b) => b.supplier_profile_id)
          : [])
      ).map(Number);
      setEditFormData({
        plate_number: detail.plate_number || "",
        type: detail.type || "Truck",
        model: detail.model || "",
        number_of_wheels: String(detail.number_of_wheels || "6"),
        capacity: rawCap,
        status: detail.status || "active",
        branch_ids: rawBranchIds,
        photo_file: null,
        photo_preview: resolvePhotoUrl(detail.photo || detail.photo_url),
        remove_photo: false,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Retry Failed",
        message: err?.message || "Failed to retrieve vehicle details.",
      });
    }
  };

  const handleStartEdit = () => {
    setIsEditMode(true);
    setShowEditClearConfirm(false);
    setEditPlateError("");
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ─── Cancel Edit: Discards changes and returns to View Details ──────────────
  const handleCancelEdit = () => {
    if (vehicleDetail) {
      const rawCap = String(vehicleDetail.capacity || "").replace(/[^0-9.]/g, "");
      const rawBranchIds = (
        vehicleDetail.branch_ids ||
        (Array.isArray(vehicleDetail.branches)
          ? vehicleDetail.branches.map((b) => b.supplier_profile_id)
          : [])
      ).map(Number);
      setEditFormData({
        plate_number: vehicleDetail.plate_number || "",
        type: vehicleDetail.type || "Truck",
        model: vehicleDetail.model || "",
        number_of_wheels: String(vehicleDetail.number_of_wheels || "6"),
        capacity: rawCap,
        status: vehicleDetail.status || "active",
        branch_ids: rawBranchIds,
        photo_file: null,
        photo_preview: resolvePhotoUrl(vehicleDetail.photo || vehicleDetail.photo_url),
        remove_photo: false,
      });
    }
    setShowEditClearConfirm(false);
    setEditPlateError("");
    setIsEditMode(false);
  };

  // ─── Clear Edit: Restores original saved values (never saves or closes) ──────
  const handleConfirmClearEdit = () => {
    if (vehicleDetail) {
      const rawCap = String(vehicleDetail.capacity || "").replace(/[^0-9.]/g, "");
      const rawBranchIds = (
        vehicleDetail.branch_ids ||
        (Array.isArray(vehicleDetail.branches)
          ? vehicleDetail.branches.map((b) => b.supplier_profile_id)
          : [])
      ).map(Number);
      setEditFormData({
        plate_number: vehicleDetail.plate_number || "",
        type: vehicleDetail.type || "Truck",
        model: vehicleDetail.model || "",
        number_of_wheels: String(vehicleDetail.number_of_wheels || "6"),
        capacity: rawCap,
        status: vehicleDetail.status || "active",
        branch_ids: rawBranchIds,
        photo_file: null,
        photo_preview: resolvePhotoUrl(vehicleDetail.photo || vehicleDetail.photo_url),
        remove_photo: false,
      });
      if (editPhotoInputRef.current) {
        editPhotoInputRef.current.value = "";
      }
    }
    setEditPlateError("");
    setShowEditClearConfirm(false);
  };

  // ─── Type Change Handler for Edit Mode (Resets wheels if invalid) ───────────
  const handleEditTypeChange = (newType) => {
    const allowed = getWheelsForType(newType);
    setEditFormData((prev) => {
      const currentWheel = parseInt(prev.number_of_wheels, 10);
      const isValid = allowed.includes(currentWheel);
      return {
        ...prev,
        type: newType,
        number_of_wheels: isValid ? prev.number_of_wheels : String(allowed[0]),
      };
    });
  };

  // ─── Edit Branch Checkbox Toggle ────────────────────────────────────────────
  const handleToggleEditBranch = (branchId) => {
    const numId = Number(branchId);
    setEditFormData((prev) => {
      const current = (prev.branch_ids || []).map(Number);
      const exists = current.includes(numId);
      const updated = exists
        ? current.filter((id) => id !== numId)
        : [...current, numId];
      return { ...prev, branch_ids: updated };
    });
  };

  const handleSelectAllEditBranches = () => {
    if ((editFormData.branch_ids || []).length === branches.length) {
      setEditFormData((prev) => ({ ...prev, branch_ids: [] }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        branch_ids: branches.map((b) => Number(b.supplier_profile_id)),
      }));
    }
  };

  // ─── Edit Mode Plate Blur Uniqueness Pre-check ──────────────────────────────
  const handleEditPlateBlur = async () => {
    const cleanPlate = editFormData.plate_number.trim().toUpperCase();
    if (
      !cleanPlate ||
      (vehicleDetail && cleanPlate === (vehicleDetail.plate_number || "").trim().toUpperCase())
    ) {
      return;
    }
    try {
      const res = await checkPlateNumber(cleanPlate, vehicleDetail?.vehicle_id);
      if (res && res.is_unique === false) {
        setEditPlateError("A vehicle with this plate number already exists.");
      }
    } catch {
      // Ignore network errors on blur
    }
  };

  // ─── Save Edit Changes ──────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    const cleanPlate = editFormData.plate_number.trim().toUpperCase();
    const cleanModel = editFormData.model.trim();
    const cleanCapacity = editFormData.capacity.trim();
    const wheels = parseInt(editFormData.number_of_wheels, 10);

    if (!cleanPlate) {
      setEditPlateError("Plate number is required.");
      return;
    }
    if (editPlateError) {
      return;
    }
    if (!cleanModel) {
      showToast({ type: "warning", title: "Validation Error", message: "Vehicle model is required." });
      return;
    }
    if (!wheels || wheels <= 0) {
      showToast({ type: "warning", title: "Validation Error", message: "Valid number of wheels is required." });
      return;
    }
    const capNum = parseFloat(cleanCapacity);
    if (!cleanCapacity || isNaN(capNum) || capNum <= 0) {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Capacity must be a positive numeric value in kg.",
      });
      return;
    }
    if (editFormData.branch_ids.length === 0) {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Please designate at least one branch for this vehicle.",
      });
      return;
    }

    // Pre-check duplicate plate before saving if plate changed
    if (cleanPlate !== (vehicleDetail?.plate_number || "").trim().toUpperCase()) {
      try {
        const plateCheck = await checkPlateNumber(cleanPlate, vehicleDetail?.vehicle_id);
        if (plateCheck && plateCheck.is_unique === false) {
          setEditPlateError("A vehicle with this plate number already exists.");
          return;
        }
      } catch {
        // Proceed to server call
      }
    }

    try {
      const payload = new FormData();
      payload.append("plate_number", cleanPlate);
      payload.append("type", editFormData.type);
      payload.append("model", cleanModel);
      payload.append("number_of_wheels", wheels);
      payload.append("capacity", `${cleanCapacity} kg`);
      payload.append("status", editFormData.status);

      const branchIdsToSave = (editFormData.branch_ids || []).map(Number);
      branchIdsToSave.forEach((id) => {
        payload.append("branch_ids", id);
        payload.append("branch_ids[]", id);
      });
      payload.append("branch_ids_json", JSON.stringify(branchIdsToSave));

      if (editFormData.photo_file) {
        payload.append("photo", editFormData.photo_file);
      }
      if (editFormData.remove_photo) {
        payload.append("remove_photo", "true");
      }

      const updated = await updateVehicle(vehicleDetail.vehicle_id, payload);
      setVehicleDetail(updated);
      setViewImageError(false);
      setIsEditMode(false);
      showToast({
        type: "success",
        title: "Vehicle Updated",
        message: `Vehicle ${updated.plate_number} details saved successfully.`,
      });
      loadVehicles();
    } catch (err) {
      const isDuplicate =
        err?.data?.error_code === "DUPLICATE_PLATE" ||
        (err?.message && err.message.toLowerCase().includes("already exists"));
      if (isDuplicate) {
        setEditPlateError(err?.message || "A vehicle with this plate number already exists.");
        return;
      }
      showToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update vehicle details.",
      });
    }
  };

  // ─── Add Vehicle Modal Handlers ─────────────────────────────────────────────
  const handleOpenAddModal = () => {
    const initialBranches = branches.length === 1 ? [Number(branches[0].supplier_profile_id)] : [];
    setAddFormData({
      plate_number: "",
      type: "Truck",
      model: "",
      number_of_wheels: "6",
      capacity: "",
      status: "active",
      branch_ids: initialBranches,
      photo_file: null,
      photo_preview: null,
    });
    setAddPlateError("");
    setShowAddClearConfirm(false);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddPlateError("");
    setShowAddClearConfirm(false);
  };

  // ─── Clear Add: Resets to defaults (never saves or closes) ───────────────────
  const handleConfirmClearAdd = () => {
    setAddFormData({
      plate_number: "",
      type: "Truck",
      model: "",
      number_of_wheels: "6",
      capacity: "",
      status: "active",
      branch_ids: branches.length === 1 ? [Number(branches[0].supplier_profile_id)] : [],
      photo_file: null,
      photo_preview: null,
    });
    if (addPhotoInputRef.current) {
      addPhotoInputRef.current.value = "";
    }
    setAddPlateError("");
    setShowAddClearConfirm(false);
  };

  // ─── Type Change Handler for Add Mode (Resets wheels if invalid) ────────────
  const handleAddTypeChange = (newType) => {
    const allowed = getWheelsForType(newType);
    setAddFormData((prev) => {
      const currentWheel = parseInt(prev.number_of_wheels, 10);
      const isValid = allowed.includes(currentWheel);
      return {
        ...prev,
        type: newType,
        number_of_wheels: isValid ? prev.number_of_wheels : String(allowed[0]),
      };
    });
  };

  const handleToggleAddBranch = (branchId) => {
    const numId = Number(branchId);
    setAddFormData((prev) => {
      const current = (prev.branch_ids || []).map(Number);
      const exists = current.includes(numId);
      const updated = exists
        ? current.filter((id) => id !== numId)
        : [...current, numId];
      return { ...prev, branch_ids: updated };
    });
  };

  const handleSelectAllAddBranches = () => {
    if (addFormData.branch_ids.length === branches.length) {
      setAddFormData((prev) => ({ ...prev, branch_ids: [] }));
    } else {
      setAddFormData((prev) => ({
        ...prev,
        branch_ids: branches.map((b) => Number(b.supplier_profile_id)),
      }));
    }
  };

  const handleAddPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setAddFormData((prev) => ({
        ...prev,
        photo_file: file,
        photo_preview: preview,
      }));
    }
  };

  const handleRemoveAddPhoto = () => {
    setAddFormData((prev) => ({
      ...prev,
      photo_file: null,
      photo_preview: null,
    }));
    if (addPhotoInputRef.current) {
      addPhotoInputRef.current.value = "";
    }
  };

  const handleEditPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setEditFormData((prev) => ({
        ...prev,
        photo_file: file,
        photo_preview: preview,
        remove_photo: false,
      }));
    }
  };

  const handleRemoveEditPhoto = () => {
    setEditFormData((prev) => ({
      ...prev,
      photo_file: null,
      photo_preview: null,
      remove_photo: true,
    }));
    if (editPhotoInputRef.current) {
      editPhotoInputRef.current.value = "";
    }
  };

  // ─── Add Mode Plate Blur Uniqueness Pre-check ───────────────────────────────
  const handleAddPlateBlur = async () => {
    const cleanPlate = addFormData.plate_number.trim().toUpperCase();
    if (!cleanPlate) return;
    try {
      const res = await checkPlateNumber(cleanPlate);
      if (res && res.is_unique === false) {
        setAddPlateError("A vehicle with this plate number already exists.");
      }
    } catch {
      // Ignore network errors on blur
    }
  };

  const handleSaveAddVehicle = async () => {
    const cleanPlate = addFormData.plate_number.trim().toUpperCase();
    const cleanModel = addFormData.model.trim();
    const cleanCapacity = addFormData.capacity.trim();
    const wheels = parseInt(addFormData.number_of_wheels, 10);

    if (!cleanPlate) {
      setAddPlateError("Plate number is required.");
      return;
    }
    if (addPlateError) {
      return;
    }
    if (!cleanModel) {
      showToast({ type: "warning", title: "Validation Error", message: "Vehicle model is required." });
      return;
    }
    if (!wheels || wheels <= 0) {
      showToast({ type: "warning", title: "Validation Error", message: "Valid number of wheels is required." });
      return;
    }
    const capNum = parseFloat(cleanCapacity);
    if (!cleanCapacity || isNaN(capNum) || capNum <= 0) {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Capacity must be a positive numeric value in kg.",
      });
      return;
    }
    if (addFormData.branch_ids.length === 0) {
      showToast({
        type: "warning",
        title: "Validation Error",
        message: "Please designate at least one branch for this vehicle.",
      });
      return;
    }

    // Pre-check duplicate plate before saving
    try {
      const plateCheck = await checkPlateNumber(cleanPlate);
      if (plateCheck && plateCheck.is_unique === false) {
        setAddPlateError("A vehicle with this plate number already exists.");
        return;
      }
    } catch {
      // Proceed to server call
    }

    try {
      const payload = new FormData();
      payload.append("plate_number", cleanPlate);
      payload.append("type", addFormData.type);
      payload.append("model", cleanModel);
      payload.append("number_of_wheels", wheels);
      payload.append("capacity", `${cleanCapacity} kg`);

      const branchIdsToSave = (addFormData.branch_ids || []).map(Number);
      branchIdsToSave.forEach((id) => {
        payload.append("branch_ids", id);
        payload.append("branch_ids[]", id);
      });
      payload.append("branch_ids_json", JSON.stringify(branchIdsToSave));

      if (addFormData.photo_file) {
        payload.append("photo", addFormData.photo_file);
      }

      const created = await createVehicle(payload);
      setIsAddModalOpen(false);
      showToast({
        type: "success",
        title: "Vehicle Added",
        message: `Vehicle ${created.plate_number} has been registered successfully.`,
      });
      loadVehicles();
    } catch (err) {
      const isDuplicate =
        err?.data?.error_code === "DUPLICATE_PLATE" ||
        (err?.message && err.message.toLowerCase().includes("already exists"));
      if (isDuplicate) {
        setAddPlateError(err?.message || "A vehicle with this plate number already exists.");
        return;
      }
      showToast({
        type: "error",
        title: "Creation Failed",
        message: err.message || "Failed to add vehicle.",
      });
    }
  };

  // ─── Table Columns Configuration (Matches Fulfillment History typography) ───
  const columns = [
    {
      key: "model",
      label: "Model",
      width: "50%",
    },
    {
      key: "capacity",
      label: "Capacity",
      width: "30%",
      renderCell: (row) => (
        <span>{formatCapacityDisplay(row.capacity)}</span>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "20%",
      headerClassName: "text-center",
      cellClassName: "text-center",
    },
  ];

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const itemsPerPage = 10;
  const totalCount = vehicles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVehicles = vehicles.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginatedVehicles }], [paginatedVehicles]);

  return (
    <div className="space-y-6">
      {/* ── Global Floating Toasts ─────────────────────────────────────────── */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Vehicle Management" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Vehicle Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage delivery vehicles, models, capacities, and designated branches.
        </p>
      </div>

      {/* ── Filter Controls Row (Add Vehicle button horizontally aligned, far right) ── */}
      <div className="flex flex-col md:flex-row gap-3 mb-2 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search plate, model, capacity..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Sorting Dropdown: Plate Number A-Z / Z-A */}
          <div className="relative w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Number of Wheels Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={wheelsFilter}
              onChange={(e) => {
                setWheelsFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {WHEEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Type Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Add Vehicle Button: Horizontally aligned, far right */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap h-[38px] shrink-0"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* ── Vehicle List Table ───────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        onViewDetails={handleOpenViewModal}
        viewDetailsLabel="View Details"
        emptyStateTitle="No vehicles found"
        emptyStateDescription="No vehicles match the selected criteria. Try adjusting your search or filters, or add a new delivery vehicle."
        footerLabel={`Showing ${paginatedVehicles.length} of ${totalCount} vehicle${totalCount === 1 ? "" : "s"}`}
      />

      {/* ── VIEW / EDIT DETAILS MODAL ────────────────────────────────────────── */}
      {isViewModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            {showEditClearConfirm ? (
              /* Clear Form Confirmation (Supplier Management style) */
              <div
                className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Clear Form</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Are you sure you want to clear all fields?
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowEditClearConfirm(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClearEdit}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer"
                  >
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      {vehicleDetail?.plate_number || selectedVehicleSummary?.plate_number || "Vehicle Details"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {isEditMode ? "Edit Vehicle Information" : "Delivery Vehicle Details"}
                    </p>
                  </div>

                  {/* Upper-right X: Removed when in edit mode; retained in View Details mode */}
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={handleCloseViewModal}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      aria-label="Close details"
                      title="Close details"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Modal Body */}
                <div
                  ref={modalBodyRef}
                  className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4"
                >
                  {detailLoading && !vehicleDetail ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                      <p className="text-sm font-medium text-slate-600">Loading vehicle details...</p>
                    </div>
                  ) : detailError ? (
                    <div className="py-6">
                      <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        <AlertCircle size={20} className="shrink-0 text-rose-500" />
                        <div className="flex-1">
                          <p className="font-semibold">Failed to load vehicle details</p>
                          <p className="text-xs text-rose-600">{detailError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRetryDetail}
                          className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition cursor-pointer"
                        >
                          <RefreshCw size={13} /> Retry
                        </button>
                      </div>
                    </div>
                  ) : vehicleDetail ? (
                    <>
                      {/* ── EDIT MODE FORM ───────────────────────────────────────── */}
                      {isEditMode ? (
                        <div className="space-y-4">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                            Edit Vehicle Information
                          </div>

                          {/* Plate Number */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Plate Number *:
                            </label>
                            <input
                              type="text"
                              value={editFormData.plate_number}
                              onChange={(e) => {
                                setEditPlateError("");
                                setEditFormData((prev) => ({
                                  ...prev,
                                  plate_number: e.target.value.toUpperCase(),
                                }));
                              }}
                              onBlur={handleEditPlateBlur}
                              placeholder="e.g. ABC 1234"
                              className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:outline-none bg-white font-semibold text-slate-900 ${
                                editPlateError
                                  ? "border-rose-400 focus:ring-1 focus:ring-rose-500"
                                  : "border-slate-200 focus:ring-1 focus:ring-emerald-500"
                              }`}
                            />
                            {editPlateError && (
                              <p className="text-[11px] text-rose-600 mt-1 font-medium">
                                {editPlateError}
                              </p>
                            )}
                          </div>

                          {/* Type & Wheels in 2 columns */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Vehicle Type *:
                              </label>
                              <select
                                value={editFormData.type}
                                onChange={(e) => handleEditTypeChange(e.target.value)}
                                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800"
                              >
                                <option value="Truck">Truck</option>
                                <option value="Car">Car</option>
                                <option value="Motor">Motor</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Number of Wheels *:
                              </label>
                              <select
                                value={editFormData.number_of_wheels}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    number_of_wheels: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800"
                              >
                                {getWheelsForType(editFormData.type).map((w) => (
                                  <option key={w} value={w}>
                                    {w} Wheels
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Model */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Model *:
                            </label>
                            <input
                              type="text"
                              value={editFormData.model}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  model: e.target.value,
                                }))
                              }
                              placeholder="e.g. Isuzu Forward 6-Wheeler"
                              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-900"
                            />
                          </div>

                          {/* Capacity & Status */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Capacity *:
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={editFormData.capacity}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    setEditFormData((prev) => ({
                                      ...prev,
                                      capacity: val,
                                    }));
                                  }}
                                  placeholder="e.g. 5000"
                                  className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-900"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                                  kg
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Status *:
                              </label>
                              <select
                                value={editFormData.status}
                                onChange={(e) =>
                                  setEditFormData((prev) => ({
                                    ...prev,
                                    status: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="for maintenance">For Maintenance</option>
                              </select>
                            </div>
                          </div>

                          {/* Designated Branches (Multiple Checkboxes) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-slate-700">
                                Designated Branches (Select multiple) *:
                              </label>
                              {branches.length > 1 && (
                                <button
                                  type="button"
                                  onClick={handleSelectAllEditBranches}
                                  className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                                >
                                  {(editFormData.branch_ids || []).length === branches.length
                                    ? "Deselect All"
                                    : "Select All"}
                                </button>
                              )}
                            </div>
                            <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 bg-slate-50/50">
                              {branches.map((b) => {
                                const isChecked = (editFormData.branch_ids || [])
                                  .map(Number)
                                  .includes(Number(b.supplier_profile_id));
                                return (
                                  <label
                                    key={b.supplier_profile_id}
                                    className="flex items-start gap-2.5 cursor-pointer hover:bg-slate-100/60 p-1.5 rounded-lg transition"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleEditBranch(b.supplier_profile_id)}
                                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <div className="text-xs">
                                      <div className="font-semibold text-slate-800">
                                        {b.business_name}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        {[b.street_address, b.barangay, b.municipality, b.province]
                                          .filter(Boolean)
                                          .join(", ")}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Photo Upload & Preview */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">
                              Vehicle Photo (Optional):
                            </label>
                            <input
                              ref={editPhotoInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleEditPhotoChange}
                              className="hidden"
                            />
                            {editFormData.photo_preview ? (
                              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <img
                                  src={editFormData.photo_preview}
                                  alt="Vehicle preview"
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                                />
                                <div className="flex-1 space-y-1">
                                  <p className="text-xs font-semibold text-slate-700">Photo Attached</p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => editPhotoInputRef.current?.click()}
                                      className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                                    >
                                      Change Photo
                                    </button>
                                    <span className="text-slate-300">•</span>
                                    <button
                                      type="button"
                                      onClick={handleRemoveEditPhoto}
                                      className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => editPhotoInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <UploadCloud size={24} className="text-slate-400" />
                                <span className="text-xs font-semibold text-slate-700">
                                  Click to upload vehicle photo
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  JPG, PNG, WEBP up to 10MB
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* ── VIEW MODE DETAILS ───────────────────────────────────── */
                        <div className="space-y-4">
                          {/* Horizontally centered vehicle photo/placeholder */}
                          <div className="flex flex-col items-center justify-center py-2">
                            <div className="w-32 h-32 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-xs">
                              {resolvePhotoUrl(vehicleDetail.photo || vehicleDetail.photo_url) &&
                              !viewImageError ? (
                                <img
                                  src={resolvePhotoUrl(
                                    vehicleDetail.photo || vehicleDetail.photo_url
                                  )}
                                  alt={vehicleDetail.plate_number || "Vehicle"}
                                  className="h-full w-full object-cover"
                                  onError={() => setViewImageError(true)}
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-300">
                                  <Truck size={36} />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">
                                    No Photo
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <ModalDetailRow label="Plate Number" value={vehicleDetail.plate_number} />
                            <ModalDetailRow label="Type" value={vehicleDetail.type} />
                            <ModalDetailRow label="Model" value={vehicleDetail.model} />
                            <ModalDetailRow
                              label="Number of Wheels"
                              value={`${vehicleDetail.number_of_wheels} Wheels`}
                            />
                            <ModalDetailRow
                              label="Capacity"
                              value={formatCapacityDisplay(vehicleDetail.capacity)}
                            />
                            <ModalDetailRow
                              label="Status"
                              value={getStatusLabel(vehicleDetail.status)}
                              isBadge={true}
                              badgeStyle={
                                statusStyleMap[vehicleDetail.status] || "bg-gray-100 text-gray-700"
                              }
                            />
                          </div>

                          {/* Divider */}
                          <div className="border-t border-slate-100 pt-2" />

                          {/* Designated Branches */}
                          <div>
                            {(() => {
                              const activeBranches =
                                Array.isArray(vehicleDetail.branches) && vehicleDetail.branches.length > 0
                                  ? vehicleDetail.branches
                                  : Array.isArray(selectedVehicleSummary?.branches) &&
                                    selectedVehicleSummary.branches.length > 0
                                  ? selectedVehicleSummary.branches
                                  : [];
                              return (
                                <>
                                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                                    Designated Branches ({activeBranches.length})
                                  </div>
                                  {activeBranches.length > 0 ? (
                                    <div className="space-y-2">
                                      {activeBranches.map((b, idx) => (
                                        <div
                                          key={b.supplier_profile_id ?? idx}
                                          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs flex items-start gap-2.5"
                                        >
                                          <Building2
                                            size={15}
                                            className="text-emerald-600 shrink-0 mt-0.5"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800">
                                              {b.business_name || `Branch #${b.supplier_profile_id}`}
                                            </div>
                                            <div className="text-[11px] text-slate-500 truncate">
                                              {[b.street_address, b.barangay, b.municipality, b.province]
                                                .filter(Boolean)
                                                .join(", ") || b.organization_name || "Assigned Facility Branch"}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">No designated branches.</p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100">
                        {isEditMode ? (
                          /* Edit Footer: Cancel (left), Clear (gray, beside Save), Save (green, right) */
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={actionLoading}
                              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            >
                              Cancel
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowEditClearConfirm(true)}
                                disabled={actionLoading}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={actionLoading || Boolean(editPlateError)}
                                className="px-4 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {actionLoading ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={handleStartEdit}
                              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 size={14} /> Edit Information
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* ── ADD VEHICLE MODAL ────────────────────────────────────────────────── */}
      {isAddModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            {showAddClearConfirm ? (
              /* Clear Form Confirmation (Supplier Management style) */
              <div
                className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Clear Form</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Are you sure you want to clear all fields?
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddClearConfirm(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClearAdd}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer"
                  >
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Add New Vehicle
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Register a new delivery vehicle for your branches.
                    </p>
                  </div>

                  {/* X Button: Upper-right X only; no bottom Close button */}
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    aria-label="Close add vehicle modal"
                    title="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4">
                  {/* Plate Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Plate Number *:
                    </label>
                    <input
                      type="text"
                      value={addFormData.plate_number}
                      onChange={(e) => {
                        setAddPlateError("");
                        setAddFormData((prev) => ({
                          ...prev,
                          plate_number: e.target.value.toUpperCase(),
                        }));
                      }}
                      onBlur={handleAddPlateBlur}
                      placeholder="e.g. ABC 1234"
                      className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:outline-none bg-white font-semibold text-slate-900 ${
                        addPlateError
                          ? "border-rose-400 focus:ring-1 focus:ring-rose-500"
                          : "border-slate-200 focus:ring-1 focus:ring-emerald-500"
                      }`}
                    />
                    {addPlateError && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">
                        {addPlateError}
                      </p>
                    )}
                  </div>

                  {/* Type & Wheels in 2 columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Vehicle Type *:
                      </label>
                      <select
                        value={addFormData.type}
                        onChange={(e) => handleAddTypeChange(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800"
                      >
                        <option value="Truck">Truck</option>
                        <option value="Car">Car</option>
                        <option value="Motor">Motor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Number of Wheels *:
                      </label>
                      <select
                        value={addFormData.number_of_wheels}
                        onChange={(e) =>
                          setAddFormData((prev) => ({
                            ...prev,
                            number_of_wheels: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800"
                      >
                        {getWheelsForType(addFormData.type).map((w) => (
                          <option key={w} value={w}>
                            {w} Wheels
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Model *:
                    </label>
                    <input
                      type="text"
                      value={addFormData.model}
                      onChange={(e) =>
                        setAddFormData((prev) => ({
                          ...prev,
                          model: e.target.value,
                        }))
                      }
                      placeholder="e.g. Isuzu Elf 6-Wheeler"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-900"
                    />
                  </div>

                  {/* Capacity & Initial Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Capacity *:
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={addFormData.capacity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setAddFormData((prev) => ({
                              ...prev,
                              capacity: val,
                            }));
                          }}
                          placeholder="e.g. 4500"
                          className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-900"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Initial Status:
                      </label>
                      <div className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 font-bold text-emerald-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Active (Default)
                      </div>
                    </div>
                  </div>

                  {/* Designated Branches (Multiple Checkboxes) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Designated Branches (Select multiple) *:
                      </label>
                      {branches.length > 1 && (
                        <button
                          type="button"
                          onClick={handleSelectAllAddBranches}
                          className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                        >
                          {addFormData.branch_ids.length === branches.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 bg-slate-50/50">
                      {branches.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No branches available.</p>
                      ) : (
                        branches.map((b) => {
                          const isChecked = (addFormData.branch_ids || [])
                            .map(Number)
                            .includes(Number(b.supplier_profile_id));
                          return (
                            <label
                              key={b.supplier_profile_id}
                              className="flex items-start gap-2.5 cursor-pointer hover:bg-slate-100/60 p-1.5 rounded-lg transition"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAddBranch(b.supplier_profile_id)}
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div className="text-xs">
                                <div className="font-semibold text-slate-800">{b.business_name}</div>
                                <div className="text-[11px] text-slate-500">
                                  {[b.street_address, b.barangay, b.municipality, b.province]
                                    .filter(Boolean)
                                    .join(", ")}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Photo Upload & Preview */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Vehicle Photo (Optional):
                    </label>
                    <input
                      ref={addPhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAddPhotoChange}
                      className="hidden"
                    />
                    {addFormData.photo_preview ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <img
                          src={addFormData.photo_preview}
                          alt="Vehicle preview"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-semibold text-slate-700">Photo Attached</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addPhotoInputRef.current?.click()}
                              className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
                            >
                              Change Photo
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={handleRemoveAddPhoto}
                              className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addPhotoInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <UploadCloud size={24} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700">
                          Click to upload vehicle photo
                        </span>
                        <span className="text-[10px] text-slate-400">
                          JPG, PNG, WEBP up to 10MB
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {/* Clear: gray, left */}
                    <button
                      type="button"
                      onClick={() => setShowAddClearConfirm(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                      Clear
                    </button>

                    {/* Save: green, right */}
                    <button
                      type="button"
                      onClick={handleSaveAddVehicle}
                      disabled={actionLoading || Boolean(addPlateError)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Save Vehicle
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
