import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Users,
  Eye,
  EyeOff,
  Archive,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

function ModalDetailRow({ label, value, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words max-w-[65%]">
          {value || "—"}
        </span>
      )}
    </div>
  );
}

const CANONICAL_POSITIONS = {
  encoder: "Encoder",
  procurement: "Procurement",
  finance: "Finance",
  seller: "Seller",
  fulfillment_logistics_coordinator: "Fulfillment Logistics Coordinator",
  driver: "Driver",
  branch_manager: "Branch Manager",
};

export function formatPosition(pos) {
  if (!pos) return "";
  const key = String(pos).trim().toLowerCase();
  if (CANONICAL_POSITIONS[key]) {
    return CANONICAL_POSITIONS[key];
  }
  return String(pos)
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function StatusBadge({ status }) {
  const isArchived = status === "archived";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
        isArchived
          ? "bg-slate-100 text-slate-600 border border-slate-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isArchived ? "bg-slate-400" : "bg-emerald-600"
        }`}
      />
      {status || "Active"}
    </span>
  );
}

function VerificationBadge({ status }) {
  const norm = (status || "").toLowerCase();
  let style = "bg-slate-100 text-slate-600 border-slate-200";
  if (norm === "verified") {
    style = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (norm === "pending") {
    style = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (norm === "failed") {
    style = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (norm === "unverified") {
    style = "bg-slate-100 text-slate-600 border-slate-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${style}`}
    >
      {status || "Unverified"}
    </span>
  );
}

export default function ViewEmployeeAccountModal({
  isOpen,
  onClose,
  account,
  onRequestReveal,
  onOpenArchive,
  onOpenRestore,
  revealedAccountNumber,
  onHideAccountNumber,
}) {
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !account) return null;

  const isArchived = account.is_archived || account.status === "archived";
  const displayAccountNumber =
    revealedAccountNumber || account.account_number_masked || account.account_number;
  const isRevealed = Boolean(revealedAccountNumber);

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Matching Order Approval View Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {account.employee_name || "Employee Account Details"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {account.branch_name || "—"}
              </p>
            </div>
          </div>
          {/* X Button: Only dismissal control */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close details"
            title="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Details Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4">
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Employee Account Information
            </div>

            <ModalDetailRow
              label="Position / Role"
              value={formatPosition(account.employee_position) || "Staff"}
            />
            <ModalDetailRow label="Account Type">
              <span className="capitalize font-semibold text-slate-800">
                {account.account_type || account.type || "Bank"}
              </span>
            </ModalDetailRow>
            <ModalDetailRow label="Account Status">
              <StatusBadge status={account.status} />
            </ModalDetailRow>
            <ModalDetailRow label="Verification Status">
              <VerificationBadge status={account.verification_status} />
            </ModalDetailRow>
            <ModalDetailRow label="Account Name" value={account.account_name} />

            {/* Account Number with Reveal */}
            <ModalDetailRow label="Account Number">
              <div className="flex items-center justify-end gap-2">
                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                  {displayAccountNumber}
                </span>
                {isRevealed ? (
                  <button
                    type="button"
                    onClick={onHideAccountNumber}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
                    title="Hide Account Number"
                  >
                    <EyeOff size={14} />
                    <span>Hide</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRequestReveal(account)}
                    className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
                    title="Reveal Account Number"
                  >
                    <Eye size={14} />
                    <span>Reveal</span>
                  </button>
                )}
              </div>
            </ModalDetailRow>

            {(account.account_type === "bank" || account.type === "bank") && (
              <>
                <ModalDetailRow label="Bank Name" value={account.bank_name || account.platform_name} />
                {account.card_type && (
                  <ModalDetailRow label="Card / Account Type" value={account.card_type} />
                )}
              </>
            )}

            <ModalDetailRow label="Date Added" value={account.created_at_formatted || account.created_at} />

            {isArchived && account.archive_reason && (
              <div className="pt-2">
                <span className="text-slate-500 font-medium text-xs block mb-1">
                  Archive Reason:
                </span>
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                  {account.archive_reason}
                </p>
              </div>
            )}
          </div>

          {/* Destination Lockdown Notice */}
          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-500 flex items-start gap-2">
            <span className="text-slate-400 font-bold">ℹ</span>
            <span>
              Employee payment destination details are set by the employee and cannot be
              modified by branch management.
            </span>
          </div>
        </div>

        {/* Footer Actions - Order Approval style, no Close button */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-start bg-white shrink-0">
          <div>
            {!isArchived ? (
              <button
                type="button"
                onClick={() => onOpenArchive(account)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Archive size={14} />
                <span>Archive Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenRestore(account)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Restore Account</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

