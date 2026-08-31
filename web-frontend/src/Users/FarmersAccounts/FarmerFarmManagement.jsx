import { useState } from "react";
import { Leaf, Map, Droplets, Sun, Edit2, Plus, Trash2, TrendingUp } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../Components/Graphs/KPICard";

const kpiMetrics = [
  { title: "TOTAL FARM AREA", value: "12.5 ha", footer: "Registered harvest area", tone: "success", icon: <Map size={18} strokeWidth={2.2} /> },
  { title: "ACTIVE PLOTS", value: "4", footer: "Currently planted plots", tone: "neutral", icon: <Leaf size={18} strokeWidth={2.2} /> },
  { title: "IRRIGATION STATUS", value: "Good", footer: "All systems operational", tone: "success", icon: <Droplets size={18} strokeWidth={2.2} /> },
  { title: "NEXT HARVEST", value: "~38 days", footer: "Estimated from planting date", tone: "warning", icon: <Sun size={18} strokeWidth={2.2} /> },
];

const MOCK_PLOTS = [
  { id: 1, name: "Plot A", area: "3.2 ha", variety: "NSIC Rc222 (Tubigan 18)", status: "Growing", plantedDate: "Jul 1, 2026", expectedHarvest: "Oct 8, 2026", soil: "Clay Loam", irrigationType: "Rainfed", progress: 72 },
  { id: 2, name: "Plot B", area: "2.8 ha", variety: "NSIC Rc160 (Japonica)", status: "Harvested", plantedDate: "Mar 15, 2026", expectedHarvest: "Jun 25, 2026", soil: "Sandy Loam", irrigationType: "Pump Irrigation", progress: 100 },
  { id: 3, name: "Plot C", area: "4.0 ha", variety: "NSIC Rc238 (Mestiso 38)", status: "Growing", plantedDate: "Jul 20, 2026", expectedHarvest: "Oct 28, 2026", soil: "Clay", irrigationType: "Canal Irrigation", progress: 45 },
  { id: 4, name: "Plot D", area: "2.5 ha", variety: "NSIC Rc222 (Tubigan 18)", status: "Fallow", plantedDate: "—", expectedHarvest: "—", soil: "Clay Loam", irrigationType: "Rainfed", progress: 0 },
];

const statusColor = {
  Growing: "bg-green-100 text-green-700",
  Harvested: "bg-blue-100 text-blue-700",
  Fallow: "bg-gray-100 text-gray-500",
};

export default function FarmerFarmManagement() {
  const [plots, setPlots] = useState(MOCK_PLOTS);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Farm" }, { label: "Farm Management" }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            Farm Management
          </h2>
          <p className="text-sm text-slate-500">
            Monitor and manage your registered plots, crop cycles, and farm details.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors self-start"
        >
          <Plus size={16} /> Add Plot
        </button>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((m) => <KPICard key={m.title} {...m} />)}
      </div>

      {/* ── Plot list ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {plots.map((plot) => (
          <div key={plot.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 hover:border-green-300 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-gray-900 text-lg">{plot.name}</h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusColor[plot.status]}`}>
                    {plot.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-600">
                  <span><span className="font-medium text-gray-800">Area:</span> {plot.area}</span>
                  <span><span className="font-medium text-gray-800">Variety:</span> {plot.variety}</span>
                  <span><span className="font-medium text-gray-800">Soil:</span> {plot.soil}</span>
                  <span><span className="font-medium text-gray-800">Planted:</span> {plot.plantedDate}</span>
                  <span><span className="font-medium text-gray-800">Harvest:</span> {plot.expectedHarvest}</span>
                  <span><span className="font-medium text-gray-800">Irrigation:</span> {plot.irrigationType}</span>
                </div>
              </div>

              {/* Right: progress + actions */}
              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-green-700 hover:border-green-300 transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => setPlots((p) => p.filter((pl) => pl.id !== plot.id))}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {plot.status === "Growing" && (
                  <div className="w-40">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="flex items-center gap-1"><TrendingUp size={11} /> Growth</span>
                      <span className="font-semibold text-green-700">{plot.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full transition-all duration-500"
                        style={{ width: `${plot.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add Plot Modal (simple inline) ───────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Add New Plot</h3>
            <div className="space-y-3">
              {["Plot Name", "Area (ha)", "Variety", "Soil Type", "Irrigation Type"].map((field) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{field}</label>
                  <input
                    type="text"
                    placeholder={`Enter ${field.toLowerCase()}`}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Save Plot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
