import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  MapPin,
  Mail,
  Phone,
  UserPlus,
  Pencil,
  CheckCircle2,
  X,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { createPortal } from "react-dom";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";
import ArchiveAccountModal from "../../../Components/Modals/ArchiveAccountModal";
import RestoreProductModal from "../../../Components/Modals/RestoreProductModal";
import DeleteProductModal from "../../../Components/Modals/DeleteProductModal";
import useApi from "../../../Components/hooks/useApi";
import { MOCK_BRANCHES } from "./BranchManagement";

const ROLES = ["All Roles", "Driver", "Finance", "Fulfillment & Logistics", "Encoder", "Procurement", "Sales"];

const INITIAL_NEW_EMP = {
  first_name: "",
  middle_initial: "",
  last_name: "",
  suffix: "",
  role: "Driver",
  email: "",
  phone: "",
  password: "",
  confirm_password: "",
};

const validatePhone = (value) => {
  if (!value || !value.trim()) {
    return "Contact phone number is required.";
  }
  const cleaned = value.trim().replace(/[\s-]/g, "");
  if (!/^(09\d{9}|\+639\d{9})$/.test(cleaned)) {
    return "Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
  }
  return "";
};

const validatePassword = (value) => {
  if (!value) {
    return "Password is required.";
  }
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must contain at least 1 uppercase letter.";
  }
  if (!/[a-z]/.test(value)) {
    return "Password must contain at least 1 lowercase letter.";
  }
  if (!/[0-9]/.test(value)) {
    return "Password must contain at least 1 number.";
  }
  return "";
};

const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return "";
};

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const { request } = useApi();

  const [branchInfo, setBranchInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("active");
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [archivedEmployees, setArchivedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [currentPage, setCurrentPage] = useState(1);

  const branch = useMemo(() => {
    if (branchInfo) {
      const addressParts = [
        branchInfo.street_address,
        branchInfo.barangay,
        branchInfo.municipality,
        branchInfo.province,
        branchInfo.postal_code,
      ].filter(Boolean);

      return {
        id: branchInfo.supplier_profile_id,
        name: branchInfo.business_name || branchInfo.organization_name || "Branch",
        address: addressParts.length > 0 ? addressParts.join(", ") : "No address specified",
        email: branchInfo.official_email || "N/A",
        phone: branchInfo.official_contact_number || "N/A",
      };
    }
    const fallback = MOCK_BRANCHES.find((b) => String(b.id) === String(branchId));
    return (
      fallback || {
        name: "Branch Details",
        address: "Loading address...",
        email: "Loading...",
        phone: "Loading...",
      }
    );
  }, [branchInfo, branchId]);

  const fetchEmployees = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const res = await request(`/miller/branches/${branchId}/employees/`, { method: "GET" });
      if (res?.branch) {
        setBranchInfo(res.branch);
      }
      const rawList = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(rawList)) {
        const active = [];
        const archived = [];

        rawList.forEach((emp) => {
          const empStatus = (emp.status || "").toLowerCase();
          const fullName =
            emp.name ||
            [emp.first_name, emp.middle_initial, emp.last_name, emp.suffix]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            emp.email ||
            "Employee";

          const normalizedEmp = {
            id: emp.supplier_employee_id || emp.id,
            supplier_employee_id: emp.supplier_employee_id || emp.id,
            first_name: emp.first_name || "",
            middle_initial: emp.middle_initial || "",
            last_name: emp.last_name || "",
            suffix: emp.suffix || "",
            name: fullName,
            role: emp.role || emp.position || "Employee",
            position: emp.position || emp.role || "",
            email: emp.email || "",
            phone: emp.phone || emp.contact_number || "",
            contact_number: emp.contact_number || emp.phone || "",
            status: emp.status || "Active",
            archive_reason: emp.archive_reason || "",
          };

          if (
            empStatus === "archived" ||
            empStatus === "inactive" ||
            empStatus === "deactivated"
          ) {
            archived.push(normalizedEmp);
          } else {
            active.push(normalizedEmp);
          }
        });

        setActiveEmployees(active);
        setArchivedEmployees(archived);
      }
    } catch (err) {
      console.error("Failed to load branch employees:", err);
    } finally {
      setLoading(false);
    }
  }, [branchId, request]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Modals state management
  const [modalState, setModalState] = useState({ type: null, employee: null });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState(INITIAL_NEW_EMP);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [addError, setAddError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Edit Employee state management
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmp, setEditEmp] = useState({
    id: null,
    first_name: "",
    middle_initial: "",
    last_name: "",
    suffix: "",
    role: "Driver",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [editError, setEditError] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleInputChange = (field, value) => {
    setNewEmp((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field) => {
    let err = "";
    if (field === "phone") {
      err = validatePhone(newEmp.phone);
    } else if (field === "password") {
      err = validatePassword(newEmp.password);
      if (!err && newEmp.confirm_password) {
        const cErr = validateConfirmPassword(newEmp.password, newEmp.confirm_password);
        if (cErr) {
          setFieldErrors((prev) => ({ ...prev, confirm_password: cErr }));
        }
      }
    } else if (field === "confirm_password") {
      err = validateConfirmPassword(newEmp.password, newEmp.confirm_password);
    }
    if (err) {
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewEmp(INITIAL_NEW_EMP);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFieldErrors({});
    setAddError("");
  };

  // Edit employee helpers
  const handleOpenEdit = (emp) => {
    let firstName = emp.first_name || "";
    let lastName = emp.last_name || "";
    if (!firstName && !lastName && emp.name) {
      const parts = emp.name.trim().split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }
    setEditEmp({
      id: emp.id,
      first_name: firstName,
      middle_initial: emp.middle_initial || "",
      last_name: lastName,
      suffix: emp.suffix || "",
      role: emp.role || "Driver",
      email: emp.email || "",
      phone: emp.phone || emp.contact_number || "",
      password: "",
      confirm_password: "",
    });
    setEditFieldErrors({});
    setEditError("");
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditEmp({
      id: null,
      first_name: "",
      middle_initial: "",
      last_name: "",
      suffix: "",
      role: "Driver",
      email: "",
      phone: "",
      password: "",
      confirm_password: "",
    });
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
    setEditFieldErrors({});
    setEditError("");
  };

  const handleEditInputChange = (field, value) => {
    setEditEmp((prev) => ({ ...prev, [field]: value }));
    if (editFieldErrors[field]) {
      setEditFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleEditBlur = (field) => {
    let err = "";
    if (field === "phone") {
      err = validatePhone(editEmp.phone);
    } else if (field === "password") {
      if (editEmp.password || editEmp.confirm_password) {
        err = validatePassword(editEmp.password);
        if (!err && editEmp.confirm_password) {
          const cErr = validateConfirmPassword(editEmp.password, editEmp.confirm_password);
          if (cErr) {
            setEditFieldErrors((prev) => ({ ...prev, confirm_password: cErr }));
          }
        }
      }
    } else if (field === "confirm_password") {
      if (editEmp.password || editEmp.confirm_password) {
        err = validateConfirmPassword(editEmp.password, editEmp.confirm_password);
      }
    }
    if (err) {
      setEditFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setEditError("");

    const errors = {};
    if (!editEmp.first_name.trim()) errors.first_name = "First name is required.";
    if (!editEmp.last_name.trim()) errors.last_name = "Last name is required.";
    if (!editEmp.email.trim()) errors.email = "Email address is required.";

    const phoneErr = validatePhone(editEmp.phone);
    if (phoneErr) errors.phone = phoneErr;

    if (editEmp.password || editEmp.confirm_password) {
      const pwErr = validatePassword(editEmp.password);
      if (pwErr) errors.password = pwErr;

      const confirmErr = validateConfirmPassword(editEmp.password, editEmp.confirm_password);
      if (confirmErr) errors.confirm_password = confirmErr;
    }

    if (Object.keys(errors).length > 0) {
      setEditFieldErrors(errors);
      setEditError("Please resolve the highlighted errors before saving.");
      return;
    }
    setEditFieldErrors({});

    try {
      setSubmitting(true);
      const cleanedPhone = editEmp.phone.trim().replace(/[\s-]/g, "");
      const payload = {
        first_name: editEmp.first_name.trim(),
        middle_initial: editEmp.middle_initial.trim() || null,
        last_name: editEmp.last_name.trim(),
        suffix: editEmp.suffix.trim() || null,
        position: editEmp.role,
        email: editEmp.email.trim(),
        contact_number: cleanedPhone,
      };
      if (editEmp.password && editEmp.password.trim()) {
        payload.password = editEmp.password.trim();
      }

      await request(`/miller/branches/${branchId}/employees/${editEmp.id}/`, {
        method: "PUT",
        body: payload,
        throwOnError: true,
      });

      const fullName = [editEmp.first_name.trim(), editEmp.last_name.trim()].filter(Boolean).join(" ");
      handleCloseEditModal();
      showToast(`Updated ${fullName} successfully!`);
      fetchEmployees();
    } catch (err) {
      console.error("Failed to update employee:", err);
      setEditError(err.message || "Failed to update employee. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentList = activeTab === "active" ? activeEmployees : archivedEmployees;

  const filtered = currentList.filter((emp) => {
    if (
      search &&
      !emp.name.toLowerCase().includes(search.toLowerCase()) &&
      !emp.email.toLowerCase().includes(search.toLowerCase()) &&
      !(emp.archive_reason && emp.archive_reason.toLowerCase().includes(search.toLowerCase()))
    ) {
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
  const handleArchive = async (reason) => {
    const emp = modalState.employee;
    if (!emp) return;
    try {
      setSubmitting(true);
      await request(`/miller/branches/${branchId}/employees/${emp.id}/archive/`, {
        method: "POST",
        body: { reason },
        throwOnError: true,
      });
      showToast(`Archived ${emp.name} successfully.`);
      setModalState({ type: null, employee: null });
      fetchEmployees();
    } catch (err) {
      console.error("Failed to archive employee:", err);
      showToast(err.message || "Failed to archive employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    const emp = modalState.employee;
    if (!emp) return;
    try {
      setSubmitting(true);
      await request(`/miller/branches/${branchId}/employees/${emp.id}/restore/`, {
        method: "POST",
        throwOnError: true,
      });
      showToast(`Restored ${emp.name} to active list.`);
      setModalState({ type: null, employee: null });
      fetchEmployees();
    } catch (err) {
      console.error("Failed to restore employee:", err);
      showToast(err.message || "Failed to restore employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePermanent = async () => {
    const emp = modalState.employee;
    if (!emp) return;
    try {
      setSubmitting(true);
      await request(`/miller/branches/${branchId}/employees/${emp.id}/`, {
        method: "DELETE",
        throwOnError: true,
      });
      showToast(`Permanently deleted ${emp.name}.`);
      setModalState({ type: null, employee: null });
      fetchEmployees();
    } catch (err) {
      console.error("Failed to delete employee:", err);
      showToast(err.message || "Failed to delete employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setAddError("");

    const errors = {};
    if (!newEmp.first_name.trim()) errors.first_name = "First name is required.";
    if (!newEmp.last_name.trim()) errors.last_name = "Last name is required.";
    if (!newEmp.email.trim()) errors.email = "Email address is required.";

    const phoneErr = validatePhone(newEmp.phone);
    if (phoneErr) errors.phone = phoneErr;

    const pwErr = validatePassword(newEmp.password);
    if (pwErr) errors.password = pwErr;

    const confirmErr = validateConfirmPassword(newEmp.password, newEmp.confirm_password);
    if (confirmErr) errors.confirm_password = confirmErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setAddError("Please resolve the highlighted errors before saving.");
      return;
    }
    setFieldErrors({});

    try {
      setSubmitting(true);
      const cleanedPhone = newEmp.phone.trim().replace(/[\s-]/g, "");
      await request(`/miller/branches/${branchId}/employees/`, {
        method: "POST",
        body: {
          first_name: newEmp.first_name.trim(),
          middle_initial: newEmp.middle_initial.trim() || null,
          last_name: newEmp.last_name.trim(),
          suffix: newEmp.suffix.trim() || null,
          position: newEmp.role,
          email: newEmp.email.trim(),
          contact_number: cleanedPhone,
          password: newEmp.password,
        },
        throwOnError: true,
      });

      const fullName = [newEmp.first_name.trim(), newEmp.last_name.trim()].filter(Boolean).join(" ");
      const savedRole = newEmp.role;
      handleCloseAddModal();
      showToast(`Added ${fullName} (${savedRole}) successfully!`);
      fetchEmployees();
    } catch (err) {
      console.error("Failed to add employee:", err);
      setAddError(err.message || "Failed to add employee. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
          Manage and monitor employees associated with this branch.
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
                {activeTab === "archived" && (
                  <th className="px-6 py-4 text-left">Archive Reason</th>
                )}
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === "archived" ? 4 : 3} className="text-center py-12 text-sm text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
                      <span>Loading employees...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{emp.name}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.role}</td>
                    {activeTab === "archived" && (
                      <td className="px-6 py-4 text-gray-600 max-w-xs">
                        <p className="max-w-[280px] break-words text-[13px] leading-5 text-slate-600" title={emp.archive_reason}>
                          {emp.archive_reason || "No archive reason recorded."}
                        </p>
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {activeTab === "active" ? (
                          <>
                            <button
                              onClick={() => handleOpenEdit(emp)}
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
                ))
              )}

              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={activeTab === "archived" ? 4 : 3} className="text-center py-12 text-sm text-gray-400">
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
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} employees
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
                    <h3 className="font-bold text-gray-900 text-base">Add Branch Employee</h3>
                    <p className="text-xs text-gray-500">Assign new staff to {branch.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="space-y-3">
                {addError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}

                {/* First Name & Middle Initial */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Juan"
                      value={newEmp.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                        fieldErrors.first_name
                          ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                          : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                      }`}
                    />
                    {fieldErrors.first_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Middle Initial
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. D"
                      value={newEmp.middle_initial}
                      onChange={(e) => handleInputChange("middle_initial", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* Last Name & Suffix */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dela Cruz"
                      value={newEmp.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                        fieldErrors.last_name
                          ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                          : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                      }`}
                    />
                    {fieldErrors.last_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.last_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Suffix
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="e.g. Jr."
                      value={newEmp.suffix}
                      onChange={(e) => handleInputChange("suffix", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* Employee Role */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Employee Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => handleInputChange("role", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-gray-700"
                  >
                    <option value="Driver">Driver</option>
                    <option value="Finance">Finance</option>
                    <option value="Fulfillment & Logistics">Fulfillment &amp; Logistics</option>
                    <option value="Encoder">Encoder</option>
                    <option value="Procurement">Procurement</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. employee@grainrise.com"
                    value={newEmp.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                      fieldErrors.email
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Contact Phone <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400">09XXXXXXXXX or +639XXXXXXXXX</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 09123456789 or +639123456789"
                    value={newEmp.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    onBlur={() => handleBlur("phone")}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                      fieldErrors.phone
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={newEmp.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        onBlur={() => handleBlur("password")}
                        className={`w-full px-3 py-2 pr-9 border rounded-xl text-sm outline-none transition ${
                          fieldErrors.password
                            ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={newEmp.confirm_password}
                        onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                        onBlur={() => handleBlur("confirm_password")}
                        className={`w-full px-3 py-2 pr-9 border rounded-xl text-sm outline-none transition ${
                          fieldErrors.confirm_password
                            ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {fieldErrors.confirm_password && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.confirm_password}</p>
                    )}
                  </div>
                </div>

                {/* Password Requirements hint */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                  <span className="font-semibold block text-slate-700">Password requirements:</span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                    <span className={newEmp.password.length >= 8 ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      • At least 8 characters
                    </span>
                    <span className={/[A-Z]/.test(newEmp.password) ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      • 1 uppercase letter
                    </span>
                    <span className={/[a-z]/.test(newEmp.password) ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      • 1 lowercase letter
                    </span>
                    <span className={/[0-9]/.test(newEmp.password) ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      • 1 number
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCloseAddModal}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      "Save Employee"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Employee Modal */}
      {showEditModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Pencil size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Edit Branch Employee</h3>
                    <p className="text-xs text-gray-500">Update staff details for {branch.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateEmployee} className="space-y-3">
                {editError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* First Name & Middle Initial */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Juan"
                      value={editEmp.first_name}
                      onChange={(e) => handleEditInputChange("first_name", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                        editFieldErrors.first_name
                          ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                          : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                      }`}
                    />
                    {editFieldErrors.first_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Middle Initial
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. D"
                      value={editEmp.middle_initial}
                      onChange={(e) => handleEditInputChange("middle_initial", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* Last Name & Suffix */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dela Cruz"
                      value={editEmp.last_name}
                      onChange={(e) => handleEditInputChange("last_name", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                        editFieldErrors.last_name
                          ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                          : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                      }`}
                    />
                    {editFieldErrors.last_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.last_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Suffix
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder="e.g. Jr."
                      value={editEmp.suffix}
                      onChange={(e) => handleEditInputChange("suffix", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* Employee Role */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Employee Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editEmp.role}
                    onChange={(e) => handleEditInputChange("role", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-gray-700"
                  >
                    <option value="Driver">Driver</option>
                    <option value="Finance">Finance</option>
                    <option value="Fulfillment & Logistics">Fulfillment &amp; Logistics</option>
                    <option value="Encoder">Encoder</option>
                    <option value="Procurement">Procurement</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. employee@grainrise.com"
                    value={editEmp.email}
                    onChange={(e) => handleEditInputChange("email", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                      editFieldErrors.email
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                      }`}
                  />
                  {editFieldErrors.email && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.email}</p>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Contact Phone <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400">09XXXXXXXXX or +639XXXXXXXXX</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 09123456789 or +639123456789"
                    value={editEmp.phone}
                    onChange={(e) => handleEditInputChange("phone", e.target.value)}
                    onBlur={() => handleEditBlur("phone")}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                      editFieldErrors.phone
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  />
                  {editFieldErrors.phone && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.phone}</p>
                  )}
                </div>

                {/* Password & Confirm Password (optional during edit) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Password <span className="text-xs text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        placeholder="Leave blank to keep current"
                        value={editEmp.password}
                        onChange={(e) => handleEditInputChange("password", e.target.value)}
                        onBlur={() => handleEditBlur("password")}
                        className={`w-full px-3 py-2 pr-9 border rounded-xl text-sm outline-none transition ${
                          editFieldErrors.password
                            ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                      >
                        {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {editFieldErrors.password && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showEditConfirmPassword ? "text" : "password"}
                        placeholder="Leave blank to keep current"
                        value={editEmp.confirm_password}
                        onChange={(e) => handleEditInputChange("confirm_password", e.target.value)}
                        onBlur={() => handleEditBlur("confirm_password")}
                        className={`w-full px-3 py-2 pr-9 border rounded-xl text-sm outline-none transition ${
                          editFieldErrors.confirm_password
                            ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditConfirmPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                      >
                        {showEditConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {editFieldErrors.confirm_password && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{editFieldErrors.confirm_password}</p>
                    )}
                  </div>
                </div>

                {/* Password Requirements hint */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                  <span className="font-semibold block text-slate-700">
                    Password requirements (only if changing password):
                  </span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                    <span className={editEmp.password.length >= 8 ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      • At least 8 characters
                    </span>
                    <span className={/[A-Z]/.test(editEmp.password) ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      • 1 uppercase letter
                    </span>
                    <span className={/[a-z]/.test(editEmp.password) ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      • 1 lowercase letter
                    </span>
                    <span className={/[0-9]/.test(editEmp.password) ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                      • 1 number
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCloseEditModal}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
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

      {/* Confirmation Modals */}
      <ArchiveAccountModal
        isOpen={modalState.type === "archive"}
        onClose={() => setModalState({ type: null, employee: null })}
        accountName={modalState.employee?.name || "Employee"}
        accountType="Employee"
        onArchive={handleArchive}
        isArchiving={submitting}
      />
      <RestoreProductModal
        isOpen={modalState.type === "restore"}
        onClose={() => setModalState({ type: null, employee: null })}
        productName={modalState.employee?.name || "Employee"}
        onRestore={handleRestore}
        isLoading={submitting}
      />
      <DeleteProductModal
        isOpen={modalState.type === "delete"}
        onClose={() => setModalState({ type: null, employee: null })}
        productName={modalState.employee?.name || "Employee"}
        onDelete={handleDeletePermanent}
        isLoading={submitting}
      />
    </div>
  );
}
