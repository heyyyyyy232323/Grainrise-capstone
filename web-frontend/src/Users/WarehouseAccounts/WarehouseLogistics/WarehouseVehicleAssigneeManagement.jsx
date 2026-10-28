import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  X,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Truck,
  Building2,
  UserCheck,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Minor-Components/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";

// ─── Status Options & Styles ──────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "all", label: "Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "for maintenance", label: "For Maintenance" },
];

const SORT_OPTIONS = [
  { value: "model_asc", label: "Model A–Z" },
  { value: "model_desc", label: "Model Z–A" },
  { value: "plate_asc", label: "Plate Number A–Z" },
  { value: "plate_desc", label: "Plate Number Z–A" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

const ACTION_OPTIONS = [
  { value: "assign_driver", label: "Assign Driver" },
  { value: "inactive", label: "Inactive" },
  { value: "maintenance", label: "Maintenance" },
  { value: "set_active", label: "Set Active" },
];

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
export default function WarehouseVehicleAssigneeManagement() {
  const { toasts, showToast, removeToast } = useToast();
  const { request } = useApi();

  // State: Vehicles & Drivers
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [driversLoading, setDriversLoading] = useState(false);

  // State: Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // State: Modals (View Details & Update Status - NEVER stacked)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // State: Selected Vehicle & Details
  const [selectedVehicleSummary, setSelectedVehicleSummary] = useState(null);
  const [vehicleDetail, setVehicleDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [viewImageError, setViewImageError] = useState(false);

  // State: Update Form
  const [actionType, setActionType] = useState("assign_driver");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const modalBodyRef = useRef(null);

  // ─── Fetch Active Drivers for the Branch ────────────────────────────────────
  const loadDrivers = useCallback(async () => {
    setDriversLoading(true);
    try {
      const res = await request("/warehouse/logistics/drivers/", {
        method: "GET",
      });
      if (res && res.drivers) {
        setDrivers(res.drivers);
      }
    } catch (err) {
      console.error("Failed to load active drivers:", err);
    } finally {
      setDriversLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // ─── Fetch Vehicles List Scoped to Branch ────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request("/warehouse/logistics/vehicles/", { method: "GET" });

      if (res && res.vehicles) {
        setVehicles(res.vehicles);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Load Error",
        message: err?.message || "Failed to load vehicles for your branch.",
      });
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [request, showToast]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // ─── Fetch Vehicle Detail ───────────────────────────────────────────────────
  const fetchDetail = useCallback(
    async (vehicleId) => {
      setDetailLoading(true);
      setDetailError(null);
      setViewImageError(false);
      try {
        const res = await request(`/warehouse/logistics/vehicles/${vehicleId}/`, {
          method: "GET",
        });
        if (res && res.vehicle) {
          setVehicleDetail(res.vehicle);
          return res.vehicle;
        } else {
          throw new Error("Vehicle details not found.");
        }
      } catch (err) {
        const msg = err?.message || "Failed to retrieve vehicle details.";
        setDetailError(msg);
        showToast({
          type: "error",
          title: "Detail Load Error",
          message: msg,
        });
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [request, showToast]
  );

  // ─── View Modal Handlers ────────────────────────────────────────────────────
  const handleOpenViewModal = async (vehicleRow) => {
    setSelectedVehicleSummary(vehicleRow);
    setIsViewModalOpen(true);
    setIsUpdateModalOpen(false);
    setVehicleDetail(null);
    setViewImageError(false);

    await fetchDetail(vehicleRow.vehicle_id || vehicleRow.id);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedVehicleSummary(null);
    setVehicleDetail(null);
    setDetailError(null);
    setViewImageError(false);
  };

  const handleRetryDetail = () => {
    if (selectedVehicleSummary) {
      fetchDetail(selectedVehicleSummary.vehicle_id || selectedVehicleSummary.id);
    }
  };

  // ─── Transition: View Details -> Update Status Modal (NEVER STACK) ──────────
  const handleOpenUpdateModal = () => {
    setIsViewModalOpen(false);

    const currentDriverId =
      vehicleDetail?.assigned_driver?.driver_id ||
      selectedVehicleSummary?.assigned_driver_id ||
      "";

    setActionType("assign_driver");
    setSelectedDriverId(currentDriverId ? String(currentDriverId) : "");
    setReasonText("");
    setActionError("");

    loadDrivers();
    setIsUpdateModalOpen(true);
  };

  // ─── Cancel Update: Returns to View Details ─────────────────────────────────
  const handleCancelUpdate = () => {
    setIsUpdateModalOpen(false);
    setActionError("");
    setReasonText("");
    setIsViewModalOpen(true);
  };

  // ─── Submit Update: Saves then Reloads ──────────────────────────────────────
  const handleSaveUpdate = async (e) => {
    if (e) e.preventDefault();
    setActionError("");

    const targetVehicleId =
      vehicleDetail?.vehicle_id || selectedVehicleSummary?.vehicle_id || selectedVehicleSummary?.id;

    if (!targetVehicleId) {
      setActionError("Vehicle identifier is missing.");
      return;
    }

    if (actionType === "assign_driver") {
      if (!selectedDriverId) {
        setActionError("Please select an active driver from the dropdown.");
        return;
      }
    } else if (actionType === "inactive") {
      if (!reasonText.trim()) {
        setActionError("Please provide a reason for marking the vehicle inactive.");
        return;
      }
    } else if (actionType === "maintenance") {
      if (!reasonText.trim()) {
        setActionError("Please provide a reason for placing the vehicle in maintenance.");
        return;
      }
    }

    setActionLoading(true);
    try {
      const payload = {
        action: actionType,
      };

      if (actionType === "assign_driver") {
        payload.driver_id = parseInt(selectedDriverId, 10);
      } else if (actionType === "inactive" || actionType === "maintenance") {
        payload.reason = reasonText.trim();
      }

      const res = await request(
        `/warehouse/logistics/vehicles/${targetVehicleId}/update-status/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (res && res.success) {
        showToast({
          type: "success",
          title: "Update Successful",
          message: res.message || "Vehicle status updated successfully.",
        });

        setIsUpdateModalOpen(false);
        setSelectedVehicleSummary(null);
        setVehicleDetail(null);

        await loadVehicles();
        await loadDrivers();
      } else {
        throw new Error(res?.message || "Failed to update vehicle.");
      }
    } catch (err) {
      const msg = err?.message || "Failed to update vehicle status.";
      setActionError(msg);
      showToast({
        type: "error",
        title: "Update Conflict or Error",
        message: msg,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Fast In-Memory Filtering & Sorting (<1ms) ───────────────────────────────
  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const stat = statusFilter.trim().toLowerCase();

    let result = vehicles.filter((v) => {
      const matchesSearch =
        q === "" ||
        `${v.model || ""} ${v.plate_number || ""} ${v.type || ""} ${v.assigned_driver || ""}`
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        stat === "all" ||
        String(v.status || "").toLowerCase() === stat;

      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "model_asc":
          return String(a.model || "").localeCompare(String(b.model || ""));
        case "model_desc":
          return String(b.model || "").localeCompare(String(a.model || ""));
        case "plate_asc":
          return String(a.plate_number || "").localeCompare(String(b.plate_number || ""));
        case "plate_desc":
          return String(b.plate_number || "").localeCompare(String(a.plate_number || ""));
        case "oldest":
          return (a.vehicle_id || 0) - (b.vehicle_id || 0);
        case "newest":
        default:
          return (b.vehicle_id || 0) - (a.vehicle_id || 0);
      }
    });

    return result;
  }, [vehicles, search, statusFilter, sortBy]);

  // ─── Table Columns Configuration ────────────────────────────────────────────
  const columns = [
    {
      key: "model",
      label: "Model",
      width: "40%",
      renderCell: (row) => (
        <div>
          <div className="font-bold text-slate-800 text-xs sm:text-sm">{row.model}</div>
          <div className="text-[11px] text-slate-400 font-medium">
            {row.plate_number} • {row.type}
          </div>
        </div>
      ),
    },
    {
      key: "assigned_driver",
      label: "Assigned Driver",
      width: "30%",
      renderCell: (row) => {
        const driverName = row.assigned_driver_name || row.assigned_driver || row.driver_name;
        const isNA = !driverName || driverName === "N/A";
        return (
          <div className="flex items-center gap-1.5">
            {!isNA && <UserCheck size={14} className="text-emerald-600 shrink-0" />}
            <span
              className={`text-xs sm:text-sm font-medium ${
                isNA ? "text-slate-400 italic" : "text-slate-800 font-semibold"
              }`}
            >
              {isNA ? "N/A" : driverName}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      width: "15%",
      renderCell: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
            statusStyleMap[row.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {getStatusLabel(row.status)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "15%",
      headerClassName: "text-center",
      cellClassName: "text-center",
    },
  ];

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const itemsPerPage = 10;
  const totalCount = filteredVehicles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedVehicles = useMemo(() => {
    return filteredVehicles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVehicles, startIndex, itemsPerPage]);

  const tableSections = useMemo(() => [{ rows: paginatedVehicles }], [paginatedVehicles]);

  return (
    <div className="space-y-6">
      {/* ── Global Floating Toasts ─────────────────────────────────────────── */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Logistics", path: "/warehouse-logistics/dashboard" },
            { label: "Vehicle Assignee Management" },
          ]}
        />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Vehicle Assignee Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage vehicle driver assignments, operational statuses, and maintenance reasons for your branch.
        </p>
      </div>

      {/* ── Filter Controls Row ──────────────────────────────────────────────── */}
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
              placeholder="Search model, plate, or driver..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none px-3 py-2 pr-8 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700 cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
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

          {/* Sort By Dropdown */}
          <div className="relative min-w-[160px]">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none px-3 py-2 pr-8 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700 cursor-pointer"
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
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => {
            loadVehicles();
            loadDrivers();
          }}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap h-[38px] shrink-0"
          title="Refresh vehicle list"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Vehicle List Table ───────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        onViewDetails={handleOpenViewModal}
        viewDetailsLabel="View Details"
        emptyStateTitle={loading ? "Loading vehicles..." : "No vehicles found"}
        emptyStateDescription={
          loading
            ? "Fetching delivery vehicles for your branch..."
            : "No vehicles match the selected criteria for your branch. Try adjusting your search term or status filter."
        }
        footerLabel={`Showing ${paginatedVehicles.length} of ${totalCount} vehicle${totalCount === 1 ? "" : "s"}`}
      />

      {/* ── 1. VEHICLE VIEW DETAILS MODAL ────────────────────────────────────── */}
      {isViewModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={(e) => e.stopPropagation()}
          >
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
                  <p className="text-xs text-slate-500 font-medium">Delivery Vehicle Details</p>
                </div>
                {/* Top X button */}
                <button
                  type="button"
                  onClick={handleCloseViewModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close details"
                  title="Close details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                ref={modalBodyRef}
                className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4"
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
                  <div className="space-y-4">
                    {/* Horizontally centered vehicle photo/placeholder */}
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="w-32 h-32 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-xs">
                        {resolvePhotoUrl(vehicleDetail.photo || vehicleDetail.photo_url) &&
                        !viewImageError ? (
                          <img
                            src={resolvePhotoUrl(vehicleDetail.photo || vehicleDetail.photo_url)}
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

                    {/* Vehicle information */}
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

                      {/* Assigned Driver */}
                      <ModalDetailRow label="Assigned Driver">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-right">
                          {vehicleDetail.assigned_driver_name &&
                          vehicleDetail.assigned_driver_name !== "N/A" ? (
                            <>
                              <UserCheck size={14} className="text-emerald-600 shrink-0" />
                              <span>{vehicleDetail.assigned_driver_name}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">N/A</span>
                          )}
                        </div>
                      </ModalDetailRow>

                      {/* Relevant Inactive Reason ONLY when status === 'inactive' */}
                      {vehicleDetail.status === "inactive" && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2 space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Inactive Reason:
                          </span>
                          <p className="text-xs sm:text-sm text-slate-800 break-words font-medium">
                            {vehicleDetail.inactive_reason || "None specified"}
                          </p>
                        </div>
                      )}

                      {/* Relevant Maintenance Reason ONLY when status === 'for maintenance' */}
                      {vehicleDetail.status === "for maintenance" && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 mt-2 space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                            Maintenance Reason:
                          </span>
                          <p className="text-xs sm:text-sm text-amber-900 break-words font-medium">
                            {vehicleDetail.maintenance_reason || "None specified"}
                          </p>
                        </div>
                      )}
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
                                    key={b.warehouse_profile_id ?? idx}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs flex items-start gap-2.5"
                                  >
                                    <Building2
                                      size={15}
                                      className="text-emerald-600 shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-slate-800">
                                        {b.business_name || `Branch #${b.warehouse_profile_id}`}
                                      </div>
                                      <div className="text-[11px] text-slate-500 truncate">
                                        {[b.street_address, b.barangay, b.municipality, b.province]
                                          .filter(Boolean)
                                          .join(", ") ||
                                          b.organization_name ||
                                          "Assigned Facility Branch"}
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
                ) : null}
              </div>

              {/* View Details Footer: Centered green 'Update Status' */}
              <div className="flex items-center justify-center px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenUpdateModal}
                  disabled={detailLoading || Boolean(detailError)}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── 2. SEPARATE UPDATE STATUS MODAL (NO X, NEVER STACKED) ─────────────── */}
      {isUpdateModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Update modal has NO X */}
              <div className="px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Update Vehicle Status
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {vehicleDetail?.plate_number || selectedVehicleSummary?.plate_number || "Vehicle"} •{" "}
                  {vehicleDetail?.model || selectedVehicleSummary?.model || "Model"}
                </p>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveUpdate} className="flex flex-col flex-1 overflow-hidden">
                <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
                  {/* Action Error Banner */}
                  {actionError && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                      <div className="flex-1 font-medium">{actionError}</div>
                    </div>
                  )}

                  {/* Action Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Action <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={actionType}
                        onChange={(e) => {
                          setActionType(e.target.value);
                          setActionError("");
                        }}
                        className="w-full appearance-none px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 cursor-pointer"
                      >
                        {ACTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Conditional: Assign Driver (Driver Dropdown) */}
                  {actionType === "assign_driver" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Assign Driver <span className="text-rose-500">*</span>
                      </label>
                      {driversLoading ? (
                        <div className="flex items-center gap-2 py-3 text-xs text-slate-500 font-medium">
                          <Loader2 size={16} className="animate-spin text-emerald-600" />
                          <span>Loading active drivers...</span>
                        </div>
                      ) : drivers.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-medium">
                          No active drivers are currently registered in your branch.
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={selectedDriverId}
                            onChange={(e) => {
                              setSelectedDriverId(e.target.value);
                              setActionError("");
                            }}
                            className="w-full appearance-none px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 cursor-pointer"
                          >
                            <option value="">-- Select Active Driver --</option>
                            {drivers.map((d) => (
                              <option key={d.driver_id} value={d.driver_id}>
                                {d.full_name || d.name}
                                {d.current_assigned_plate_number
                                  ? ` (Currently on ${d.current_assigned_plate_number})`
                                  : " (Unassigned)"}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Select an active driver from your branch to assign to this vehicle.
                      </p>
                    </div>
                  )}

                  {/* Conditional: Inactive (Reason Textbox) */}
                  {actionType === "inactive" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Reason for Inactive Status <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={reasonText}
                        onChange={(e) => {
                          setReasonText(e.target.value);
                          setActionError("");
                        }}
                        placeholder="State the reason for taking this vehicle out of service..."
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 resize-none"
                      />
                      <p className="text-[11px] text-slate-400">
                        This reason will be stored and displayed when viewing vehicle details.
                      </p>
                    </div>
                  )}

                  {/* Conditional: Maintenance (Reason Textbox, persist status='for maintenance') */}
                  {actionType === "maintenance" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Reason for Maintenance <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={reasonText}
                        onChange={(e) => {
                          setReasonText(e.target.value);
                          setActionError("");
                        }}
                        placeholder="State the required maintenance or service details..."
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 resize-none"
                      />
                      <p className="text-[11px] text-slate-400">
                        The vehicle status will be set to &quot;For Maintenance&quot; until set active.
                      </p>
                    </div>
                  )}

                  {/* Conditional: Set Active (No extra field) */}
                  {actionType === "set_active" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 font-medium">
                      Setting this vehicle to <strong>Active</strong> will mark it as fully operational and ready for delivery tasks. Any previous maintenance or inactive reasons will be cleared.
                    </div>
                  )}
                </div>

                {/* Update Modal Footer: Cancel returns to View Details; Update saves then reloads */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelUpdate}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-200/70 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
