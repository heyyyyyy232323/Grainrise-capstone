import { Search, CalendarDays } from "lucide-react";

const mockCurrentContracts = [
  { id: "CON-2026-0832", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Due Soon", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0833", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Active", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0834", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Completed", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0835", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Cancelled", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0836", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Due Soon", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0837", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Active", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0838", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Completed", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0839", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Cancelled", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0840", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Due Soon", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0841", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Active", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0842", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Completed", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
  { id: "CON-2026-0843", buyer: "ABC Rice Mill", buyerId: "BYR-772", status: "Cancelled", product: "Milled Palay", variety: "Dinorado", qty: "2,500", price: "20.00", total: "10,500.00", date: "Oct 15, 2026" },
];

const getStatusBadgeStyle = (status) => {
  if (status === "Due Soon") return "bg-yellow-100 text-yellow-700";
  if (status === "Active") return "bg-green-100 text-green-700";
  if (status === "Completed") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-500";
};

export default function FarmerContractsCurrent() {
  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search contracts"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
           <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none">
              <option>Contract Status</option>
           </select>
           <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none">
              <option>Product Type</option>
           </select>
           <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none">
              <option>Rice Variety</option>
           </select>
           <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none w-[80px]">
              <option>Year</option>
           </select>
           <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none w-[90px]">
              <option>Month</option>
           </select>
           <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none ml-auto">
              <option>Sort By</option>
           </select>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockCurrentContracts.map((contract) => (
          <div key={contract.id} className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col overflow-hidden hover:shadow-md transition">
             
             {/* Top Image Placeholder */}
             <div className="h-32 bg-slate-300 relative flex items-center justify-center border-b border-gray-200">
                <span className="text-black/30 font-bold tracking-widest text-sm uppercase">Machinery Image</span>
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                   {contract.id}
                </div>
             </div>

             <div className="p-4 flex flex-col gap-4">
                
                {/* Header info */}
                <div className="flex justify-between items-start">
                   <div>
                      <h4 className="font-bold text-gray-900 text-md leading-none">{contract.buyer}</h4>
                      <p className="text-[10px] text-gray-500 font-medium mt-1">Buyer ID: {contract.buyerId}</p>
                   </div>
                   <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${getStatusBadgeStyle(contract.status)}`}>
                      {contract.status}
                   </div>
                </div>

                {/* Grid Info */}
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-3 grid grid-cols-2 gap-y-3 gap-x-2">
                   <div>
                      <p className="text-[10px] text-gray-500 mb-0.5 uppercase">Product</p>
                      <p className="text-xs font-bold text-gray-900">{contract.product}</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-gray-500 mb-0.5 uppercase">Variety</p>
                      <p className="text-xs font-bold text-gray-900">{contract.variety}</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-gray-500 mb-0.5 uppercase">Quantity</p>
                      <p className="text-xs font-bold text-gray-900">{contract.qty} kg</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-gray-500 mb-0.5 uppercase">Price/kg</p>
                      <p className="text-xs font-bold text-gray-900">₱{contract.price}</p>
                   </div>
                </div>

                {/* Footer Totals */}
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Total Value</p>
                      <p className="text-[15px] font-black text-green-700">${contract.total}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Fulfillment Date</p>
                      <p className="text-xs font-bold text-red-600 flex items-center justify-end gap-1">
                         <CalendarDays size={12} /> {contract.date}
                      </p>
                   </div>
                </div>

                {/* Action */}
                <button className="w-full mt-2 py-2 border border-green-600 text-green-700 rounded-lg font-medium text-sm hover:bg-green-50 transition">
                   View Details
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
