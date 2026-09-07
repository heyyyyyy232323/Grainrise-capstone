import { useState } from "react";
import { Search, MapPin, CheckCircle2, ChevronRight, Droplets, Thermometer, ArrowRight, Download, Crosshair, Tractor } from "lucide-react";
import Dropdown from "../../Components/Minor-Components/Dropdown";

const VIEW_OPTIONS = [
  { label: "Monthly View", value: "Monthly View" },
  { label: "Quarterly View", value: "Quarterly View" },
];

export default function ClimateForecasting() {
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState("San Miguel Rice Farm");
  const [outlookView, setOutlookView] = useState("Monthly View");
  const [historyView, setHistoryView] = useState("Monthly View");

  // Flow 1: Location Selection
  if (!isLocationConfirmed) {
    return (
      <div className="flex flex-col gap-6">
        <h3 className="font-bold text-gray-900 text-lg">Select Location</h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Search & List) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search location"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
                />
             </div>
             
             <div className="flex items-center gap-3">
               <hr className="flex-1 border-gray-200" />
               <span className="text-xs text-gray-400 font-medium uppercase">or</span>
               <hr className="flex-1 border-gray-200" />
             </div>

             <button className="w-full flex items-center justify-center gap-2 border border-green-600 text-green-700 py-2.5 rounded-lg font-medium hover:bg-green-50 transition">
                <Crosshair size={16} /> Use Current Location
             </button>

             <div className="mt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Registered Farms</h4>
                <div className="flex flex-col gap-3">
                   {/* Farm 1 */}
                   <div 
                      onClick={() => setSelectedFarm("San Miguel Rice Farm")}
                      className={`p-4 border rounded-xl cursor-pointer transition ${selectedFarm === "San Miguel Rice Farm" ? "border-green-600 bg-green-50/30" : "border-slate-200 hover:border-green-400"}`}
                    >
                      <div className="flex justify-between items-start">
                         <div className="flex gap-3">
                            <div className={`p-2 rounded-lg ${selectedFarm === "San Miguel Rice Farm" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                               <Tractor size={20} />
                            </div>
                            <div>
                               <h5 className={`font-bold text-sm ${selectedFarm === "San Miguel Rice Farm" ? "text-green-800" : "text-gray-900"}`}>San Miguel Rice Farm</h5>
                               <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} /> Nueva Ecija, Philippines</p>
                               <span className="inline-block mt-2 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-sm">12.5 ha</span>
                            </div>
                         </div>
                         {selectedFarm === "San Miguel Rice Farm" && <CheckCircle2 className="text-green-600" size={18} />}
                      </div>
                   </div>

                   {/* Farm 2 */}
                   <div 
                      onClick={() => setSelectedFarm("Isabela North Block")}
                      className={`p-4 border rounded-xl cursor-pointer transition ${selectedFarm === "Isabela North Block" ? "border-green-600 bg-green-50/30" : "border-slate-200 hover:border-green-400"}`}
                    >
                      <div className="flex justify-between items-start">
                         <div className="flex gap-3">
                            <div className={`p-2 rounded-lg ${selectedFarm === "Isabela North Block" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                               <Tractor size={20} />
                            </div>
                            <div>
                               <h5 className={`font-bold text-sm ${selectedFarm === "Isabela North Block" ? "text-green-800" : "text-gray-900"}`}>Isabela North Block</h5>
                               <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} /> Isabela, Philippines</p>
                               <span className="inline-block mt-2 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-sm">42.0 ha</span>
                            </div>
                         </div>
                         {selectedFarm === "Isabela North Block" && <CheckCircle2 className="text-green-600" size={18} />}
                      </div>
                   </div>

                   {/* Farm 3 */}
                   <div 
                      onClick={() => setSelectedFarm("Pangasinan Test Plot")}
                      className={`p-4 border rounded-xl cursor-pointer transition ${selectedFarm === "Pangasinan Test Plot" ? "border-green-600 bg-green-50/30" : "border-slate-200 hover:border-green-400"}`}
                    >
                      <div className="flex justify-between items-start">
                         <div className="flex gap-3">
                            <div className={`p-2 rounded-lg ${selectedFarm === "Pangasinan Test Plot" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                               <Tractor size={20} />
                            </div>
                            <div>
                               <h5 className={`font-bold text-sm ${selectedFarm === "Pangasinan Test Plot" ? "text-green-800" : "text-gray-900"}`}>Pangasinan Test Plot</h5>
                               <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} /> Pangasinan, Philippines</p>
                               <span className="inline-block mt-2 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-sm">2.0 ha</span>
                            </div>
                         </div>
                         {selectedFarm === "Pangasinan Test Plot" && <CheckCircle2 className="text-green-600" size={18} />}
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Column (Map & Confirmation) */}
          <div className="lg:col-span-8 flex flex-col gap-4 h-full min-h-[400px]">
             {/* Mock Map */}
             <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-[#e5e3df] relative min-h-[300px]">
                {/* Simulated map background lines */}
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                   <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                         <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d4d4d8" strokeWidth="0.5"/>
                      </pattern>
                   </defs>
                   <rect width="100%" height="100%" fill="url(#grid)" />
                   
                   {/* Simulated regions */}
                   <path d="M 100 100 Q 150 50 250 80 T 400 120 T 450 250 T 250 300 Z" fill="#bbf7d0" fillOpacity="0.4" stroke="#86efac" />
                   
                   {/* Pin marker */}
                   <g transform="translate(250, 150)">
                      <path d="M0 -15 C 8 -15 15 -8 15 0 C 15 10 0 25 0 25 C 0 25 -15 10 -15 0 C -15 -8 -8 -15 0 -15 Z" fill="#dc2626" />
                      <circle cx="0" cy="-2" r="5" fill="white" />
                   </g>
                </svg>

                {/* Map Controls Mock */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 shadow-sm rounded-lg overflow-hidden border border-gray-200">
                   <button className="bg-white p-2 hover:bg-gray-50 text-gray-600">+</button>
                   <hr className="border-gray-200" />
                   <button className="bg-white p-2 hover:bg-gray-50 text-gray-600">-</button>
                </div>

                {/* Selected Location Card overlay */}
                <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl shadow-lg border border-slate-200 p-4 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-12 bg-green-100 rounded flex items-center justify-center text-green-700">
                        <MapPin size={24} />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Selected Location</p>
                         <h4 className="font-bold text-gray-900 text-md">{selectedFarm}</h4>
                         <p className="text-xs text-gray-500">Nueva Ecija, Philippines</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setIsLocationConfirmed(true)}
                     className="bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-800 transition"
                   >
                      Confirm Location
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Flow 2: View Forecast Detailed
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
         <h3 className="font-bold text-gray-900 text-lg">View Forecast</h3>
         <button 
           onClick={() => setIsLocationConfirmed(false)}
           className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
         >
            Change Location <ArrowRight size={14} />
         </button>
      </div>

      <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-sm flex flex-col gap-6">
         {/* Top Section */}
         <div className="flex justify-between items-end border-b border-gray-100 pb-4">
            <div>
               <h4 className="font-bold text-gray-900 text-md">6-Month Climate Outlook (Sept 2026 - Feb 2027)</h4>
            </div>
            <div className="w-36">
               <Dropdown
                  options={VIEW_OPTIONS}
                  value={outlookView}
                  onChange={setOutlookView}
                  placeholder="View"
               />
            </div>
         </div>

         {/* The 2 Charts */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rainfall Bar Chart */}
            <div className="border border-slate-100 rounded-xl p-4 bg-gray-50/50">
               <h5 className="text-sm font-bold text-green-800 mb-4 flex items-center gap-1.5">
                  <Droplets size={16} /> 6-Month Rainfall Outlook
               </h5>
               <div className="w-full h-32 relative">
                  <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
                     {/* Y-axis indicator */}
                     <text x="-5" y="10" className="text-[8px] fill-gray-400" textAnchor="end">Max</text>
                     <text x="-5" y="90" className="text-[8px] fill-gray-400" textAnchor="end">0</text>
                     <line x1="0" y1="0" x2="0" y2="90" stroke="#CBD5E1" strokeWidth="0.5" />
                     
                     {/* Bars */}
                     <rect x="15" y="20" width="40" height="70" fill="#16A34A" />
                     <rect x="65" y="40" width="40" height="50" fill="#16A34A" />
                     <rect x="115" y="60" width="40" height="30" fill="#16A34A" />
                     <rect x="165" y="65" width="40" height="25" fill="#16A34A" />
                     <rect x="215" y="70" width="40" height="20" fill="#16A34A" />
                     <rect x="265" y="55" width="40" height="35" fill="#16A34A" />

                     {/* X-axis */}
                     <line x1="0" y1="90" x2="300" y2="90" stroke="#CBD5E1" strokeWidth="0.5" />
                     <text x="35" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Sep</text>
                     <text x="85" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Oct</text>
                     <text x="135" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Nov</text>
                     <text x="185" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Dec</text>
                     <text x="235" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Jan</text>
                     <text x="285" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Feb</text>
                  </svg>
               </div>
            </div>

            {/* Temperature Line Chart */}
            <div className="border border-slate-100 rounded-xl p-4 bg-gray-50/50">
               <h5 className="text-sm font-bold text-red-700 mb-4 flex items-center gap-1.5">
                  <Thermometer size={16} /> 6-Month Temperature Outlook
               </h5>
               <div className="w-full h-32 relative">
                  <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
                     {/* Y-axis indicator */}
                     <text x="-5" y="10" className="text-[8px] fill-gray-400" textAnchor="end">High</text>
                     <text x="-5" y="90" className="text-[8px] fill-gray-400" textAnchor="end">Low</text>
                     <line x1="0" y1="0" x2="0" y2="90" stroke="#CBD5E1" strokeWidth="0.5" />

                     {/* Line Path */}
                     <path d="M 35,60 Q 85,60 135,50 T 185,15 T 235,25 T 285,25" fill="none" stroke="#DC2626" strokeWidth="2.5" />
                     <circle cx="35" cy="60" r="2" fill="#DC2626" />
                     <circle cx="135" cy="50" r="2" fill="#DC2626" />
                     <circle cx="185" cy="15" r="2" fill="#DC2626" />
                     <circle cx="285" cy="25" r="2" fill="#DC2626" />

                     {/* X-axis */}
                     <line x1="0" y1="90" x2="300" y2="90" stroke="#CBD5E1" strokeWidth="0.5" />
                     <text x="35" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Sep</text>
                     <text x="85" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Oct</text>
                     <text x="135" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Nov</text>
                     <text x="185" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Dec</text>
                     <text x="235" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Jan</text>
                     <text x="285" y="105" className="text-[9px] fill-gray-500" textAnchor="middle">Feb</text>
                  </svg>
               </div>
            </div>
         </div>

         {/* Middle Section: Insights & Actions */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-gray-100 pb-6">
            <div className="lg:col-span-2 flex flex-col gap-4">
               <h4 className="font-bold text-gray-900 text-md">Climate Insights for Your Farm</h4>
               <div className="border border-slate-200 rounded-xl p-4 shadow-sm bg-white">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Climate Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                     Expect an unusually dry late Q4 transitioning into a warmer Q1. Early planting is recommended to leverage remaining soil moisture before peak dry conditions set in by December.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="border border-slate-100 rounded-lg p-3 bg-gray-50/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Droplets size={12}/> Rainfall Advisory</p>
                        <p className="text-xs text-gray-700">Precipitation projected 15% below historical averages for Nov-Jan.</p>
                     </div>
                     <div className="border border-slate-100 rounded-lg p-3 bg-gray-50/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Thermometer size={12}/> Temperature Advisory</p>
                        <p className="text-xs text-gray-700">Peak daytime temperatures likely to exceed 34°C during late January.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                     <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Drought Risk</p>
                        <span className="inline-block bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-sm">High Risk</span>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Excessive Rainfall Risk</p>
                        <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-sm">Low Risk</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                     <div className="bg-green-100 rounded-lg p-3 border border-green-200">
                        <p className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">Suggested Planting Period</p>
                        <p className="text-sm font-bold text-green-900">Oct 5 - Oct 20</p>
                     </div>
                     <div className="bg-green-100 rounded-lg p-3 border border-green-200 opacity-75">
                        <p className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">Suggested Harvest Consideration</p>
                        <p className="text-sm font-bold text-green-900">Accelerate by 1 week</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-4">
               <div className="bg-green-50 border border-green-100 rounded-xl p-5 shadow-sm h-full">
                  <h4 className="font-bold text-green-800 text-md flex items-center gap-2 mb-4">
                     <CheckCircle2 size={18} /> Recommended Actions
                  </h4>
                  <ul className="space-y-4">
                     <li className="flex gap-2 items-start">
                        <div className="mt-0.5 bg-green-200 p-0.5 rounded-full"><CheckCircle2 size={12} className="text-green-700" /></div>
                        <div>
                           <p className="text-sm font-bold text-gray-900">Monitor soil moisture</p>
                           <p className="text-xs text-gray-600">Deploy additional sensors in Sector B.</p>
                        </div>
                     </li>
                     <li className="flex gap-2 items-start">
                        <div className="mt-0.5 bg-green-200 p-0.5 rounded-full"><CheckCircle2 size={12} className="text-green-700" /></div>
                        <div>
                           <p className="text-sm font-bold text-gray-900">Prepare irrigation</p>
                           <p className="text-xs text-gray-600">Service primary pumps before mid-November.</p>
                        </div>
                     </li>
                     <li className="flex gap-2 items-start">
                        <div className="mt-0.5 bg-green-200 p-0.5 rounded-full"><CheckCircle2 size={12} className="text-green-700" /></div>
                        <div>
                           <p className="text-sm font-bold text-gray-900">Adjust fertilizer schedule</p>
                           <p className="text-xs text-gray-600">Delay final nitrogen application by 10 days.</p>
                        </div>
                     </li>
                     <li className="flex gap-2 items-start">
                        <div className="mt-0.5 bg-green-200 p-0.5 rounded-full"><CheckCircle2 size={12} className="text-green-700" /></div>
                        <div>
                           <p className="text-sm font-bold text-gray-900">Procure drought-resistant seeds</p>
                           <p className="text-xs text-gray-600">For subsequent crop rotation cycle.</p>
                        </div>
                     </li>
                  </ul>
               </div>
            </div>
         </div>

         {/* Bottom Section: Climate History */}
         <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
               <h4 className="font-bold text-gray-900 text-md">Climate History</h4>
               <div className="w-36">
                  <Dropdown
                     options={VIEW_OPTIONS}
                     value={historyView}
                     onChange={setHistoryView}
                     placeholder="View"
                  />
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="border border-slate-100 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-2 h-28">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Historical Rainfall (5yr Avg)</p>
                  <div className="flex items-end justify-around flex-1 px-4">
                     <div className="w-10 h-10 bg-slate-400"></div>
                     <div className="w-10 h-8 bg-slate-400"></div>
                     <div className="w-10 h-12 bg-slate-400"></div>
                  </div>
               </div>
               <div className="border border-slate-100 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-2 h-28">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Historical Temp (5yr Avg)</p>
                  <div className="flex items-center flex-1 px-4">
                     <svg viewBox="0 0 200 40" className="w-full h-full overflow-visible">
                        <path d="M 0,20 Q 50,10 100,20 T 200,20" fill="none" stroke="#94A3B8" strokeWidth="2" />
                     </svg>
                  </div>
               </div>
            </div>
         </div>
         
         <div className="flex justify-between items-center pt-4">
            <div>
               <p className="text-xs text-gray-500">Forecast Area: <span className="font-medium text-gray-900">{selectedFarm}</span></p>
               <p className="text-xs text-gray-500">Data Period: Sept 2026 - Feb 2027</p>
               <p className="text-xs text-gray-500">Last Updated: Aug 30, 2026</p>
            </div>
            <button className="flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-800 transition text-sm">
               <Download size={16} /> Download Forecast Report
            </button>
         </div>

      </div>
    </div>
  );
}
