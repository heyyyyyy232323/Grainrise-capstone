import { Search } from "lucide-react";

// Mock data based on the Figma design
const mockApplications = [
  { id: 1, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Pending", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 2, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Under Review", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 3, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Declined", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 4, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Declined", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 5, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Pending", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 6, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Under Review", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 7, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Declined", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 8, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Declined", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 9, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Pending", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 10, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Under Review", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 11, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Declined", variety: "Jasmine Rice", qty: "500 kg" },
  { id: 12, buyer: "ABC Rice Mill", date: "August 24, 2026", status: "Declined", variety: "Jasmine Rice", qty: "500 kg" },
];

const getStatusBadgeColors = (status) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-700";
    case "Under Review":
      return "bg-blue-100 text-blue-700";
    case "Declined":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function FarmerContractsApplications() {
  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search applications"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
           <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[120px]">
              <option>All Status</option>
              <option>Pending</option>
              <option>Under Review</option>
              <option>Declined</option>
           </select>
           <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[100px]">
              <option>Year</option>
              <option>2026</option>
           </select>
           <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[100px]">
              <option>Month</option>
              <option>August</option>
           </select>
           <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[120px]">
              <option>Sort By</option>
              <option>Date (Newest)</option>
           </select>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockApplications.map((app) => (
          <div key={app.id} className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm flex flex-col gap-4">
             {/* Header */}
             <div className="flex justify-between items-start">
                <div>
                   <h4 className="font-bold text-gray-900 text-[15px]">{app.buyer}</h4>
                   <p className="text-[11px] text-gray-500 mt-0.5">{app.date}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${getStatusBadgeColors(app.status)}`}>
                   {app.status}
                </span>
             </div>

             {/* Details block */}
             <div className="bg-green-50/50 rounded-lg p-3 flex justify-between border border-green-50">
                <div>
                   <p className="text-[10px] text-gray-500 mb-0.5">Variety</p>
                   <p className="text-sm font-bold text-gray-900">{app.variety}</p>
                </div>
                <div>
                   <p className="text-[10px] text-gray-500 mb-0.5">Quantity</p>
                   <p className="text-sm font-bold text-gray-900">{app.qty}</p>
                </div>
             </div>

             {/* Action */}
             <button className="w-full mt-auto py-2 border border-green-600 text-green-700 rounded-lg font-medium text-sm hover:bg-green-50 transition">
                View Details
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}
