import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Search, Plus, Building2, X, CheckCircle2 } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

export const MOCK_MILLER_BRANCHES = [
  { id: "b-1", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456789", activeEmployees: 28, capacity: "50,000 bags" },
  { id: "b-2", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456780", activeEmployees: 22, capacity: "45,000 bags" },
  { id: "b-3", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456781", activeEmployees: 19, capacity: "30,000 bags" },
  { id: "b-4", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456782", activeEmployees: 31, capacity: "60,000 bags" },
  { id: "b-5", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456783", activeEmployees: 15, capacity: "35,000 bags" },
  { id: "b-6", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456784", activeEmployees: 24, capacity: "40,000 bags" },
  { id: "b-7", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456785", activeEmployees: 18, capacity: "25,000 bags" },
  { id: "b-8", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456786", activeEmployees: 27, capacity: "55,000 bags" },
  { id: "b-9", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456787", activeEmployees: 14, capacity: "20,000 bags" },
  { id: "b-10", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456788", activeEmployees: 26, capacity: "48,000 bags" },
  { id: "b-11", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456790", activeEmployees: 20, capacity: "38,000 bags" },
  { id: "b-12", name: "Warehouse Distribution A", address: "Address 1", email: "whdistributiona@gmail.com", phone: "09123456791", activeEmployees: 17, capacity: "32,000 bags" },
];

export default function MillerBranchManagement() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState(MOCK_MILLER_BRANCHES);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", address: "", email: "", phone: "", capacity: "" });
  const [successToast, setSuccessToast] = useState(false);

  const TABLE_COLUMNS = useMemo(
    () => [
      { key: "name", label: "Warehouse Name", width: "24%" },
      { key: "address", label: "Warehouse Address", width: "24%" },
      { key: "email", label: "Official Email", width: "24%" },
      {
        key: "action",
        label: "Action",
        width: "16%",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={() => navigate(`/miller-manager/branches/${row.id}/employees`)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-[#0B5D1E] hover:bg-emerald-50/30 hover:text-[#0B5D1E] cursor-pointer"
            title="View Details"
          >
            <span>View Details</span>
          </button>
        ),
      },
    ],
    [navigate]
  );

  const filteredBranches = useMemo(() => {
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.address.toLowerCase().includes(search.toLowerCase()) ||
        b.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [branches, search]);

  const itemsPerPage = 10;
  const totalCount = filteredBranches.length;
  const TOTAL_PAGES = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredBranches.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginatedRows }], [paginatedRows]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.address || !newBranch.email) return;

    const created = {
      id: `branch-${Date.now()}`,
      name: newBranch.name,
      address: newBranch.address,
      email: newBranch.email,
      phone: newBranch.phone || "09123456789",
      activeEmployees: 10,
      capacity: newBranch.capacity || "50,000 bags",
    };

    setBranches((prev) => [created, ...prev]);
    setNewBranch({ name: "", address: "", email: "", phone: "", capacity: "" });
    setShowModal(false);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Branch Management" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Branch Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage your registered branches.
        </p>
      </div>

      {/* ── Search Bar & Action Button ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search branch name, address, or email"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-[#0B5D1E] hover:bg-[#094d19] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Plus size={16} /> Register New Branch
        </button>
      </div>

      {/* ── Toast Alert ────────────────────────────────────────────────────── */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> New branch facility successfully registered!
        </div>
      )}

      {/* ── SectionedTableCard Component ────────────────────────────────────── */}
      <SectionedTableCard
        columns={TABLE_COLUMNS}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing 1-10 of ${totalCount} branches`}
        emptyStateTitle="No branches found"
        emptyStateDescription="No branches matched your search. Try adjusting your search query."
      />

      {/* ── Register New Branch Modal ────────────────────────────────────────── */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0B5D1E] flex items-center justify-center">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Register New Branch</h3>
                    <p className="text-xs text-gray-500">Add a new warehouse branch facility</p>
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
                    placeholder="e.g. Warehouse Distribution M"
                    value={newBranch.name}
                    onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Warehouse Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Address 13"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Official Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. whdistributionm@gmail.com"
                    value={newBranch.email}
                    onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Contact Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 09123456789"
                    value={newBranch.phone}
                    onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Storage Capacity</label>
                  <input
                    type="text"
                    placeholder="e.g. 50,000 bags"
                    value={newBranch.capacity}
                    onChange={(e) => setNewBranch({ ...newBranch, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none"
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