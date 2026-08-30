import { Search, PlusCircle, Hourglass, FileText } from "lucide-react";

const mockOffers = [
  { id: "BID-2026-0048", status: "High Demand", variety: "Dinorado", qty: "2,500", startDate: "Oct 12, 2026", deadline: "Oct 26, 2026", offersReceived: 12 },
  { id: "BID-2026-0049", status: "Open", variety: "Jasmine Rice Premium", qty: "1,800", startDate: "Oct 15, 2026", deadline: "Nov 02, 2026", offersReceived: 4 },
  { id: "BID-2026-0050", status: "Open", variety: "Basmati Grade A", qty: "5,000", startDate: "Oct 18, 2026", deadline: "Nov 10, 2026", offersReceived: 0 },
  { id: "BID-2026-0051", status: "Open", variety: "Basmati Grade A", qty: "5,000", startDate: "Oct 18, 2026", deadline: "Nov 10, 2026", offersReceived: 0 },
  { id: "BID-2026-0052", status: "High Demand", variety: "Dinorado", qty: "2,500", startDate: "Oct 12, 2026", deadline: "Oct 26, 2026", offersReceived: 12 },
  { id: "BID-2026-0053", status: "Open", variety: "Jasmine Rice Premium", qty: "1,800", startDate: "Oct 15, 2026", deadline: "Nov 02, 2026", offersReceived: 4 },
  { id: "BID-2026-0054", status: "Open", variety: "Basmati Grade A", qty: "5,000", startDate: "Oct 18, 2026", deadline: "Nov 10, 2026", offersReceived: 0 },
  { id: "BID-2026-0055", status: "Open", variety: "Basmati Grade A", qty: "5,000", startDate: "Oct 18, 2026", deadline: "Nov 10, 2026", offersReceived: 0 },
  { id: "BID-2026-0056", status: "High Demand", variety: "Dinorado", qty: "2,500", startDate: "Oct 12, 2026", deadline: "Oct 26, 2026", offersReceived: 12 },
  { id: "BID-2026-0057", status: "Open", variety: "Jasmine Rice Premium", qty: "1,800", startDate: "Oct 15, 2026", deadline: "Nov 02, 2026", offersReceived: 4 },
  { id: "BID-2026-0058", status: "Open", variety: "Basmati Grade A", qty: "5,000", startDate: "Oct 18, 2026", deadline: "Nov 10, 2026", offersReceived: 0 },
  { id: "BID-2026-0059", status: "Open", variety: "Basmati Grade A", qty: "5,000", startDate: "Oct 18, 2026", deadline: "Nov 10, 2026", offersReceived: 0 },
];

const getStatusBadgeStyle = (status) => {
  if (status === "High Demand") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
};

export default function FarmerContractsOffers() {
  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Top Bar (Filters & Create Button) ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-2">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
           <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
               type="text" 
               placeholder="Search open biddings"
               className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
             />
           </div>

           <div className="flex flex-wrap gap-3">
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[140px]">
                 <option>Bidding Status</option>
                 <option>High Demand</option>
                 <option>Open</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[100px]">
                 <option>Year</option>
                 <option>2026</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[100px]">
                 <option>Month</option>
                 <option>October</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[120px]">
                 <option>Sort By</option>
                 <option>Deadline (Earliest)</option>
              </select>
           </div>
        </div>

        <div>
           <button className="w-full lg:w-auto flex items-center justify-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-800 transition text-sm">
              <PlusCircle size={16} /> Create Open Bidding
           </button>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockOffers.map((offer) => (
          <div key={offer.id} className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col overflow-hidden">
             
             {/* Main Card Content */}
             <div className="p-4 flex flex-col gap-4">
                {/* ID & Status */}
                <div className="flex justify-between items-center">
                   <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                      {offer.id}
                   </span>
                   <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${getStatusBadgeStyle(offer.status)}`}>
                      {offer.status}
                   </span>
                </div>

                {/* Variety & Qty */}
                <div>
                   <p className="text-sm font-semibold text-gray-900 mb-1">{offer.variety}</p>
                   <p className="text-2xl font-black text-gray-900">
                      {offer.qty} <span className="text-sm font-normal text-gray-500">kg</span>
                   </p>
                </div>

                {/* Dates */}
                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                   <div>
                      <p className="text-[10px] text-gray-500 font-medium mb-0.5">Start Date</p>
                      <p className="text-xs text-gray-900 font-semibold">{offer.startDate}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-red-500 font-bold mb-0.5 flex items-center justify-end gap-1">
                         <Hourglass size={10} /> Deadline
                      </p>
                      <p className="text-xs text-gray-900 font-semibold">{offer.deadline}</p>
                   </div>
                </div>
             </div>

             {/* Footer Area */}
             <div className="bg-gray-50 p-3 mt-auto border-t border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-green-700">
                   <FileText size={14} className={offer.offersReceived > 0 ? "text-green-700" : "text-gray-400"} />
                   <span className={`text-xs font-bold ${offer.offersReceived > 0 ? "text-gray-900" : "text-gray-400"}`}>
                      {offer.offersReceived} {offer.offersReceived === 1 ? "Offer" : "Offers"} {offer.offersReceived > 0 ? "Received" : "Yet"}
                   </span>
                </div>
                <button className="text-xs border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold px-3 py-1.5 rounded-md transition">
                   View Offers
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
