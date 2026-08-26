import { ArrowLeft, Truck, Check, Clock, MapPin, Navigation } from "lucide-react";

export default function WarehouseDeliveryDetails({ record, onBack }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Assigned History
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Delivery Details</h1>
        <p className="text-sm text-slate-500 mt-1">Review delivery information and monitor real-time delivery progress.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Product Overview Card */}
        <div className="rounded-[14px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Product Overview</h3>
            <p className="text-xs text-slate-500">Order and product information</p>
          </div>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Order Number</p>
              <p className="text-sm font-semibold text-slate-800">{record?.orderNo || "Batch 2026-001"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Product Code</p>
              <p className="text-sm font-semibold text-slate-800">GR-WHT-001</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Variant</p>
              <p className="text-sm font-semibold text-slate-800">{record?.variant || "Dinorado"}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Quantity</p>
              <p className="text-sm font-semibold text-slate-800">20000 kg</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Expiration Date</p>
              <p className="text-sm font-semibold text-slate-800">N/A (Dry Storage)</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Description</p>
              <p className="text-sm font-semibold text-slate-800">Silo 4 discharge. Ensure moisture seal on transport container.</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Payment Method</p>
              <p className="text-sm font-semibold text-slate-800">Gcash</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Payment Status</p>
              <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-3 py-0.5 text-[10px] font-bold text-emerald-700">Paid</span>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Delivery Status</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-[10px] font-bold text-amber-700">
                <Truck size={12} />
                In Transit
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Summary Card */}
        <div className="rounded-[14px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Delivery Summary</h3>
            <p className="text-xs text-slate-500">Customer and driver information</p>
          </div>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Customer Name</p>
              <p className="text-sm font-semibold text-slate-800">Juan Dela Cruz</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Customer Address</p>
              <p className="text-sm font-semibold text-slate-800">1042 Industrial Pkwy, Chicago, IL 60609</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Assigned Driver</p>
              <div className="mt-1 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{record?.driver || "James Halpert"}</p>
                  <p className="text-[11px] text-slate-500">Truck ID: TRN-992 (Class A)</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Assigned Date</p>
              <p className="text-sm font-semibold text-slate-800">{record?.assignedOn || "Oct 24, 2026"} 8:30 AM</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Expiration Date</p>
              <p className="text-sm font-semibold text-slate-800">Oct 24, 2026 2:15 PM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Tracking Card */}
      <div className="rounded-[14px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Live Tracking</h3>
            <p className="text-xs text-slate-500">Real-time driver location and delivery route.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
              <Navigation size={14} className="text-slate-400" />
              <div>
                <p className="text-[9px] font-bold uppercase text-slate-400 leading-none">Speed</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">55 mph</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
              <MapPin size={14} className="text-slate-400" />
              <div>
                <p className="text-[9px] font-bold uppercase text-slate-400 leading-none">Remaining</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">42 miles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="relative mb-8 h-64 w-full overflow-hidden rounded-xl bg-[#e5e5df] border border-slate-200 flex items-center justify-center">
          {/* Mock Path */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
            <path d="M 100 250 Q 500 150 900 100" fill="none" stroke="#15803d" strokeWidth="4" />
            <path d="M 100 250 Q 500 130 900 100" fill="none" stroke="#15803d" strokeWidth="2" strokeDasharray="6 6" />
          </svg>
          
          {/* Origin */}
          <div className="absolute left-[10%] top-[80%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md z-10 border-2 border-white">
              <Check size={12} strokeWidth={4} />
            </div>
            <div className="mt-1 bg-white px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100">Omaha Hub</div>
          </div>

          {/* Truck */}
          <div className="absolute left-[60%] top-[45%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
            <div className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-md border-2 border-white">
              <Truck size={14} />
            </div>
            <div className="mt-1 bg-white px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100">TRN-992</div>
          </div>

          {/* Destination */}
          <div className="absolute left-[90%] top-[33%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="h-4 w-4 rounded-full bg-red-500 shadow-md border-2 border-white"></div>
          </div>

          {/* Legend */}
          <div className="absolute right-4 top-4 rounded-lg bg-white/90 p-3 shadow-md backdrop-blur-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-600"></div>
              <span className="text-[10px] font-bold text-slate-700">Origin</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-[10px] font-bold text-slate-700">Destination</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-[10px] font-bold text-slate-700">Active Truck</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative px-2 md:px-8">
          <div className="absolute left-0 top-3 h-1 w-full bg-slate-100 md:left-8 md:w-[calc(100%-4rem)] rounded-full"></div>
          <div className="absolute left-0 top-3 h-1 w-[60%] bg-emerald-700 md:left-8 rounded-full"></div>
          
          <div className="relative flex justify-between">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white z-10 border-2 border-white shadow-sm">
                <Check size={14} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Assigned</p>
              <p className="text-[9px] text-slate-500">08:30 AM</p>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white z-10 border-2 border-white shadow-sm">
                <Check size={14} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Accepted</p>
              <p className="text-[9px] text-slate-500">08:45 AM</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white z-10 border-2 border-white shadow-sm">
                <Check size={14} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Departed</p>
              <p className="text-[9px] text-slate-500">09:15 AM</p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 z-10 border-2 border-white shadow-md ring-4 ring-amber-50">
                <Truck size={16} />
              </div>
              <p className="text-[11px] font-bold text-amber-600">In Transit</p>
              <p className="text-[9px] text-slate-500">Est. 02:15 PM</p>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-400 z-10 border-2 border-white shadow-sm">
                <Clock size={14} />
              </div>
              <p className="text-[11px] font-bold text-slate-400">Delivered</p>
              <p className="text-[9px] text-slate-400">Pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
