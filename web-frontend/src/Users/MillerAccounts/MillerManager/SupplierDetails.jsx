import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Mail,
  Phone,
  User,
  Star,
  Pencil,
  Package,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  ChevronDown,
  Calendar,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import usePhilippineAddress from "../../../Components/hooks/usePhilippineAddress";

const parseAddressString = (fullAddress = "") => {
  if (!fullAddress) {
    return { street: "", barangay: "", municipality: "", province: "", postalCode: "" };
  }
  const parts = fullAddress.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 5) {
    const postalCode = parts[parts.length - 1];
    const province = parts[parts.length - 2];
    const municipality = parts[parts.length - 3];
    const barangay = parts[parts.length - 4];
    const street = parts.slice(0, parts.length - 4).join(", ");
    return { street, barangay, municipality, province, postalCode };
  } else if (parts.length === 4) {
    const province = parts[3];
    const municipality = parts[2];
    const barangay = parts[1];
    const street = parts[0];
    return { street, barangay, municipality, province, postalCode: "" };
  }
  return { street: fullAddress, barangay: "", municipality: "", province: "", postalCode: "" };
};

const INITIAL_EDIT_FORM = {
  supplier_profile_id: "",
  supplier_farm: "",
  organization: "",
  contact_person: "",
  contact_number: "",
  email: "",
  street_address: "",
  status: "active",
};

export default function SupplierDetails() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const { request } = useApi();
  const address = usePhilippineAddress();

  const [supplier, setSupplier] = useState(null);
  const [branches, setBranches] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  // Tab State: "active" | "history"
  const [activeTab, setActiveTab] = useState("active");

  // Search & Pagination State
  const [activeSearch, setActiveSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(INITIAL_EDIT_FORM);
  const [pendingPrefill, setPendingPrefill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [selectedActiveOrder, setSelectedActiveOrder] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Fetch branches for edit dropdown
  const fetchBranches = useCallback(async () => {
    try {
      const res = await request("/miller/branches/", { method: "GET" });
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setBranches(list);
      }
    } catch (err) {
      console.error("Failed to load miller branches:", err);
    }
  }, [request]);

  // Fetch Supplier Details and related orders/history
  const fetchSupplierDetails = useCallback(async () => {
    if (!supplierId) return;
    try {
      setLoading(true);
      const res = await request(`/miller/suppliers/${supplierId}/`, { method: "GET" });
      const data = res?.data ?? res;
      if (data && typeof data === "object") {
        setSupplier(data);
        setActiveOrders(Array.isArray(data.active_orders) ? data.active_orders : []);
        setPurchaseHistory(Array.isArray(data.purchase_history) ? data.purchase_history : []);
      }
    } catch (err) {
      console.error("Failed to load supplier details:", err);
    } finally {
      setLoading(false);
    }
  }, [request, supplierId]);

  useEffect(() => {
    fetchBranches();
    fetchSupplierDetails();
  }, [fetchBranches, fetchSupplierDetails]);

  // Ensure provinces are loaded when modal is opened
  useEffect(() => {
    if (showEditModal && (!address.provinceOptions || address.provinceOptions.length === 0) && !address.loading.provinces) {
      address.reloadProvinces?.();
    }
  }, [showEditModal, address.provinceOptions, address.loading.provinces, address.reloadProvinces]);

  // Open Edit Modal with prefilled supplier information
  const handleOpenEditModal = () => {
    if (!supplier) return;
    const parsed = parseAddressString(supplier.address);
    setEditForm({
      supplier_profile_id: String(supplier.supplier_profile_id || ""),
      supplier_farm: supplier.supplier_farm || "",
      organization: supplier.organization || "",
      contact_person: supplier.contact_person || "",
      contact_number: supplier.contact_number || "",
      email: supplier.email || "",
      street_address: parsed.street || "",
      status: supplier.status || "active",
    });
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
    if (!address.provinceOptions || address.provinceOptions.length === 0) {
      address.reloadProvinces?.();
    }
    setPendingPrefill(parsed);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditForm(INITIAL_EDIT_FORM);
    setPendingPrefill(null);
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
  };

  // Sequential prefill handler across React lifecycle steps
  useEffect(() => {
    if (!showEditModal || !pendingPrefill) return;

    const runPrefill = async () => {
      // 1. Select Province if not yet matched
      if (pendingPrefill.province && address.province !== pendingPrefill.province) {
        if (!address.provinceOptions || address.provinceOptions.length === 0) return;
        const match = address.provinceOptions.find(
          (p) => p.toLowerCase() === pendingPrefill.province.toLowerCase()
        );
        if (match) {
          await address.selectProvince(match);
        } else {
          setPendingPrefill(null);
        }
        return;
      }

      // 2. Select Municipality if not yet matched
      if (
        pendingPrefill.municipality &&
        address.province &&
        address.municipality !== pendingPrefill.municipality
      ) {
        if (!address.municipalityOptions || address.municipalityOptions.length === 0) return;
        const match = address.municipalityOptions.find(
          (m) => m.toLowerCase() === pendingPrefill.municipality.toLowerCase()
        );
        if (match) {
          await address.selectMunicipality(match);
        } else {
          setPendingPrefill(null);
        }
        return;
      }

      // 3. Select Barangay & Postal Code
      if (
        pendingPrefill.barangay &&
        address.municipality &&
        address.barangay !== pendingPrefill.barangay
      ) {
        if (!address.barangayOptions || address.barangayOptions.length === 0) return;
        const match = address.barangayOptions.find(
          (b) => b.toLowerCase() === pendingPrefill.barangay.toLowerCase()
        );
        if (match) {
          address.selectBarangay(match);
        }
        if (pendingPrefill.postalCode) {
          address.updatePostalCode(pendingPrefill.postalCode);
        }
        setPendingPrefill(null);
        return;
      }

      if (
        address.province &&
        address.municipality &&
        !address.loading.municipalities &&
        !address.loading.barangays
      ) {
        if (pendingPrefill.postalCode && !address.postalCode) {
          address.updatePostalCode(pendingPrefill.postalCode);
        }
        setPendingPrefill(null);
      }
    };

    runPrefill();
  }, [
    showEditModal,
    pendingPrefill,
    address.province,
    address.municipality,
    address.barangay,
    address.provinceOptions,
    address.municipalityOptions,
    address.barangayOptions,
    address.loading.municipalities,
    address.loading.barangays,
    address.postalCode,
  ]);

  const handleEditInputChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleProvinceChange = async (provinceName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.province;
      delete next.municipality;
      delete next.barangay;
      return next;
    });
    await address.selectProvince(provinceName);
  };

  const handleMunicipalityChange = async (munName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.municipality;
      delete next.barangay;
      return next;
    });
    await address.selectMunicipality(munName);
  };

  const handleBarangayChange = (brgyName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.barangay;
      return next;
    });
    address.selectBarangay(brgyName);
  };

  // Submit Edit Supplier Form
  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = {};
    if (!editForm.supplier_profile_id) {
      errors.supplier_profile_id = "Please select a branch.";
    }
    if (!editForm.contact_person.trim()) {
      errors.contact_person = "Contact person is required.";
    }
    if (!editForm.contact_number.trim()) {
      errors.contact_number = "Contact number is required.";
    }

    const addressParts = [
      editForm.street_address?.trim(),
      address.barangay?.trim(),
      address.municipality?.trim(),
      address.province?.trim(),
      address.postalCode?.trim(),
    ].filter(Boolean);

    let combinedAddress = addressParts.join(", ");
    if (!combinedAddress) {
      combinedAddress = supplier?.address || "";
    }

    if (!combinedAddress) {
      errors.address = "Address is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        supplier_profile_id: Number(editForm.supplier_profile_id),
        supplier_farm: editForm.supplier_farm.trim() || null,
        organization: editForm.organization.trim() || null,
        contact_person: editForm.contact_person.trim(),
        contact_number: editForm.contact_number.trim(),
        email: editForm.email.trim() || null,
        address: combinedAddress,
        status: editForm.status || "active",
      };

      await request(`/miller/suppliers/${supplierId}/`, {
        method: "PUT",
        body: payload,
        throwOnError: true,
      });

      setShowEditModal(false);
      showToast("Supplier profile updated successfully!");
      fetchSupplierDetails();
    } catch (err) {
      console.error("Failed to update supplier:", err);
      setFormError(err.message || "Failed to update supplier. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Active Orders
  const filteredActiveOrders = useMemo(() => {
    const q = activeSearch.trim().toLowerCase();
    if (!q) return activeOrders;
    return activeOrders.filter(
      (o) =>
        (o.batch_no || "").toLowerCase().includes(q) ||
        (o.product_name || "").toLowerCase().includes(q)
    );
  }, [activeOrders, activeSearch]);

  const totalActiveCount = filteredActiveOrders.length;
  const totalActivePages = Math.max(1, Math.ceil(totalActiveCount / itemsPerPage));
  const paginatedActiveOrders = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage;
    return filteredActiveOrders.slice(start, start + itemsPerPage);
  }, [filteredActiveOrders, activePage]);

  // Filtered Purchase History
  const filteredPurchaseHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return purchaseHistory;
    return purchaseHistory.filter(
      (h) =>
        (h.receiving_reference_no || "").toLowerCase().includes(q) ||
        (h.batch_no || "").toLowerCase().includes(q) ||
        (h.product_name || "").toLowerCase().includes(q)
    );
  }, [purchaseHistory, historySearch]);

  const totalHistoryCount = filteredPurchaseHistory.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryCount / itemsPerPage));
  const paginatedPurchaseHistory = useMemo(() => {
    const start = (historyPage - 1) * itemsPerPage;
    return filteredPurchaseHistory.slice(start, start + itemsPerPage);
  }, [filteredPurchaseHistory, historyPage]);

  const activeColumns = useMemo(
    () => [
      {
        key: "batch_no",
        label: "Batch No.",
        width: "28%",
        render: (row) => (
          <span className="font-bold text-slate-900">{row.batch_no}</span>
        ),
      },
      {
        key: "product_name",
        label: "Product Name",
        width: "36%",
        render: (row) => (
          <span className="text-slate-800 font-medium">{row.product_name}</span>
        ),
      },
      {
        key: "expected_arrival_date",
        label: "Expected Arrival",
        width: "22%",
        render: (row) => (
          <span className="text-slate-600 font-medium">
            {row.expected_arrival_date || "—"}
          </span>
        ),
      },
      {
        key: "action",
        label: "View Details",
        width: "14%",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={() => setSelectedActiveOrder(row)}
            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
            title="View Details"
          >
            <Eye size={15} />
            <span>View</span>
          </button>
        ),
      },
    ],
    []
  );

  const historyColumns = useMemo(
    () => [
      {
        key: "receiving_reference_no",
        label: "Receiving Reference No.",
        width: "28%",
        render: (row) => (
          <span className="font-bold text-slate-900">{row.receiving_reference_no}</span>
        ),
      },
      {
        key: "product_name",
        label: "Product Name",
        width: "36%",
        render: (row) => (
          <span className="text-slate-800 font-medium">{row.product_name}</span>
        ),
      },
      {
        key: "expected_arrival_date",
        label: "Expected Arrival",
        width: "22%",
        render: (row) => (
          <span className="text-slate-600 font-medium">
            {row.expected_arrival_date || "—"}
          </span>
        ),
      },
      {
        key: "action",
        label: "View Details",
        width: "14%",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={() => setSelectedHistoryItem(row)}
            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
            title="View Details"
          >
            <Eye size={15} />
            <span>View</span>
          </button>
        ),
      },
    ],
    []
  );

  // Display fields for hero strip
  const farmName = supplier?.supplier_farm || supplier?.contact_person || "Supplier Details";
  const orgName = supplier?.organization || "";
  const contactPerson = supplier?.contact_person || "—";
  const contactNumber = supplier?.contact_number || "—";
  const email = supplier?.email || "";
  const addressDisplay = supplier?.address || "No address specified";
  const branchName = supplier?.branch_name || "Branch";
  const performanceRating =
    supplier?.performance_rating != null && !isNaN(Number(supplier.performance_rating))
      ? Number(supplier.performance_rating)
      : null;
  const supplierStatus = (supplier?.status || "active").toLowerCase();

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ──────────────────────────────────────────────────────── */}
      <Breadcrumbs
        items={[
          { label: "Management" },
          { label: "Supplier Management", path: "/miller-manager/suppliers" },
          { label: "Supplier Details" },
        ]}
      />

      {/* ── Back Navigation ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate("/miller-manager/suppliers")}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Supplier Management
      </button>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Supplier Details
        </h2>
        <p className="text-sm text-slate-500">
          View supplier profile, active inbound orders, and procurement purchase history.
        </p>
      </div>

      {/* ── Green Hero Strip (Consistent with EmployeeManagement.jsx) ─────────── */}
      <div className="bg-[#0B5D1E] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 flex-1 min-w-0">
          {/* Supplier Farm / Contact Name & Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-2xl font-extrabold tracking-tight">
              {farmName}
            </h3>
            {orgName && (
              <span className="text-white/80 text-sm font-medium">
                • {orgName}
              </span>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                supplierStatus === "active"
                  ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                  : "bg-white/10 text-white/70 border border-white/20"
              }`}
            >
              {supplierStatus === "active" ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Key Information Strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/90 font-medium">
            <span className="flex items-center gap-1.5" title="Contact Person">
              <User size={14} className="text-amber-400 shrink-0" />
              <span>{contactPerson}</span>
            </span>

            <span className="flex items-center gap-1.5" title="Contact Number">
              <Phone size={14} className="text-amber-400 shrink-0" />
              <span>{contactNumber}</span>
            </span>

            {email && (
              <span className="flex items-center gap-1.5" title="Email Address">
                <Mail size={14} className="text-amber-400 shrink-0" />
                <span>{email}</span>
              </span>
            )}

            <span className="flex items-center gap-1.5" title="Associated Branch">
              <Building2 size={14} className="text-amber-400 shrink-0" />
              <span>{branchName}</span>
            </span>

            <span className="flex items-center gap-1.5" title="Performance">
              <Star size={14} className="text-amber-400 shrink-0 fill-amber-400" />
              <span>
                {performanceRating != null ? `${performanceRating.toFixed(1)} / 5.0` : "N/A"}
              </span>
            </span>

            <span className="flex items-center gap-1.5 w-full sm:w-auto" title="Address">
              <MapPin size={14} className="text-amber-400 shrink-0" />
              <span className="truncate max-w-xl">{addressDisplay}</span>
            </span>
          </div>
        </div>

        {/* Edit Profile Button on Right */}
        <button
          type="button"
          onClick={handleOpenEditModal}
          className="flex items-center justify-center gap-2 bg-[#D6A62D] hover:bg-[#b88c22] text-slate-900 text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition cursor-pointer self-start md:self-auto whitespace-nowrap"
        >
          <Pencil size={15} /> Edit Profile
        </button>
      </div>

      {/* ── Toast Notification ───────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      {/* ── Segmented Tabs (Consistent with EmployeeManagement.jsx) ───────────── */}
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setActiveTab("active");
            setActivePage(1);
          }}
          className={`flex items-center gap-2 pb-3 transition relative cursor-pointer ${
            activeTab === "active"
              ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Active Orders</span>
          <span className="text-xs text-gray-400">({activeOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("history");
            setHistoryPage(1);
          }}
          className={`flex items-center gap-2 pb-3 transition relative cursor-pointer ${
            activeTab === "history"
              ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Purchase History</span>
          <span className="text-xs text-gray-400">({purchaseHistory.length})</span>
        </button>
      </div>

      {/* ── Tab Content: Active Orders ────────────────────────────────────────── */}
      {activeTab === "active" && (
        <div className="space-y-2">
          {/* Filter Controls (Matching MillerOrderApproval.jsx) */}
          <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={activeSearch}
                  onChange={(e) => {
                    setActiveSearch(e.target.value);
                    setActivePage(1);
                  }}
                  placeholder="Search batch number, product name"
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
                />
                {activeSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSearch("");
                      setActivePage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Total Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 self-start sm:self-center h-[38px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>{filteredActiveOrders.length} orders</span>
            </div>
          </div>

          {/* SectionedTableCard */}
          {loading ? (
            <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
                <span>Loading active orders...</span>
              </div>
            </div>
          ) : (
            <SectionedTableCard
              columns={activeColumns}
              sections={[{ rows: paginatedActiveOrders }]}
              currentPage={activePage}
              totalPages={totalActivePages}
              onPageChange={setActivePage}
              footerLabel={
                totalActiveCount === 0
                  ? "Showing 0 orders"
                  : `Showing ${(activePage - 1) * itemsPerPage + 1}-${Math.min(
                      activePage * itemsPerPage,
                      totalActiveCount
                    )} of ${totalActiveCount} orders`
              }
              emptyStateTitle="No active orders"
              emptyStateDescription="No active orders with status 'ordered' found for this supplier."
            />
          )}
        </div>
      )}

      {/* ── Tab Content: Purchase History ─────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-2">
          {/* Filter Controls (Matching MillerOrderApproval.jsx) */}
          <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search reference no., batch, product name"
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch("");
                      setHistoryPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Total Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 self-start sm:self-center h-[38px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>{filteredPurchaseHistory.length} records</span>
            </div>
          </div>

          {/* SectionedTableCard */}
          {loading ? (
            <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
                <span>Loading purchase history...</span>
              </div>
            </div>
          ) : (
            <SectionedTableCard
              columns={historyColumns}
              sections={[{ rows: paginatedPurchaseHistory }]}
              currentPage={historyPage}
              totalPages={totalHistoryPages}
              onPageChange={setHistoryPage}
              footerLabel={
                totalHistoryCount === 0
                  ? "Showing 0 records"
                  : `Showing ${(historyPage - 1) * itemsPerPage + 1}-${Math.min(
                      historyPage * itemsPerPage,
                      totalHistoryCount
                    )} of ${totalHistoryCount} records`
              }
              emptyStateTitle="No purchase history records"
              emptyStateDescription="No completed or partially received procurement orders found for this supplier."
            />
          )}
        </div>
      )}

      {/* ── Active Order View Details Modal ──────────────────────────────────── */}
      {selectedActiveOrder &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {selectedActiveOrder.batch_no}
                  </h3>
                  <p className="text-xs text-gray-500">Active Inbound Order Details</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedActiveOrder(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Product Photo */}
              <div className="w-full h-48 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                {selectedActiveOrder.product_photo ? (
                  <img
                    src={selectedActiveOrder.product_photo}
                    alt={selectedActiveOrder.product_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div
                  className={`flex flex-col items-center gap-1.5 text-gray-400 ${
                    selectedActiveOrder.product_photo ? "hidden" : ""
                  }`}
                >
                  <ImageIcon size={32} />
                  <span className="text-xs font-medium">No product photo uploaded</span>
                </div>
              </div>

              {/* Order Info Fields */}
              <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Batch Number:</span>
                  <span className="font-bold text-slate-900">{selectedActiveOrder.batch_no}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Product Name:</span>
                  <span className="font-semibold text-slate-900">{selectedActiveOrder.product_name}</span>
                </div>
                <div className="py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium block mb-1">Product Description:</span>
                  <span className="font-normal text-slate-800 leading-relaxed">
                    {selectedActiveOrder.product_description || "No description provided."}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Ordered Quantity:</span>
                  <span className="font-bold text-slate-900">
                    {Number(selectedActiveOrder.ordered_quantity).toLocaleString()} kg
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Expected Arrival:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedActiveOrder.expected_arrival_date || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Order Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                    {selectedActiveOrder.status}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedActiveOrder(null)}
                  className="px-5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Purchase History View Details Modal ──────────────────────────────── */}
      {selectedHistoryItem &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {selectedHistoryItem.receiving_reference_no}
                  </h3>
                  <p className="text-xs text-gray-500">Procurement Receiving Record</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryItem(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Product Photo */}
              <div className="w-full h-44 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                {selectedHistoryItem.product_photo ? (
                  <img
                    src={selectedHistoryItem.product_photo}
                    alt={selectedHistoryItem.product_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div
                  className={`flex flex-col items-center gap-1.5 text-gray-400 ${
                    selectedHistoryItem.product_photo ? "hidden" : ""
                  }`}
                >
                  <ImageIcon size={32} />
                  <span className="text-xs font-medium">No product photo uploaded</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-xl text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Receiving Reference No:</span>
                  <span className="font-bold text-slate-900">{selectedHistoryItem.receiving_reference_no}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Batch Number:</span>
                  <span className="font-semibold text-slate-900">{selectedHistoryItem.batch_no}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Product Name:</span>
                  <span className="font-semibold text-slate-900">{selectedHistoryItem.product_name}</span>
                </div>
                <div className="py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium block mb-1">Product Description:</span>
                  <span className="font-normal text-slate-800 leading-relaxed">
                    {selectedHistoryItem.product_description || "No description provided."}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Ordered Quantity:</span>
                  <span className="font-bold text-slate-900">
                    {Number(selectedHistoryItem.ordered_quantity).toLocaleString()} kg
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Expected Arrival:</span>
                  <span className="font-medium text-slate-900">
                    {selectedHistoryItem.expected_arrival_date || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Price per kg:</span>
                  <span className="font-bold text-slate-900">
                    ₱{Number(selectedHistoryItem.price_per_kg || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Total Price:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    ₱{Number(selectedHistoryItem.total_price || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Fulfillment Status:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedHistoryItem.fulfillment_status === "received"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {selectedHistoryItem.fulfillment_status}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Payment Status:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedHistoryItem.payment_status === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {selectedHistoryItem.payment_status || "pending"}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedHistoryItem(null)}
                  className="px-5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Edit Supplier Modal ──────────────────────────────────────────────── */}
      {showEditModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Edit Supplier Profile</h3>
                  <p className="text-xs text-gray-500">Update supplier contact and branch information</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateSupplier} className="space-y-3.5">
                {/* Associated Branch */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Associated Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editForm.supplier_profile_id}
                    onChange={(e) => handleEditInputChange("supplier_profile_id", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none bg-white text-gray-700 transition ${
                      fieldErrors.supplier_profile_id
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  >
                    {branches.length === 0 && (
                      <option value="">No branches found</option>
                    )}
                    {branches.map((b) => (
                      <option key={b.supplier_profile_id} value={b.supplier_profile_id}>
                        {b.business_name || b.organization_name || `Branch #${b.supplier_profile_id}`}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.supplier_profile_id && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.supplier_profile_id}</p>
                  )}
                </div>

                {/* Supplier / Farm & Organization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Supplier / Farm Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Green Valley Farm"
                      value={editForm.supplier_farm}
                      onChange={(e) => handleEditInputChange("supplier_farm", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Organization / Co-op
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Farmers Association"
                      value={editForm.organization}
                      onChange={(e) => handleEditInputChange("organization", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* Contact Person & Contact Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Contact Person <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Juan Dela Cruz"
                      value={editForm.contact_person}
                      onChange={(e) => handleEditInputChange("contact_person", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                        fieldErrors.contact_person
                          ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                          : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                      }`}
                    />
                    {fieldErrors.contact_person && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.contact_person}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 09123456789"
                      value={editForm.contact_number}
                      onChange={(e) => handleEditInputChange("contact_number", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                        fieldErrors.contact_number
                          ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                          : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                      }`}
                    />
                    {fieldErrors.contact_number && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.contact_number}</p>
                    )}
                  </div>
                </div>

                {/* Email Address & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Email Address <span className="text-xs text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. supplier@example.com"
                      value={editForm.email}
                      onChange={(e) => handleEditInputChange("email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => handleEditInputChange("status", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-gray-700"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Province & City / Municipality */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Province <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={address.province}
                        onChange={(e) => handleProvinceChange(e.target.value)}
                        onFocus={() => {
                          if ((!address.provinceOptions || address.provinceOptions.length === 0) && !address.loading.provinces) {
                            address.reloadProvinces?.();
                          }
                        }}
                        className={`w-full appearance-none pl-3 pr-8 py-2 border rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer ${
                          fieldErrors.province
                            ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200"
                        }`}
                      >
                        <option value="">
                          {address.loading.provinces
                            ? "Loading Provinces..."
                            : "Select Province"}
                        </option>
                        {address.provinceOptions.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {fieldErrors.province && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.province}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      City / Municipality <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={address.municipality}
                        onChange={(e) => handleMunicipalityChange(e.target.value)}
                        disabled={!address.province || address.loading.municipalities}
                        className={`w-full appearance-none pl-3 pr-8 py-2 border rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 ${
                          fieldErrors.municipality
                            ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200"
                        }`}
                      >
                        <option value="">
                          {address.loading.municipalities
                            ? "Loading Cities/Municipalities..."
                            : !address.province
                            ? "Select Province First"
                            : "Select City / Municipality"}
                        </option>
                        {address.municipalityOptions.map((mun) => (
                          <option key={mun} value={mun}>
                            {mun}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {fieldErrors.municipality && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.municipality}</p>
                    )}
                  </div>
                </div>

                {/* Barangay & Postal Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Barangay
                    </label>
                    <div className="relative">
                      <select
                        value={address.barangay}
                        onChange={(e) => handleBarangayChange(e.target.value)}
                        disabled={!address.municipality || address.loading.barangays}
                        className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="">
                          {address.loading.barangays
                            ? "Loading Barangays..."
                            : !address.municipality
                            ? "Select Municipality First"
                            : "Select Barangay"}
                        </option>
                        {address.barangayOptions.map((brgy) => (
                          <option key={brgy} value={brgy}>
                            {brgy}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Postal Code <span className="text-gray-400 font-normal">(auto-filled)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={address.loading.postalCode ? "Loading..." : "e.g. 2300"}
                      value={address.postalCode}
                      onChange={(e) => address.updatePostalCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Agri Valley Road, Gate 2"
                    value={editForm.street_address}
                    onChange={(e) => handleEditInputChange("street_address", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="flex-1 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      "Save Changes"
                    )}
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
