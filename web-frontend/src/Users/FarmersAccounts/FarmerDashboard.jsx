import { CalendarDays, Warehouse, FileText, Leaf, Map } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../Components/Graphs/KPICard";

const kpiMetrics = [
  {
    title: "AVAILABLE MILLERS",
    value: "24",
    footer: "Millers available in the system",
    tone: "success",
    icon: <Warehouse size={18} strokeWidth={2.2} />,
  },
  {
    title: "CONTRACTED MILLERS",
    value: "8",
    footer: "Millers with active contracts",
    tone: "neutral",
    icon: <FileText size={18} strokeWidth={2.2} />,
  },
  {
    title: "REGISTERED HARVEST AREA",
    value: "12.5 ha",
    footer: "Registered farm area",
    tone: "success",
    icon: <Leaf size={18} strokeWidth={2.2} />,
  },
  {
    title: "POTENTIAL CROPPING AREA",
    value: "18.2 ha",
    footer: "Total area available for cropping",
    tone: "warning",
    icon: <Map size={18} strokeWidth={2.2} />,
  },
];

const now = new Date("2026-07-19T10:42:00");
const formattedDate = now.toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const formattedTime = now.toLocaleTimeString("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default function FarmerDashboard() {
  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Last Updated: Today · {formattedTime}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
          <CalendarDays size={16} className="text-slate-500" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      {/* ── Charts Row 1 ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Palay Market Price Trend */}
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 text-lg">Palay Market Price Trend</h3>
          <p className="text-xs text-gray-500 mb-6">Historical Buying Price (₱/kg)</p>
          <div className="w-full h-48 relative">
            <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="gradientLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F9D2A" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#0F9D2A" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {/* Y Axis */}
              <text x="0" y="20" className="text-[9px] fill-gray-400">₱30/kg</text>
              <text x="0" y="75" className="text-[9px] fill-gray-400">₱25/kg</text>
              <text x="0" y="130" className="text-[9px] fill-gray-400">0</text>
              
              {/* Chart Line */}
              <path d="M 40,100 Q 80,40 120,45 T 200,75 T 280,60 T 360,20" fill="url(#gradientLine)" />
              <path d="M 40,100 Q 80,40 120,45 T 200,75 T 280,60 T 360,20" fill="none" stroke="#0F9D2A" strokeWidth="2" />
              
              {/* Tooltip nodes */}
              <circle cx="120" cy="45" r="4" fill="white" stroke="#0F9D2A" strokeWidth="2" />
              <circle cx="280" cy="60" r="4" fill="white" stroke="#0F9D2A" strokeWidth="2" />
              <circle cx="360" cy="20" r="4" fill="white" stroke="#0F9D2A" strokeWidth="2" />

              {/* X Axis */}
              <text x="40" y="145" className="text-[9px] fill-gray-400 text-center" textAnchor="middle">January</text>
              <text x="120" y="145" className="text-[9px] fill-gray-400 text-center" textAnchor="middle">February</text>
              <text x="200" y="145" className="text-[9px] fill-gray-400 text-center" textAnchor="middle">March</text>
              <text x="280" y="145" className="text-[9px] fill-gray-400 text-center" textAnchor="middle">April</text>
              <text x="360" y="145" className="text-[9px] fill-gray-400 text-center" textAnchor="middle">May</text>
            </svg>
          </div>
        </div>

        {/* Harvest & Yield History */}
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 text-lg">Harvest & Yield History</h3>
          <p className="text-xs text-gray-500 mb-6">Yield (kg) per Cycle</p>
          <div className="w-full h-48 relative">
            <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible">
              {/* Y Axis */}
              <text x="0" y="10" className="text-[9px] fill-gray-400">25kg</text>
              <text x="0" y="40" className="text-[9px] fill-gray-400">20kg</text>
              <text x="0" y="70" className="text-[9px] fill-gray-400">15kg</text>
              <text x="0" y="100" className="text-[9px] fill-gray-400">10kg</text>
              <text x="0" y="130" className="text-[9px] fill-gray-400">0kg</text>

              {/* Bar background (gray) */}
              <rect x="50" y="10" width="40" height="120" fill="#F8FAFC" />
              <rect x="130" y="10" width="40" height="120" fill="#F8FAFC" />
              <rect x="210" y="10" width="40" height="120" fill="#F8FAFC" />
              <rect x="290" y="10" width="40" height="120" fill="#F8FAFC" />

              {/* Green Bars */}
              <rect x="50" y="30" width="40" height="100" fill="#166534" />
              <rect x="130" y="110" width="40" height="20" fill="#166534" />
              <rect x="210" y="55" width="40" height="75" fill="#166534" />
              <rect x="290" y="90" width="40" height="40" fill="#166534" />

              {/* X Axis */}
              <text x="70" y="145" className="text-[9px] fill-gray-400" textAnchor="middle">Cycle 1</text>
              <text x="150" y="145" className="text-[9px] fill-gray-400" textAnchor="middle">Cycle 2</text>
              <text x="230" y="145" className="text-[9px] fill-gray-400" textAnchor="middle">Cycle 3</text>
              <text x="310" y="145" className="text-[9px] fill-gray-400" textAnchor="middle">Cycle 4</text>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2 ───────────────────────────────────────────────────────── */}
      <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">6-Month Climate Outlook</h3>
            <p className="text-xs text-gray-500 mt-1">Projected rainfall and temperature for your registered farm location.</p>
          </div>
          <div className="text-xs border rounded-full px-3 py-1 flex items-center gap-1">
             <Map size={12}/> Farm Location: Meycauayan City, Bulacan
          </div>
        </div>
        
        <div className="flex justify-end mb-2 mr-4 text-[10px] text-gray-600 font-medium items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-700 block"></span> Rainfall (mm)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-yellow-500 block"></span> Temp (°C)</span>
        </div>

        <div className="w-full h-56 relative px-4">
          <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
              {/* Left Y Axis (Rainfall) */}
              <text x="-10" y="40" className="text-[10px] fill-gray-400" textAnchor="end">300mm</text>
              <text x="-10" y="90" className="text-[10px] fill-gray-400" textAnchor="end">200mm</text>
              <text x="-10" y="140" className="text-[10px] fill-gray-400" textAnchor="end">100mm</text>
              <text x="-10" y="190" className="text-[10px] fill-gray-400" textAnchor="end">0mm</text>

              {/* Right Y Axis (Temp) */}
              <text x="810" y="20" className="text-[10px] fill-gray-400">32°C</text>
              <text x="810" y="70" className="text-[10px] fill-gray-400">30°C</text>
              <text x="810" y="120" className="text-[10px] fill-gray-400">28°C</text>
              <text x="810" y="170" className="text-[10px] fill-gray-400">26°C</text>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#f1f5f9" />
              <line x1="0" y1="90" x2="800" y2="90" stroke="#f1f5f9" />
              <line x1="0" y1="140" x2="800" y2="140" stroke="#f1f5f9" />
              <line x1="0" y1="190" x2="800" y2="190" stroke="#f1f5f9" />

              {/* Bars (Rainfall) */}
              <rect x="40" y="110" width="60" height="80" fill="#0B7A2A" />
              <rect x="170" y="90" width="60" height="100" fill="#0B7A2A" />
              <rect x="300" y="60" width="60" height="130" fill="#0B7A2A" />
              <rect x="430" y="100" width="60" height="90" fill="#0B7A2A" />
              <rect x="560" y="130" width="60" height="60" fill="#0B7A2A" />
              <rect x="690" y="150" width="60" height="40" fill="#0B7A2A" />

              {/* Line (Temp) */}
              <path d="M 70,50 L 200,55 L 330,60 L 460,70 L 590,100 L 720,120" fill="none" stroke="#EAB308" strokeWidth="2" />
              <circle cx="70" cy="50" r="3" fill="#EAB308" />
              <circle cx="200" cy="55" r="3" fill="#EAB308" />
              <circle cx="330" cy="60" r="3" fill="#EAB308" />
              <circle cx="460" cy="70" r="3" fill="#EAB308" />
              <circle cx="590" cy="100" r="3" fill="#EAB308" />
              <circle cx="720" cy="120" r="3" fill="#EAB308" />

              {/* X Axis */}
              <text x="70" y="210" className="text-[11px] fill-gray-500 font-medium" textAnchor="middle">Jul</text>
              <text x="200" y="210" className="text-[11px] fill-gray-500 font-medium" textAnchor="middle">Aug</text>
              <text x="330" y="210" className="text-[11px] fill-gray-500 font-medium" textAnchor="middle">Sep</text>
              <text x="460" y="210" className="text-[11px] fill-gray-500 font-medium" textAnchor="middle">Oct</text>
              <text x="590" y="210" className="text-[11px] fill-gray-500 font-medium" textAnchor="middle">Nov</text>
              <text x="720" y="210" className="text-[11px] fill-gray-500 font-medium" textAnchor="middle">Dec</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
