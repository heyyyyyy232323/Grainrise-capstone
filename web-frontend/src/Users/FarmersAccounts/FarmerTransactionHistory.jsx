import { useState } from "react";
import { Search, Download, TrendingUp, TrendingDown, Minus as MinusIcon, ReceiptText } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../Components/Graphs/KPICard";
import StatusBadge from "../../Components/Minor-Components/StatusBadge";

const kpiMetrics = [
  { title: "TOTAL REVENUE", value: "₱184,500", footer: "This month", tone: "success", icon: <TrendingUp size={18} strokeWidth={2.2} /> },
  { title: "TOTAL EXPENSES", value: "₱42,800", footer: "Inputs & logistics", tone: "danger", icon: <TrendingDown size={18} strokeWidth={2.2} /> },
  { title: "NET INCOME", value: "₱141,700", footer: "This month", tone: "success", icon: <ReceiptText size={18} strokeWidth={2.2} /> },
  { title: "TRANSACTIONS", value: "38", footer: "Completed this month", tone: "neutral", icon: <MinusIcon size={18} strokeWidth={2.2} /> },
];

const MOCK_TRANSACTIONS = [
  { id: "TXN-0041", date: "Aug 29, 2026", buyer: "Juan Dela Cruz", type: "Sale", product: "Sinandomeng Rice", qty: "5 sacks (250 kg)", amount: 12000, payment: "Cash", status: "Completed" },
  { id: "TXN-0040", date: "Aug 28, 2026", buyer: "Maria Santos", type: "Sale", product: "Dinorado Rice", qty: "3 sacks (150 kg)", amount: 7950, payment: "Card", status: "Completed" },
  { id: "TXN-0039", date: "Aug 27, 2026", buyer: "AgriMart Bulacan", type: "Sale", product: "RC222 Palay", qty: "10 sacks (500 kg)", amount: 9500, payment: "Cash", status: "Completed" },
  { id: "TXN-0038", date: "Aug 26, 2026", buyer: "NFA Warehouse", type: "Sale", product: "Jasmine Rice", qty: "20 sacks (1,000 kg)", amount: 44000, payment: "Transfer", status: "Completed" },
  { id: "TXN-0037", date: "Aug 24, 2026", buyer: "Fertilizer Depot", type: "Expense", product: "Urea Fertilizer", qty: "4 bags", amount: 3200, payment: "Cash", status: "Completed" },
  { id: "TXN-0036", date: "Aug 22, 2026", buyer: "Transport Co.", type: "Expense", product: "Delivery Logistics", qty: "1 trip", amount: 1800, payment: "Cash", status: "Completed" },
  { id: "TXN-0035", date: "Aug 20, 2026", buyer: "Pedro Reyes", type: "Sale", product: "Sinandomeng Rice", qty: "8 sacks (400 kg)", amount: 19200, payment: "Card", status: "Pending" },
];

export default function FarmerTransactionHistory() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const filtered = MOCK_TRANSACTIONS.filter((t) => {
    const matchSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.buyer.toLowerCase().includes(search.toLowerCase()) ||
      t.product.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Business" }, { label: "Transaction History" }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            Transaction History
          </h2>
          <p className="text-sm text-slate-500">
            Complete record of your sales, expenses, and financial activity.
          </p>
        </div>
        <button className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors self-start">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((m) => <KPICard key={m.title} {...m} />)}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, buyer, or product..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {["All", "Sale", "Expense"].map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                typeFilter === f
                  ? "bg-green-700 text-white border-green-700"
                  : "border-gray-200 text-gray-600 hover:border-green-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-slate-200">
              <tr>
                {["Transaction ID", "Date", "Buyer / Payee", "Type", "Product", "Qty", "Amount", "Payment", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-5 py-3.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-green-700 font-semibold text-xs">{t.id}</td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{t.date}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{t.buyer}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      t.type === "Sale" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{t.product}</td>
                  <td className="px-5 py-3.5 text-gray-600">{t.qty}</td>
                  <td className={`px-5 py-3.5 font-bold ${t.type === "Sale" ? "text-green-700" : "text-red-500"}`}>
                    {t.type === "Sale" ? "+" : "-"}₱{t.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{t.payment}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
          <p className="text-sm text-gray-500">Showing {filtered.length} of {MOCK_TRANSACTIONS.length} records</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 text-gray-400 rounded-lg text-sm cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 bg-green-700 text-white font-medium rounded-lg text-sm">1</button>
            <button className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm transition">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
