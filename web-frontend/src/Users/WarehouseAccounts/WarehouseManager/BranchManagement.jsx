import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Building2, X, CheckCircle2, MapPin, Mail, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

export const MOCK_BRANCHES = [
  { id: "branch-a", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456789", status: "ACTIVE" },
  { id: "branch-b", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456780", status: "INACTIVE" },
  { id: "branch-c", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456781", status: "ACTIVE" },
  { id: "branch-d", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456782", status: "INACTIVE" },
  { id: "branch-e", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456783", status: "ACTIVE" },
  { id: "branch-f", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456784", status: "INACTIVE" },
  { id: "branch-g", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456785", status: "ACTIVE" },
  { id: "branch-h", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456786", status: "INACTIVE" },
  { id: "branch-i", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456787", status: "ACTIVE" },
  { id: "branch-j", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456788", status: "INACTIVE" },
  { id: "branch-k", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456790", status: "ACTIVE" },
  { id: "branch-l", name: "North Region Warehouse", address: "123 Agri Valley Road, Tarlac City, Tarlac 2300", email: "north.wh@grainrise.com", phone: "09123456791", status: "INACTIVE" },
];

export default function BranchManagement() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState(MOCK_BRANCHES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Status");
  const [showModal, setShowModal] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", address: "", email: "", phone: "" });
  const [successToast, setSuccessToast] = useState(false);

  // Filter logic for search and status
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch =
          b.name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== "Status" && statusFilter !== "All") {
        if (b.status !== statusFilter) return false;
      }

      return true;
    });
  }, [branches, search, statusFilter]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.address || !newBranch.email) return;

    const created = {
      id: `branch-${Date.now()}`,
      name: newBranch.name,
      address: newBranch.address,
      email: newBranch.email,
      phone: newBranch.phone || "09123456789",
      status: "ACTIVE",
    };

    setBranches((prev) => [created, ...prev]);
    setNewBranch({ name: "", address: "", email: "", phone: "" });
    setShowModal(false);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Branch Management" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-[-0.02em] text-gray-900">
          Branch Management
        </h2>
        <p className="text-sm text-gray-500">
          Manage your registered branches.
        </p>
      </div>

      {/* ── Search Bar, Status Dropdown & Register Button ───────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search branch name, address, or email"
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Status">Status</option>
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Register Button */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto h-[38px]"
        >
          <Plus size={16} /> Register New Branch
        </button>
      </div>

      {/* ── Toast Alert ────────────────────────────────────────────────────── */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> New warehouse branch successfully registered!
        </div>
      )}

      {/* ── Branch Cards Grid ──────────────────────────────────────────────── */}
      {filteredBranches.length === 0 ? (
        <div className="p-12 text-center text-gray-500 border border-gray-200 rounded-xl bg-white">
          <p className="text-base font-semibold text-gray-800 mb-1">No branches found</p>
          <p className="text-xs text-gray-500">No branches matched your search. Try adjusting your filter terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBranches.map((branch) => (
            <div
              key={branch.id}
className="bg-white border border-[#D8D8D8] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:border-emerald-300 hover:shadow-md transition-all"            >
              {/* Header: Branch Name & Status Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    {branch.name}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                      branch.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {branch.status}
                  </span>
                </div>

                {/* Info List */}
                <div className="space-y-2 text-xs text-gray-500 mb-6">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-gray-400" />
                    <span className="leading-snug">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="shrink-0 text-gray-400" />
                    <span className="truncate">{branch.email}</span>
                  </div>
                </div>
              </div>

              {/* View Details Button */}
              <button
                type="button"
                onClick={() => navigate(`/warehouse-manager/branches/${branch.id}/employees`)}
                className="w-full py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Register New Branch Modal (Portaled to document.body) ─────────────── */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Register New Branch</h3>
                    <p className="text-xs text-gray-500">Add a new warehouse storage facility</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Warehouse Branch Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Region Warehouse"
                    value={newBranch.name}
                    onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Warehouse Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123 Agri Valley Road, Tarlac City"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Official Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. north.wh@grainrise.com"
                    value={newBranch.email}
                    onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Contact Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 09123456789"
                    value={newBranch.phone}
                    onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Save &amp; Register
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