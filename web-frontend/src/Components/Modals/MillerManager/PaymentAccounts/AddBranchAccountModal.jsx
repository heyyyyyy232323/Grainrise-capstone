import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Building2, CreditCard, Smartphone, AlertCircle, Loader2 } from "lucide-react";
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

export default function AddBranchAccountModal({
  isOpen,
  onClose,
  branches = [],
  onProceedToVerification,
}) {
  const { request } = useApi();

  const [branchId, setBranchId] = useState("");
  const [accountType, setAccountType] = useState("bank"); // 'bank' | 'gcash'
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [cardType, setCardType] = useState("Debit Card");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBranchId(
        branches.length > 0
          ? String(branches[0].id ?? branches[0].supplier_profile_id ?? "")
          : ""
      );
      setAccountType("bank");
      setAccountName("");
      setAccountNumber("");
      setBankName(PHILIPPINE_BANKS[0]);
      setCustomBankName("");
      setCardType("Debit Card");
      setErrorMessage("");
      setIsCheckingDuplicate(false);
      setIsDuplicate(false);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, branches]);

  // Real-time check when complete account number is entered
  useEffect(() => {
    let isMounted = true;
    const cleanNum =
      accountType === "gcash"
        ? accountNumber.replace(/\D/g, "")
        : accountNumber.replace(/[\s\-\.]/g, "");

    const effectiveBankName =
      accountType === "bank"
        ? bankName === "Other Bank"
          ? customBankName.trim()
          : bankName
        : null;

    const isComplete =
      accountType === "gcash"
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
            account_type: accountType,
            account_number: cleanNum,
            bank_name: effectiveBankName,
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
  }, [accountType, accountNumber, bankName, customBankName, request]);

  if (!isOpen) return null;

  const handleClear = () => {
    setAccountName("");
    setAccountNumber("");
    setCustomBankName("");
    setErrorMessage("");
    setIsDuplicate(false);
  };

  const handleProceed = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    if (!branchId) {
      setErrorMessage("Please select a branch.");
      return;
    }

    if (!accountName.trim()) {
      setErrorMessage("Please enter the registered account holder name.");
      return;
    }

    if (accountName.trim().length > 60) {
      setErrorMessage("Account Name cannot exceed 60 characters.");
      return;
    }

    if (!accountNumber.trim()) {
      setErrorMessage("Please enter the account or mobile number.");
      return;
    }

    const cleanNum =
      accountType === "gcash"
        ? accountNumber.replace(/\D/g, "")
        : accountNumber.replace(/[\s\-\.]/g, "");

    if (accountType === "gcash") {
      if (!/^09\d{9}$/.test(cleanNum)) {
        setErrorMessage("GCash number must be exactly 11 numeric digits starting with 09 (e.g. 09171234567).");
        return;
      }
    } else {
      if (cleanNum.length < 6 || cleanNum.length > 30) {
        setErrorMessage("Bank account number must be between 6 and 30 characters.");
        return;
      }
      if (!bankName) {
        setErrorMessage("Please select or enter the bank name.");
        return;
      }
      if (bankName === "Other Bank" && !customBankName.trim()) {
        setErrorMessage("Please specify the bank name.");
        return;
      }
    }

    const effectiveBankName =
      accountType === "bank"
        ? bankName === "Other Bank"
          ? customBankName.trim()
          : bankName
        : null;

    // Check duplicate again on button click before Proceed to Verification
    setIsCheckingDuplicate(true);
    try {
      const checkRes = await request("/miller/payment-accounts/branches/check-duplicate/", {
        method: "POST",
        body: {
          account_type: accountType,
          account_number: cleanNum,
          bank_name: effectiveBankName,
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

    const payload = {
      supplier_profile_id: parseInt(branchId, 10),
      account_type: accountType,
      account_name: accountName.trim(),
      account_number: cleanNum,
      bank_name: effectiveBankName,
      card_type: accountType === "bank" ? cardType : null,
    };

    onProceedToVerification(payload);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Add Branch Payment Account
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleProceed} className="p-6 space-y-4 overflow-y-auto">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Branch Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Branch <span className="text-rose-500">*</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            >
              {branches.map((b) => {
                const bId = b.id ?? b.supplier_profile_id;
                const bName = b.branch_name ?? b.business_name ?? `Branch #${bId}`;
                return (
                  <option key={bId} value={bId}>
                    {bName} {b.branch_code ? `(${b.branch_code})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Account Type Selector (GCash / Bank) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("bank")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  accountType === "bank"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <CreditCard size={16} />
                <span>Bank Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountType("gcash");
                  setAccountNumber((prev) => prev.replace(/\D/g, "").slice(0, 11));
                  setErrorMessage("");
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  accountType === "gcash"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <Smartphone size={16} />
                <span>GCash</span>
              </button>
            </div>
          </div>

          {/* Bank-specific Fields */}
          {accountType === "bank" && (
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

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountName}
              maxLength={60}
              onChange={(e) => {
                setAccountName(e.target.value.slice(0, 60));
                setErrorMessage("");
              }}
              placeholder={
                accountType === "gcash"
                  ? "e.g. Juan Dela Cruz"
                  : "e.g. Grainrise Milling Corp. / Juan Dela Cruz"
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
            <p className="text-right text-[11px] text-slate-400 mt-1">
              {(accountName || "").length}/60
            </p>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {accountType === "gcash" ? "GCash Mobile Number" : "Bank Account Number"}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountNumber}
              maxLength={accountType === "gcash" ? 11 : 30}
              inputMode={accountType === "gcash" ? "numeric" : "text"}
              onChange={(e) => {
                let val = e.target.value;
                if (accountType === "gcash") {
                  val = val.replace(/\D/g, "").slice(0, 11);
                }
                setAccountNumber(val);
                setErrorMessage("");
              }}
              placeholder={accountType === "gcash" ? "09XXXXXXXXX" : "e.g. 1234567890"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-mono"
            />
            <p className="text-right text-[11px] text-slate-400 mt-1">
              {(accountNumber || "").length}/{accountType === "gcash" ? 11 : 30}
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={isCheckingDuplicate || isDuplicate}
              className="px-6 py-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isCheckingDuplicate ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <span>Proceed to Verification</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

