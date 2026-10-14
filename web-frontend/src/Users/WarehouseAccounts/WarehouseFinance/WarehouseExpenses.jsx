import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import { Receipt } from "lucide-react";

export default function WarehouseExpenses() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Finance", path: "/warehouse-finance/dashboard" },
          { label: "Expenses" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Expenses</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track and manage business operational expenses and disbursements.
        </p>
      </div>

      <div className="w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white p-8 sm:p-14 shadow-[0_6px_18px_rgba(15,23,42,0.06)] flex flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B5D1E]">
          <Receipt className="h-8 w-8 text-[#0B5D1E]" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#0B5D1E] border border-emerald-200/60 mb-3">
          Under Development
        </span>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Expenses Management — Coming Soon
        </h2>

        <p className="mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
          The expenses tracking and management module is currently being developed. You will soon be able to record, review, and organize business expenses and disbursements here.
        </p>
      </div>
    </div>
  );
}

