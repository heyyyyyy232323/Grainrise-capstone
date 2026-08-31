import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Building2, MapPin, Mail, Phone, X, CheckCircle2 } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

export const MOCK_BRANCHES = [
  { id: "branch-a", name: "Warehouse Distribution A", address: "Address 1, Balagtas, Bulacan", email: "whdistributiona@gmail.com", phone: "09123456789", activeEmployees: 28, archivedEmployees: 12 },
  { id: "branch-b", name: "Warehouse Distribution B", address: "Address 2, San Ildefonso, Bulacan", email: "whdistributionb@gmail.com", phone: "09123456780", activeEmployees: 22, archivedEmployees: 8 },
  { id: "branch-c", name: "Warehouse Distribution C", address: "Address 3, Guiguinto, Bulacan", email: "whdistributionc@gmail.com", phone: "09123456781", activeEmployees: 19, archivedEmployees: 5 },
  { id: "branch-d", name: "Warehouse Distribution D", address: "Address 4, Plaridel, Bulacan", email: "whdistributiond@gmail.com", phone: "09123456782", activeEmployees: 31, archivedEmployees: 14 },
  { id: "branch-e", name: "Warehouse Distribution E", address: "Address 5, Malolos City, Bulacan", email: "whdistributione@gmail.com", phone: "09123456783", activeEmployees: 15, archivedEmployees: 4 },
  { id: "branch-f", name: "Warehouse Distribution F", address: "Address 6, Bocaue, Bulacan", email: "whdistributionf@gmail.com", phone: "09123456784", activeEmployees: 24, archivedEmployees: 9 },
  { id: "branch-g", name: "Warehouse Distribution G", address: "Address 7, Marilao, Bulacan", email: "whdistributiong@gmail.com", phone: "09123456785", activeEmployees: 18, archivedEmployees: 6 },
  { id: "branch-h", name: "Warehouse Distribution H", address: "Address 8, Santa Maria, Bulacan", email: "whdistributionh@gmail.com", phone: "09123456786", activeEmployees: 27, archivedEmployees: 11 },
  { id: "branch-i", name: "Warehouse Distribution I", address: "Address 9, Calumpit, Bulacan", email: "whdistributioni@gmail.com", phone: "09123456787", activeEmployees: 14, archivedEmployees: 3 },
  { id: "branch-j", name: "Warehouse Distribution J", address: "Address 10, Baliuag, Bulacan", email: "whdistributionj@gmail.com", phone: "09123456788", activeEmployees: 26, archivedEmployees: 10 },
  { id: "branch-k", name: "Warehouse Distribution K", address: "Address 11, Pulilan, Bulacan", email: "whdistributionk@gmail.com", phone: "09123456790", activeEmployees: 20, archivedEmployees: 7 },
  { id: "branch-l", name: "Warehouse Distribution L", address: "Address 12, Hagonoy, Bulacan", email: "whdistributionl@gmail.com", phone: "09123456791", activeEmployees: 17, archivedEmployees: 5 },
];

export default function BranchManagement() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState(MOCK_BRANCHES);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", address: "", email: "", phone: "" });
  const [successToast, setSuccessToast] = useState(false);

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase())
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.address || !newBranch.email) return;

    const created = {
      id: `branch-${Date.now()}`,
      name: newBranch.name,
      address: newBranch.address,
      email: newBranch.email,
      phone: newBranch.phone || "09123456789",
      activeEmployees: 0,
      archivedEmployees: 0,
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
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Branch Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage your registered branches.
        </p>
      </div>

      {/* ── Search Bar & Action Button ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search branch name, address, or email"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 outline-none bg-white placeholder-gray-400 text-gray-700"
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
          <CheckCircle2 size={16} /> New warehouse branch successfully registered!
        </div>
      )}

      {/* ── Table Card ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Warehouse Name</th>
                <th className="px-6 py-4 text-left">Warehouse Address</th>
                <th className="px-6 py-4 text-left">Official Email</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{b.name}</td>
                  <td className="px-6 py-4 text-gray-600">{b.address}</td>
                  <td className="px-6 py-4 text-gray-600">{b.email}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => navigate(`/warehouse-manager/branches/${b.id}/employees`)}
                      className="px-4 py-1.5 rounded-full border border-gray-300 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 text-xs font-semibold text-gray-600 transition cursor-pointer"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-sm text-gray-400">
                    No branches found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5 bg-slate-50/40">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} branches
          </p>
          <div className="flex gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-200 text-gray-400 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  currentPage === i + 1
                    ? "bg-[#0B5D1E] text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Register New Branch Modal ───────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
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
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Warehouse Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Barangay Poblacion, Marilao, Bulacan"
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
                  placeholder="e.g. whdistributionm@gmail.com"
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
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition"
                >
                  Save &amp; Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
