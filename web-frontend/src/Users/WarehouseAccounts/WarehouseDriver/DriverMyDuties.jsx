import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Warehouse, MapPin, Search, ChevronDown, Loader2 } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import DriverLocationConsentModal from "../../../Components/Modals/MillerDriver/DriverLocationConsentModal";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://127.0.0.1:8000" : "")
).replace(/\/$/, "");

const METHOD_BADGE = {
  "Online Payment": "bg-blue-100 text-blue-700",
  "Cash on Delivery": "bg-amber-100 text-amber-800",
};

const PAYMENT_METHOD_OPTIONS = [
  { label: "Payment Method", value: "" },
  { label: "Online Payment", value: "Online Payment" },
  { label: "Cash on Delivery", value: "Cash on Delivery" },
];

const SORT_OPTIONS = [
  { label: "Sort By", value: "" },
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
];

function CustomDropdown({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption && selectedOption.value !== "" ? selectedOption.label : label;
  const isSelected = value && value !== "" && value !== "all";

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
          isSelected ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
        }`}
      >
        <span>{displayLabel}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                value === opt.value
                  ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function resolveDateLabel(arrivalIso, arrivalFormatted) {
  if (!arrivalIso) return arrivalFormatted || "Assigned Deliveries";
  try {
    const d = new Date(arrivalIso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dMid = new Date(d);
    dMid.setHours(0, 0, 0, 0);

    if (dMid.getTime() === today.getTime()) return "Today";
    if (dMid.getTime() === yesterday.getTime()) return "Yesterday";
    return arrivalFormatted || d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return arrivalFormatted || "Assigned Deliveries";
  }
}

/**
 * Builds table sections honoring:
 * - Date dividers (Today, Yesterday, Specific Date)
 * - Buyer grouping (Multiple Orders for the Same Buyer)
 * - Single Start Tracking button on the group
 */
function buildSectionsWithBuyerGroups(rows) {
  if (!rows || rows.length === 0) return [];

  // 1. Group rows by date bucket
  const dateBuckets = {};
  rows.forEach((r) => {
    const label = resolveDateLabel(r.expected_arrival_date_iso, r.expected_arrival_date);
    if (!dateBuckets[label]) dateBuckets[label] = [];
    dateBuckets[label].push(r);
  });

  const sections = [];

  Object.entries(dateBuckets).forEach(([dateLabel, dateRows]) => {
    // 2. Cluster consecutive orders with the same buyer_group_key
    const clusters = [];
    let currentCluster = [];

    dateRows.forEach((row) => {
      if (currentCluster.length === 0) {
        currentCluster.push(row);
      } else {
        const lastInCluster = currentCluster[currentCluster.length - 1];
        if (lastInCluster.buyer_group_key === row.buyer_group_key) {
          currentCluster.push(row);
        } else {
          clusters.push(currentCluster);
          currentCluster = [row];
        }
      }
    });
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // 3. Convert clusters into sections
    clusters.forEach((cluster, clusterIdx) => {
      const isMultiOrder = cluster.length > 1;

      // Tag items for grouped layout and rowSpan calculation
      const taggedRows = cluster.map((item, idx) => ({
        ...item,
        isLastInGroup: idx === cluster.length - 1,
        isGroupMember: isMultiOrder,
        groupOrderCount: cluster.length,
        groupOrderIndex: idx,
      }));

      if (isMultiOrder) {
        // Multi-order group gets its own dedicated divider
        sections.push({
          label: `Multiple Orders for the Same Buyer (${cluster[0].customer_name})`,
          className:
            "bg-[#F0FDF4] border-y border-emerald-200/80 px-4 py-2 text-center text-[11px] font-bold tracking-wide uppercase text-emerald-800",
          rows: taggedRows,
        });
      } else {
        // Single order placed under standard Date divider
        sections.push({
          label: clusterIdx === 0 ? dateLabel : "",
          rows: taggedRows,
        });
      }
    });
  });

  return sections;
}

export default function DriverMyDuties() {
  const navigate = useNavigate();

  const [duties, setDuties] = useState([]);
  const [assignedVehicle, setAssignedVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("");
  const [sort, setSort] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [page, setPage] = useState(1);

  // Consent & Location Tracking State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedDutyForTracking, setSelectedDutyForTracking] = useState(null);
  const [isStartingTracking, setIsStartingTracking] = useState(false);
  const [consentError, setConsentError] = useState("");

  const ITEMS = 10;

  const getAuthToken = () => {
    return (
      localStorage.getItem("grainrise_token") ||
      sessionStorage.getItem("grainrise_token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      ""
    );
  };

  const fetchDuties = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (query.trim()) params.append("search", query.trim());
      if (method) params.append("payment_method", method);
      if (sort) params.append("sort", sort);
      if (dateRange.startDate) params.append("start_date", dateRange.startDate);
      if (dateRange.endDate) params.append("end_date", dateRange.endDate);

      const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/duties/?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load assigned deliveries.");
      }

      setDuties(data.duties || []);
      setAssignedVehicle(data.vehicle || null);
    } catch (err) {
      setFetchError(err.message || "Unable to reach server.");
    } finally {
      setIsLoading(false);
    }
  }, [query, method, sort, dateRange]);

  useEffect(() => {
    fetchDuties();
  }, [fetchDuties]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(duties.length / ITEMS));
  const start = (page - 1) * ITEMS;
  const paginated = duties.slice(start, start + ITEMS);
  const sections = useMemo(() => buildSectionsWithBuyerGroups(paginated), [paginated]);

  // Location Consent Modal Flow
  const handleOpenConsentModal = (duty) => {
    setSelectedDutyForTracking(duty);
    setConsentError("");
    setShowConsentModal(true);
  };

  const handleAgreeAndStartTracking = async () => {
    if (!selectedDutyForTracking) return;
    setIsStartingTracking(true);
    setConsentError("");

    if (!navigator.geolocation) {
      setConsentError("Geolocation is not supported by your browser/device.");
      setIsStartingTracking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const token = getAuthToken();
          const res = await fetch(`${API_BASE}/api/warehouse-employees/driver/live-tracking/start/`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              buyer_group_key: selectedDutyForTracking.buyer_group_key,
              latitude,
              longitude,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to start live tracking.");
          }

          setShowConsentModal(false);
          setIsStartingTracking(false);
          // Navigate to dedicated Live Tracking page
          navigate(`/warehouse-driver/live-tracking?group=${encodeURIComponent(selectedDutyForTracking.buyer_group_key)}`);
        } catch (err) {
          setConsentError(err.message || "Failed to start live tracking session.");
          setIsStartingTracking(false);
        }
      },
      (err) => {
        setConsentError(
          err.code === 1
            ? "Location permission was denied. Please allow location access in your browser settings to start live tracking."
            : err.message || "Failed to retrieve GPS coordinates."
        );
        setIsStartingTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const columns = [
    {
      key: "batchNo",
      label: "Order / Delivery",
      width: "30%",
      headerClassName: "w-[30%]",
      cellClassName: "w-[30%] align-top",
      renderCell: (r) => {
        const isWh = r.customer_type === "Warehouse";
        return (
          <div className="space-y-1 py-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-gray-900 text-xs truncate">{r.batch_no}</span>
              {r.is_replacement && (
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                  Replacement
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-600 font-medium truncate">
              {r.product_name} · {r.display_quantity || r.ordered_quantity} kg
            </p>
            <div className="space-y-0.5 text-[10px] text-gray-400 font-medium pt-0.5">
              <p className="flex items-center gap-1.5 min-w-0">
                {isWh ? (
                  <Warehouse size={12} className="text-gray-400 shrink-0" />
                ) : (
                  <Store size={12} className="text-gray-400 shrink-0" />
                )}
                <span className="truncate text-gray-600 font-semibold">{r.customer_name}</span>
                <span className="text-[9px] text-gray-400">({r.customer_type})</span>
              </p>
              <p className="flex items-center gap-1.5 min-w-0">
                <MapPin size={12} className="text-gray-400 shrink-0" />
                <span className="truncate text-gray-500">{r.delivery_address || "Designated Branch Outlet"}</span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      width: "20%",
      headerClassName: "w-1/5 text-center",
      cellClassName: "w-1/5 text-center align-middle",
      renderCell: (r) => (
        <span
          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
            METHOD_BADGE[r.payment_method] || "bg-gray-100 text-gray-600"
          }`}
        >
          {r.payment_method}
        </span>
      ),
    },
    {
      key: "expectedArrivalDate",
      label: "Expected Arrival Date",
      width: "25%",
      headerClassName: "w-1/4",
      cellClassName: "w-1/4 align-middle",
      renderCell: (r) => (
        <div>
          <p className="text-xs font-bold text-gray-800">{r.expected_arrival_date}</p>
          <p className="text-[10px] text-gray-400 font-medium">Designated target date</p>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "25%",
      headerClassName: "w-1/4 text-center",
      cellClassName: "w-1/4 text-center align-middle",
      getCellProps: (r) => {
        if (r.isGroupMember) {
          if (r.groupOrderIndex === 0) {
            return {
              rowSpan: r.groupOrderCount,
              className: "bg-emerald-50/20 border-l border-emerald-100/70 align-middle",
            };
          }
          return { skip: true };
        }
        return { rowSpan: 1 };
      },
      renderCell: (r) => {
        const isMulti = r.isGroupMember && r.groupOrderCount > 1;

        return (
          <div className="flex flex-col items-center justify-center py-1">
            <button
              type="button"
              onClick={() => handleOpenConsentModal(r)}
              className="rounded-lg bg-[#0B5D1E] hover:bg-emerald-800 text-white text-[11px] font-bold px-4 py-2 transition cursor-pointer whitespace-nowrap shadow-sm hover:shadow active:scale-95"
            >
              {isMulti ? `Start Tracking (${r.groupOrderCount})` : "Start Tracking"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Operations" }, { label: "My Duties" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
              My Duties
            </h2>
            <p className="text-sm text-slate-500">
              View and manage your assigned deliveries.
            </p>
          </div>
          {assignedVehicle && (
            <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 w-fit">
              Vehicle: {assignedVehicle.vehicle_name} ({assignedVehicle.plate_number})
            </div>
          )}
        </div>
      </div>

      {/* ── Toolbar Layout (Search + Filter Selectors) ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search order, batch, recipient, or destination"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
        </div>

        <DateRangePicker
          onDateChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
        />

        <CustomDropdown
          label="Payment Method"
          value={method}
          onChange={(v) => {
            setMethod(v);
            setPage(1);
          }}
          options={PAYMENT_METHOD_OPTIONS}
        />

        <CustomDropdown
          label="Sort By"
          value={sort}
          onChange={(v) => setSort(v)}
          options={SORT_OPTIONS}
        />
      </div>

      {/* ── Duties Table Card ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-[14px] border border-slate-200 p-12 text-center space-y-3">
          <Loader2 className="animate-spin text-[#0B5D1E] mx-auto" size={32} />
          <p className="text-xs text-gray-500 font-semibold">Loading assigned duties...</p>
        </div>
      ) : fetchError ? (
        <div className="bg-white rounded-[14px] border border-rose-200 p-8 text-center space-y-2">
          <p className="text-xs font-bold text-rose-700">{fetchError}</p>
          <button
            type="button"
            onClick={fetchDuties}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <SectionedTableCard
          columns={columns}
          sections={sections}
          tableClassName="table-fixed"
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          footerLabel={`Showing ${start + 1}–${Math.min(start + paginated.length, duties.length)} of ${duties.length} duties`}
          emptyStateTitle="No duties assigned"
          emptyStateDescription="You do not have any pending or in-transit delivery duties at this time."
        />
      )}

      {/* ── Location Consent Warning Modal ──────────────────────────────────── */}
      <DriverLocationConsentModal
        isOpen={showConsentModal}
        onClose={() => {
          setShowConsentModal(false);
          setSelectedDutyForTracking(null);
          setConsentError("");
        }}
        onAgree={handleAgreeAndStartTracking}
        isLoading={isStartingTracking}
        errorMessage={consentError}
      />
    </div>
  );
}