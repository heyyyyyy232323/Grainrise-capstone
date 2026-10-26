import Toast from "../../../Components/Modals/Toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Mail,
  Phone,
  User,
  Star,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import InboundOrderDetailsModal from "../../../Components/Modals/WarehouseSupplier/InboundOrderDetailsModal";
import WarehouseReceivingHistoryDetailsModal from "../../../Components/Modals/WarehouseSupplier/WarehouseReceivingHistoryDetailsModal";

export default function GrainriseSupplierDetails() {
  const navigate = useNavigate();
  const { supplierProfileId } = useParams();
  const { request } = useApi();

  const [miller, setMiller] = useState(null);
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
  const [selectedActiveOrder, setSelectedActiveOrder] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchMillerDetails = useCallback(async () => {
    if (!supplierProfileId) return;
    try {
      setLoading(true);
      const res = await request(
        `/warehouse/suppliers/grainrise/${supplierProfileId}/`,
        { method: "GET" }
      );
      const data = res?.data ?? res;
      if (data && typeof data === "object") {
        setMiller(data);
        setActiveOrders(Array.isArray(data.active_orders) ? data.active_orders : []);
        setPurchaseHistory(Array.isArray(data.purchase_history) ? data.purchase_history : []);
      }
    } catch (err) {
      console.error("Failed to load Grainrise miller details:", err);
    } finally {
      setLoading(false);
    }
  }, [request, supplierProfileId]);

  useEffect(() => {
    fetchMillerDetails();
  }, [fetchMillerDetails]);

  const handleOpenHistoryDetails = async (row) => {
    setIsHistoryModalOpen(true);
    setSelectedHistoryDetail(null);
    setHistoryDetailLoading(true);
    try {
      const recId = row.receiving_id || row.id;
      const res = await request(
        `/warehouse/suppliers/grainrise/receiving-history/${recId}/`,
        { method: "GET", throwOnError: true }
      );
      const data = res?.data ?? res;
      if (data && typeof data === "object") {
        setSelectedHistoryDetail(data);
      }
    } catch (err) {
      console.warn("Failed to retrieve receiving detail:", err);
      setSelectedHistoryDetail(row);
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedHistoryDetail(null);
  };

  // Message Them Navigation
  const handleMessageThem = () => {
    if (!miller) return;
    navigate("/warehouse-manager/messages", {
      state: {
        recipientId: miller.supplier_profile_id,
        recipientName: miller.business_name,
        participantType: "supplier",
      },
    });
  };

  // Cancellation action handler for active order
  const handleCancelOrder = async (order, reason) => {
    try {
      const res = await request(
        `/warehouse/suppliers/grainrise/orders/${order.id || order.online_order_id}/cancel/`,
        {
          method: "POST",
          body: { reason },
        }
      );
      if (res?.success) {
        showToast("Order cancelled successfully.");
        fetchMillerDetails();
        return { success: true, message: res.message };
      }
      return { success: false, message: res?.message || "Order cancellation is not permitted at this stage." };
    } catch (err) {
      return { success: false, message: err.message || "Failed to process cancellation." };
    }
  };

  // Filters for Active Orders
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

  // Filters for Purchase History
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
        label: "Batch Number",
        width: "20%",
        render: (row) => (
          <span className="text-[13px] font-semibold text-slate-800">
            {row.batch_no || "—"}
          </span>
        ),
      },
      {
        key: "product_name",
        label: "Product",
        width: "24%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.product_name || "—"}
          </span>
        ),
      },
      {
        key: "unit_cost",
        label: "Unit Cost",
        width: "15%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.unit_cost != null ? `₱${Number(row.unit_cost).toFixed(2)} / kg` : "—"}
          </span>
        ),
      },
      {
        key: "ordered_quantity",
        label: "Ordered Quantity",
        width: "15%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.ordered_quantity != null ? `${Number(row.ordered_quantity).toLocaleString()} kg` : "—"}
          </span>
        ),
      },
      {
        key: "total_price",
        label: "Total Price",
        width: "14%",
        render: (row) => (
          <span className="text-[13px] font-bold text-emerald-800">
            {row.total_price != null ? `₱${Number(row.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        width: "12%",
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    ],
    []
  );

  const historyColumns = useMemo(
    () => [
      {
        key: "receiving_reference_no",
        label: "Receiving Reference No.",
        width: "32%",
        render: (row) => (
          <span className="text-[13px] font-semibold text-slate-800">
            {row.receiving_reference_no || "—"}
          </span>
        ),
      },
      {
        key: "product_name",
        label: "Product",
        width: "34%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.product_name || "—"}
          </span>
        ),
      },
      {
        key: "received_date",
        label: "Received Date",
        width: "22%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.received_date || "—"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        width: "12%",
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    ],
    []
  );

  const millerName = miller?.business_name || "Miller Details";
  const orgName = miller?.organization_name || "";
  const addressDisplay = miller?.address || "No address specified";
  const ownerName = miller?.owner_name || "—";
  const email = miller?.official_email || "";
  const phone = miller?.official_contact_number || "";
  const avgRating = miller?.avg_rating != null ? Number(miller.avg_rating) : null;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ──────────────────────────────────────────────────────── */}
      <Breadcrumbs
        items={[
          { label: "Management" },
          { label: "Supplier Management", path: "/warehouse-manager/suppliers" },
          { label: "Miller Details" },
        ]}
      />

      {/* ── Back Navigation ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate("/warehouse-manager/suppliers")}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Supplier Management
      </button>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Miller Details
        </h2>
        <p className="text-sm text-slate-500">
          View registered GRAINRISE miller branch profile, inbound orders, and procurement history.
        </p>
      </div>

      {/* ── Green Hero Strip ─────────────────────────────────────────────────── */}
      <div className="bg-[#0B5D1E] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-2xl font-extrabold tracking-tight">
              {millerName}
            </h3>
            {orgName && (
              <span className="text-white/80 text-sm font-medium">
                • {orgName}
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
              Registered Miller
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/90 font-medium">
            <span className="flex items-center gap-1.5" title="Registered Owner">
              <User size={14} className="text-amber-400 shrink-0" />
              <span>Owner: {ownerName}</span>
            </span>

            {phone && (
              <span className="flex items-center gap-1.5" title="Contact Number">
                <Phone size={14} className="text-amber-400 shrink-0" />
                <span>{phone}</span>
              </span>
            )}

            {email && (
              <span className="flex items-center gap-1.5" title="Official Email">
                <Mail size={14} className="text-amber-400 shrink-0" />
                <span>{email}</span>
              </span>
            )}

            <span className="flex items-center gap-1.5" title="Average Rating">
              <Star size={14} className="text-amber-400 shrink-0 fill-amber-400" />
              <span>
                {avgRating != null ? `${avgRating.toFixed(1)} / 5.0 (${miller?.rating_count || 0})` : "No ratings yet"}
              </span>
            </span>

            <span className="flex items-center gap-1.5 w-full sm:w-auto" title="Address">
              <MapPin size={14} className="text-amber-400 shrink-0" />
              <span className="truncate max-w-xl">{addressDisplay}</span>
            </span>
          </div>
        </div>

        {/* Message Them Button (ONLY for GRAINRISE Millers) */}
        <button
          type="button"
          onClick={handleMessageThem}
          className="flex items-center justify-center gap-2 bg-[#D6A62D] hover:bg-[#b88c22] text-slate-900 text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition cursor-pointer self-start md:self-auto whitespace-nowrap"
        >
          <MessageSquare size={15} /> Message Them
        </button>
      </div>

      {/* ── Toast Notification ───────────────────────────────────────────────── */}
      {toastMsg && (
        <Toast
          isOpen
          type="success"
          message={toastMsg}
          duration={3500}
          onClose={() => setToastMsg("")}
        />
      )}

      {/* ── Segmented Tabs ──────────────────────────────────────────────────── */}
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
          <span>Active Purchases</span>
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

      {/* ── Tab Content: Active Purchases ───────────────────────────────────── */}
      {activeTab === "active" && (
        <div className="space-y-2">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
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

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 self-start sm:self-center h-[38px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>{filteredActiveOrders.length} active orders</span>
            </div>
          </div>

          {loading ? (
            <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
                <span>Loading active purchases...</span>
              </div>
            </div>
          ) : (
            <SectionedTableCard
              columns={activeColumns}
              sections={[{ rows: paginatedActiveOrders }]}
              currentPage={activePage}
              totalPages={totalActivePages}
              onPageChange={setActivePage}
              onViewDetails={setSelectedActiveOrder}
              viewDetailsLabel="View Details"
              footerLabel={
                totalActiveCount === 0
                  ? "Showing 0 orders"
                  : `Showing ${(activePage - 1) * itemsPerPage + 1}-${Math.min(
                      activePage * itemsPerPage,
                      totalActiveCount
                    )} of ${totalActiveCount} orders`
              }
              emptyStateTitle="No active purchases"
              emptyStateDescription="There are currently no active inbound orders from this miller for your warehouse branches."
            />
          )}
        </div>
      )}

      {/* ── Tab Content: Purchase History ───────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-2">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
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

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 self-start sm:self-center h-[38px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>{filteredPurchaseHistory.length} completed records</span>
            </div>
          </div>

          {loading ? (
            <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-xs">
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
              onViewDetails={handleOpenHistoryDetails}
              viewDetailsLabel="View Details"
              footerLabel={
                totalHistoryCount === 0
                  ? "Showing 0 records"
                  : `Showing ${(historyPage - 1) * itemsPerPage + 1}-${Math.min(
                      historyPage * itemsPerPage,
                      totalHistoryCount
                    )} of ${totalHistoryCount} records`
              }
              emptyStateTitle="No purchase history"
              emptyStateDescription="No completed receiving records found for this registered miller."
            />
          )}
        </div>
      )}

      {/* ── Active Order View Details Modal ─────────────────────────────────── */}
      <InboundOrderDetailsModal
        isOpen={Boolean(selectedActiveOrder)}
        onClose={() => setSelectedActiveOrder(null)}
        order={selectedActiveOrder}
        isGrainrise={true}
        onCancelOrder={handleCancelOrder}
      />

      {/* ── Purchase History View Details Modal ─────────────────────────────── */}
      <WarehouseReceivingHistoryDetailsModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        detail={selectedHistoryDetail}
        isLoading={historyDetailLoading}
      />
    </div>
  );
}

