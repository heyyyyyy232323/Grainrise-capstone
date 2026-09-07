import { useState } from "react";
import { Search, Lightbulb, Download, TrendingUp } from "lucide-react";
import Dropdown from "../../Components/Minor-Components/Dropdown";

const PRODUCT_TYPE_OPTIONS = [
  { label: "Milled Rice", value: "Milled Rice" },
  { label: "Palay", value: "Palay" },
];

const FORECAST_VIEW_OPTIONS = [
  { label: "Monthly", value: "Monthly" },
  { label: "Quarterly", value: "Quarterly" },
];

export default function DemandForecasting() {
  const [query, setQuery] = useState("Jasmine Rice");
  const [productType, setProductType] = useState("Milled Rice");
  const [forecastView, setForecastView] = useState("Monthly");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-bold text-gray-900 text-lg mb-4">Demand Forecasting</h3>

        {/* ── Filter Controls ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 relative">
             <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Search Product / Variety</label>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product / variety"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none bg-white h-[38px]"
                />
             </div>
          </div>
          <div className="md:col-span-3">
             <Dropdown
               label="Product Type"
               options={PRODUCT_TYPE_OPTIONS}
               value={productType}
               onChange={setProductType}
             />
          </div>
          <div className="md:col-span-3">
             <Dropdown
               label="Forecast View"
               options={FORECAST_VIEW_OPTIONS}
               value={forecastView}
               onChange={setForecastView}
             />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Main Chart Area (Left 2 cols) ─────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-bold text-gray-900 text-md">Historical & Forecasted Demand</h4>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-md">Unit: kg</span>
            </div>

            <div className="w-full h-64 relative">
               <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
                  {/* Vertical line for "Today" */}
                  <line x1="300" y1="10" x2="300" y2="170" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="300" y="5" className="text-[10px] fill-gray-400 font-medium" textAnchor="middle">Today</text>

                  {/* Historical Line (Solid Green) */}
                  <path d="M 50,150 L 120,130 L 160,140 L 220,90 L 280,100" fill="none" stroke="#0B7A2A" strokeWidth="3" />
                  
                  {/* Forecast Line (Dotted Yellow/Orange) */}
                  <path d="M 320,110 L 380,80 L 440,100 L 500,70 L 560,60" fill="none" stroke="#D6A62D" strokeWidth="3" strokeDasharray="8 6" />

                  {/* X Axis */}
                  <text x="50" y="195" className="text-[12px] fill-gray-500" textAnchor="middle">Jan</text>
                  <text x="160" y="195" className="text-[12px] fill-gray-500" textAnchor="middle">Mar</text>
                  <text x="250" y="195" className="text-[12px] fill-gray-500" textAnchor="middle">May</text>
                  <text x="370" y="195" className="text-[12px] fill-green-700 font-semibold" textAnchor="middle">Jul (Forecast)</text>
                  <text x="480" y="195" className="text-[12px] fill-green-700 font-semibold" textAnchor="middle">Sep</text>
                  <text x="580" y="195" className="text-[12px] fill-green-700 font-semibold" textAnchor="middle">Nov</text>
               </svg>
            </div>
          </div>

          {/* Bottom Row Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Forecasted Demand</p>
                <p className="text-lg font-bold text-green-700">12,500 <span className="text-xs font-normal text-gray-900">kg</span></p>
             </div>
             <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Demand Trend</p>
                <p className="text-md font-bold text-yellow-600 flex items-center gap-1">
                  <TrendingUp size={16} /> Increasing
                </p>
             </div>
             <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Peak Period</p>
                <p className="text-md font-bold text-gray-900">October 2026</p>
             </div>
             <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Expected Level</p>
                <div className="mt-1 inline-flex items-center justify-center bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-bold w-full">
                  High Demand
                </div>
             </div>
          </div>
        </div>

        {/* ── Right Sidebar Area (1 col) ────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-sm flex flex-col gap-5">
            <h4 className="font-bold text-gray-900 text-md flex items-center gap-2">
               <Lightbulb className="text-yellow-500" size={18} /> Insights & Considerations
            </h4>

            <div>
               <h5 className="text-sm font-semibold text-green-700 mb-1">Product Demand Summary</h5>
               <p className="text-xs text-gray-600 leading-relaxed">
                  Demand for Jasmine Rice is projected to increase during the forecast period, with the highest expected demand occurring in October.
               </p>
            </div>
            
            <hr className="border-gray-100" />

            <div>
               <h5 className="text-sm font-semibold text-yellow-600 mb-1">Production Consideration</h5>
               <p className="text-xs text-gray-600 leading-relaxed">
                  Consider preparing sufficient supply ahead of the projected peak-demand period.
               </p>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-lg font-medium hover:bg-green-800 transition">
             <Download size={18} /> Download Report
          </button>

          <div className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm mt-2">
             <h5 className="text-xs font-bold text-gray-900 mb-3">Forecast Information</h5>
             <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-500">Selected Product</span>
                <span className="text-xs font-medium text-gray-900">Jasmine Rice</span>
             </div>
             <div className="flex justify-between items-center py-2">
                <span className="text-xs text-gray-500">Forecast<br/>Period</span>
                <span className="text-xs font-medium text-gray-900 text-right">Sep 2026 - Feb<br/>2027</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
