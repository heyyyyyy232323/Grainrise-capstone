import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  MapPin,
  Mail,
  Phone,
  UserPlus,
  CheckCircle2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";
import ArchiveProductModal from "../../../Components/Modals/ArchiveProductModal";
import RestoreProductModal from "../../../Components/Modals/RestoreProductModal";
import DeleteProductModal from "../../../Components/Modals/DeleteProductModal";
import { MOCK_MILLER_BRANCHES } from "./MillerBranchManagement";

const MOCK_ACTIVE_EMPLOYEES = [
  { id: 1, name: "Operator A", role: "Mill Operator", email: "operator.a@grainrise.com", phone: "09121111111", status: "Active" },
  { id: 2, name: "Operator B", role: "Mill Operator", email: "operator.b@grainrise.com", phone: "09121111112", status: "Active" },
  { id: 3, name: "QC Inspector A", role: "Quality Control", email: "qc.a@grainrise.com", phone: "09122222221", status: "Active" },
  { id: 4, name: "QC Inspector B", role: "Quality Control", email: "qc.b@grainrise.com", phone: "09122222222", status: "Active" },
  { id: 5, name: "Logistics A", role: "Fulfillment & Logistics", email: "logistics.a@grainrise.com", phone: "09123333331", status: "Active" },
  { id: 6, name: "Logistics B", role: "Fulfillment & Logistics", email: "logistics.b@grainrise.com", phone: "09123333332", status: "Active" },
  { id: 7, name: "Finance A", role: "Finance", email: "finance.a@grainrise.com", phone: "09124444441", status: "Active" },
  { id: 8, name: "Procurement A", role: "Procurement", email: "procurement.a@grainrise.com", phone: "09125555551", status: "Active" },
  { id: 9, name: "Procurement B", role: "Procurement", email: "procurement.b@grainrise.com", phone: "09125555552", status: "Active" },
  { id: 10, name: "Sales A", role: "Sales", email: "sales.a@grainrise.com", phone: "09126666661", status: "Active" },
];

const MOCK_ARCHIVED_EMPLOYEES = [
  { id: 101, name: "Operator A", role: "Mill Operator", email: "operator.old1@grainrise.com", phone: "09120000001", status: "Archived" },
  { id: 102, name: "Operator A", role: "Mill Operator", email: "operator.old2@grainrise.com", phone: "09120000002", status: "Archived" },
  { id: 103, name: "QC Inspector A", role: "Quality Control", email: "qc.old1@grainrise.com", phone: "09120000003", status: "Archived" },
  { id: 104, name: "QC Inspector A", role: "Quality Control", email: "qc.old2@grainrise.com", phone: "09120000004", status: "Archived" },
  { id: 105, name: "Logistics A", role: "Fulfillment & Logistics", email: "logistics.old1@grainrise.com", phone: "09120000005", status: "Archived" },
  { id: 106, name: "Logistics A", role: "Fulfillment & Logistics", email: "logistics.old2@grainrise.com", phone: "09120000006", status: "Archived" },
  { id: 107, name: "Finance A", role: "Finance", email: "finance.old1@grainrise.com", phone: "09120000007", status: "Archived" },
  { id: 108, name: "Finance A", role: "Finance", email: "finance.old2@grainrise.com", phone: "09120000008", status: "Archived" },
  { id: 109, name: "Procurement A", role: "Procurement", email: "procurement.old1@grainrise.com", phone: "09120000009", status: "Archived" },
  { id: 110, name: "Sales A", role: "Sales", email: "sales.old1@grainrise.com", phone: "09120000010", status: "Archived" },
  { id: 111, name: "Sales B", role: "Sales", email: "sales.old2@grainrise.com", phone: "09120000011", status: "Archived" },
  { id: 112, name: "Operator C", role: "Mill Operator", email: "operator.old3@grainrise.com", phone: "09120000012", status: "Archived" },
];

const ROLES = ["All Roles", "Mill Operator", "Quality Control", "Fulfillment & Logistics", "Finance", "Procurement", "Sales"];

export default function MillerEmployeeManagement() {
  const navigate = useNavigate();
  const { branchId } = useParams();

  const branch = MOCK_MILLER_BRANCHES.find((b) => b.id === branchId) || MOCK_MILLER_BRANCHES[0];

  const [activeTab, setActiveTab] = useState("active");
  const [activeEmployees, setActiveEmployees] = useState(MOCK_ACTIVE_EMPLOYEES);
  const [archivedEmployees, setArchivedEmployees] = useState(MOCK_ARCHIVED_EMPLOYEES);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state management
  const [modalState, setModalState] = useState({ type: null, employee: null });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", role: "Mill Operator", email: "", phone: "" });
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const currentList = activeTab === "active" ? activeEmployees : archivedEmployees;

  const filtered = currentList.filter((emp) => {
    if (search && !emp.name.toLowerCase().includes(search.toLowerCase()) && !emp.email.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedRole !== "All Roles" && emp.role !== selectedRole) {
      return false;
    }
    return true;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Handlers for modal actions
  const handleArchive = () => {
    const emp = modalState.employee;
    if (!emp) return;
    setActiveEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    setArchivedEmployees((prev) => [{ ...emp, status: "Archived" }, ...prev]);
    showToast(`Archived ${emp.name} successfully.`);
    setModalState({ type: null, employee: null });
  };

  const handleRestore = () => {
    const emp = modalState.employee;
    if (!emp) return;
    setArchivedEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    setActiveEmployees((prev) => [{ ...emp, status: "Active" }, ...prev]);
    showToast(`Restored ${emp.name} to active list.`);
    setModalState({ type: null, employee: null });
  };

  const handleDeletePermanent = () => {
    const emp = modalState.employee;
    if (!emp) return;
    setArchivedEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    showToast(`Permanently deleted ${emp.name}.`);
    setModalState({ type: null, employee: null });
  };

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.email) return;

    const created = {
      id: Date.now(),
      name: newEmp.name,
      role: newEmp.role,
      email: newEmp.email,
      phone: newEmp.phone || "09123456789",
      status: "Active",
    };

    setActiveEmployees((prev) => [created, ...prev]);
    setNewEmp({ name: "", role: "Mill Operator", email: "", phone: "" });
    setShowAddModal(false);
    showToast(`Added ${created.name} (${created.role}) successfully!`);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Management" },
          { label: "Branch Management", path: "/miller-manager/branches" },
          { label: "Employee Management" },
        ]}
      />

      {/* Back Button */}
      <button
        onClick={() => navigate("/miller-manager/branches")}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Branch Management
      </button>

      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Employee Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage and monitor employees associated with this milling facility.
        </p>
      </div>

      {/* Branch Info Banner */}
      <div className="bg-[#0B5D1E] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight mb-2">
            {branch.name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/90 font-medium">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-amber-400 shrink-0" /> {branch.address}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail size={14} className="text-amber-400 shrink-0" /> {branch.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone size={14} className="text-amber-400 shrink-0" /> {branch.phone}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#D6A62D] hover:bg-[#b88c22] text-slate-900 text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition cursor-pointer self-start md:self-auto whitespace-nowrap"
        >
          <UserPlus size={15} /> Add Employee
        </button>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      {/* Active / Archived Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-semibold">
        <button
          onClick={() => { setActiveTab("active"); setCurrentPage(1); }}
          className={`flex items-center gap-2 pb-3 transition relative cursor-pointer ${
            activeTab === "active" ? "text-gray-900 border-b-2 border-emerald-700 font-bold" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Active Employees
          <span className="text-xs text-gray-400">({activeEmployees.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("archived"); setCurrentPage(1); }}
          className={`flex items-center gap-2 pb-3 transition relative cursor-pointer ${
            activeTab === "archived" ? "text-gray-900 border-b-2 border-emerald-700 font-bold" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          Archived Employees
          <span className="text-xs text-gray-400">({archivedEmployees.length})</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search employee name"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <select
          value={selectedRole}
          onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-600 outline-none min-w-[140px]"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Employee Name</th>
                <th className="px-6 py-4 text-left">Employee Role</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{emp.name}</td>
                  <td className="px-6 py-4 text-gray-600">{emp.role}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {activeTab === "active" ? (
                        <>
                          <button
                            onClick={() => showToast(`Editing ${emp.name}...`)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                          >
                            Edit
                          </button>
                          <CustomAmberButton
                            text="Archive"
                            className="px-3 py-1.5 text-[11px] rounded-lg"
                            onClick={() => setModalState({ type: "archive", employee: emp })}
                          />
                        </>
                      ) : (
                        <>
                          <CustomGreenButton
                            text="Restore"
                            className="px-3 py-1.5 text-[11px] rounded-lg"
                            onClick={() => setModalState({ type: "restore", employee: emp })}
                          />
                          <CustomRedButton
                            text="Delete"
                            className="px-4 py-1.5 text-[11px] rounded-lg"
                            onClick={() => setModalState({ type: "delete", employee: emp })}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-sm text-gray-400">
                    No {activeTab} employees found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5 bg-slate-50/40">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} employees
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

      {/* Add Employee Modal */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Add Milling Facility Employee</h3>
                    <p className="text-xs text-gray-500">Assign new staff to {branch.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Employee Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan Dela Cruz"
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Employee Role</label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white"
                  >
                    <option value="Mill Operator">Mill Operator</option>
                    <option value="Quality Control">Quality Control</option>
                    <option value="Fulfillment & Logistics">Fulfillment &amp; Logistics</option>
                    <option value="Finance">Finance</option>
                    <option value="Procurement">Procurement</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. employee@grainrise.com"
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 09123456789"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Save Employee
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modals */}
      <ArchiveProductModal
        isOpen={modalState.type === "archive"}
        onClose={() => setModalState({ type: null, employee: null })}
        productName={modalState.employee?.name || "Employee"}
        onArchive={handleArchive}
      />
      <RestoreProductModal
        isOpen={modalState.type === "restore"}
        onClose={() => setModalState({ type: null, employee: null })}
        productName={modalState.employee?.name || "Employee"}
        onRestore={handleRestore}
      />
      <DeleteProductModal
        isOpen={modalState.type === "delete"}
        onClose={() => setModalState({ type: null, employee: null })}
        productName={modalState.employee?.name || "Employee"}
        onDelete={handleDeletePermanent}
      />
    </div>
  );
}