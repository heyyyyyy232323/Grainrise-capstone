import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Info,
} from "lucide-react";
import useApi from "../../../../Components/hooks/useApi";

const PHILIPPINE_BANKS = [
  "BDO Unibank",
  "Bank of the Philippine Islands (BPI)",
  "Metrobank",
  "Land Bank of the Philippines",
  "Philippine National Bank (PNB)",
  "Security Bank",
  "UnionBank of the Philippines",
  "RCBC",
  "China Banking Corporation (China Bank)",
  "EastWest Bank",
  "Asia United Bank (AUB)",
  "Development Bank of the Philippines (DBP)",
  "Other Bank",
];

const CARD_TYPES = [
  "Debit Card",
  "Savings Account",
  "Checking Account",
];

export default function EditBranchAccountModal({
  isOpen,
  onClose,
  account,
  authToken,
  onSaveSuccess,
}) {
  const { request } = useApi();

  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [cardType, setCardType] = useState("Debit Card");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize fields
  useEffect(() => {
    if (isOpen && account) {
      setAccountName(account.account_name || "");
      setAccountNumber("");
      const isKnownBank = PHILIPPINE_BANKS.includes(account.bank_name);
      if (account.bank_name) {
        if (isKnownBank) {
          setBankName(account.bank_name);
          setCustomBankName("");
        } else {
          setBankName("Other Bank");
          setCustomBankName(account.bank_name);
        }
      } else {
        setBankName(PHILIPPINE_BANKS[0]);
        setCustomBankName("");
      }
      setCardType(account.card_type || "Debit Card");
      setErrorMessage("");
      setIsDuplicate(false);
      setIsCheckingDuplicate(false);

      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, account]);

  // Real-time check when complete account number is entered during edit
  useEffect(() => {
    let isMounted = true;
    const cleanNum =
      account?.account_type === "gcash"
        ? accountNumber.replace(/\D/g, "")
        : accountNumber.replace(/[\s\-\.]/g, "");

    if (!cleanNum) {
      setIsDuplicate(false);
      setErrorMessage((prev) =>
        prev === "This payment account is already registered in GRAINRISE." ? "" : prev
      );
      return;
    }

    const effectiveBankName =
      account?.account_type === "bank"
        ? bankName === "Other Bank"
          ? customBankName.trim()
          : bankName
        : null;

    const isComplete =
      account?.account_type === "gcash"
        ? cleanNum.length === 11 && cleanNum.startsWith("09")
        : cleanNum.length >= 6 && Boolean(effectiveBankName);

    if (!isComplete) {
      setIsDuplicate(false);
      setErrorMessage((prev) =>
        prev === "This payment account is already registered in GRAINRISE." ? "" : prev
      );
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await request("/miller/payment-accounts/branches/check-duplicate/", {
          method: "POST",
          body: {
            account_type: account?.account_type,
            account_number: cleanNum,
            bank_name: effectiveBankName,
            exclude_id: account?.id,
          },
        });

        if (!isMounted) return;

        if (res && res.is_duplicate) {
          setIsDuplicate(true);
          setErrorMessage("This payment account is already registered in GRAINRISE.");
        } else {
          setIsDuplicate(false);
          setErrorMessage((prev) =>
            prev === "This payment account is already registered in GRAINRISE." ? "" : prev
          );
        }
      } catch (err) {
        console.error("Duplicate check error:", err);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [account, accountNumber, bankName, customBankName, request]);

  if (!isOpen || !account) return null;

  const handleResetToInitial = () => {
    setAccountName(account.account_name || "");
    setAccountNumber("");
    const isKnownBank = PHILIPPINE_BANKS.includes(account.bank_name);
    if (account.bank_name) {
      if (isKnownBank) {
        setBankName(account.bank_name);
        setCustomBankName("");
      } else {
        setBankName("Other Bank");
        setCustomBankName(account.bank_name);
      }
    }
    setCardType(account.card_type || "Debit Card");
    setErrorMessage("");
    setIsDuplicate(false);
    setIsCheckingDuplicate(false);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    if (!accountName.trim()) {
      setErrorMessage("Please enter the registered account holder name.");
      return;
    }

    if (accountName.trim().length > 60) {
      setErrorMessage("Account Name cannot exceed 60 characters.");
      return;
    }

    const cleanNum =
      account.account_type === "gcash"
        ? accountNumber.replace(/\D/g, "")
        : accountNumber.replace(/[\s\-\.]/g, "");

    if (cleanNum) {
      if (account.account_type === "gcash") {
        if (!/^09\d{9}$/.test(cleanNum)) {
          setErrorMessage("GCash number must be exactly 11 numeric digits starting with 09 (e.g. 09171234567).");
          return;
        }
      } else {
        if (cleanNum.length < 6 || cleanNum.length > 30) {
          setErrorMessage("Bank account number must be between 6 and 30 characters.");
          return;
        }
      }
    }

    const effectiveBankName =
      account.account_type === "bank"
        ? bankName === "Other Bank"
          ? customBankName.trim()
          : bankName
        : null;

    // Check duplicate on save button click if account number provided
    if (cleanNum) {
      setIsCheckingDuplicate(true);
      try {
        const checkRes = await request("/miller/payment-accounts/branches/check-duplicate/", {
          method: "POST",
          body: {
            account_type: account.account_type,
            account_number: cleanNum,
            bank_name: effectiveBankName,
            exclude_id: account.id,
          },
        });

        if (checkRes && checkRes.is_duplicate) {
          setIsDuplicate(true);
          setErrorMessage("This payment account is already registered in GRAINRISE.");
          setIsCheckingDuplicate(false);
          return;
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }

    const payload = {
      auth_token: authToken,
      account_name: accountName.trim(),
      account_number: cleanNum || undefined,
      bank_name: effectiveBankName || undefined,
      card_type: account.account_type === "bank" ? cardType : undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await request(`/miller/payment-accounts/branches/${account.id}/`, {
        method: "PUT",
        body: payload,
      });

      if (res && (res.success || res.ok)) {
        if (onSaveSuccess) onSaveSuccess(res.data);
        onClose();
      } else {
        const errorMsg =
          res?.data?.message ||
          res?.message ||
          res?.error ||
          "Failed to update payment account.";
        setErrorMessage(errorMsg);
      }
    } catch (err) {
      console.error("Update account failed:", err);
      const msg = err?.data?.message || err?.message || "Failed to update payment account.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Edit2 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Edit Branch Payment Account
              </h2>
              <p className="text-xs text-slate-500 font-medium">{account.branch_name}</p>
            </div>
          </div>
          {/* X button returns to View modal */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
            title="Return to details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto max-h-[calc(90vh-75px)]">
          {/* Warning Notice about Status Reset */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
            <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-900">
                Security Notice
              </span>
              Modifying identifying account details will reset the account's verification
              status to <b>Unverified</b> until re-reviewed.
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl flex items-start gap-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-800">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Holder Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountName}
              maxLength={60}
              onChange={(e) => {
                setAccountName(e.target.value.slice(0, 60));
                setErrorMessage("");
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
            <p className="text-right text-[11px] text-slate-400 mt-1">
              {(accountName || "").length}/60
            </p>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Update Account / Mobile Number
            </label>
            <input
              type="text"
              value={accountNumber}
              maxLength={account.account_type === "gcash" ? 11 : 30}
              inputMode={account.account_type === "gcash" ? "numeric" : "text"}
              onChange={(e) => {
                let val = e.target.value;
                if (account.account_type === "gcash") {
                  val = val.replace(/\D/g, "").slice(0, 11);
                }
                setAccountNumber(val);
                setErrorMessage("");
              }}
              placeholder={`Current: ${account.account_number_masked || "••••••••"} (Leave blank to keep)`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-mono"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-slate-400">
                Leave blank if you do not wish to change the account number.
              </p>
              <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                {(accountNumber || "").length}/{account.account_type === "gcash" ? 11 : 30}
              </span>
            </div>
          </div>

          {/* Bank fields */}
          {account.account_type === "bank" && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                  {PHILIPPINE_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {bankName === "Other Bank" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specify Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customBankName}
                    maxLength={100}
                    onChange={(e) => setCustomBankName(e.target.value.slice(0, 100))}
                    placeholder="Enter official bank name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  />
                  <p className="text-right text-[11px] text-slate-400 mt-1">
                    {(customBankName || "").length}/100
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Card / Account Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                  {CARD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToInitial}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isCheckingDuplicate || isDuplicate}
              className="px-6 py-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isSubmitting || isCheckingDuplicate ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isCheckingDuplicate ? "Checking..." : "Saving Changes..."}</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

