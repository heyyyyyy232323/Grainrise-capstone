import { Search, MapPin, PlusCircle, CheckCircle2 } from "lucide-react";

const mockOpportunities = [
  { id: 1, type: "UNMILLED PALAY", variety: "Premium Jasmine", buyer: "Central Valley Millers", price: "19.50", qty: "10,000", date: "Oct 15, 2026", location: "Nueva Ecija, Philippines", timeBadge: "5 days left", badgeType: "warning" },
  { id: 2, type: "MILLED PALAY", variety: "Dinorado", buyer: "Northern Agritraders", price: "20.00", qty: "5,000", date: "Nov 01, 2026", location: "Isabela, Philippines", timeBadge: "12 days left", badgeType: "normal" },
  { id: 3, type: "UNMILLED PALAY", variety: "Basmati Rice", buyer: "Global Grains Corp.", price: "18.75", qty: "25,000", date: "Oct 30, 2026", location: "Pangasinan, Philippines", timeBadge: "Ends Tomorrow", badgeType: "danger" },
  { id: 4, type: "UNMILLED PALAY", variety: "Premium Jasmine", buyer: "Central Valley Millers", price: "19.50", qty: "10,000", date: "Oct 15, 2026", location: "Nueva Ecija, Philippines", timeBadge: "5 days left", badgeType: "warning" },
  { id: 5, type: "UNMILLED PALAY", variety: "Premium Jasmine", buyer: "Central Valley Millers", price: "19.50", qty: "10,000", date: "Oct 15, 2026", location: "Nueva Ecija, Philippines", timeBadge: "5 days left", badgeType: "warning" },
  { id: 6, type: "MILLED PALAY", variety: "Dinorado", buyer: "Northern Agritraders", price: "20.00", qty: "5,000", date: "Nov 01, 2026", location: "Isabela, Philippines", timeBadge: "12 days left", badgeType: "normal" },
  { id: 7, type: "UNMILLED PALAY", variety: "Basmati Rice", buyer: "Global Grains Corp.", price: "18.75", qty: "25,000", date: "Oct 30, 2026", location: "Pangasinan, Philippines", timeBadge: "Ends Tomorrow", badgeType: "danger" },
  { id: 8, type: "UNMILLED PALAY", variety: "Premium Jasmine", buyer: "Central Valley Millers", price: "19.50", qty: "10,000", date: "Oct 15, 2026", location: "Nueva Ecija, Philippines", timeBadge: "5 days left", badgeType: "warning" },
  { id: 9, type: "UNMILLED PALAY", variety: "Premium Jasmine", buyer: "Central Valley Millers", price: "19.50", qty: "10,000", date: "Oct 15, 2026", location: "Nueva Ecija, Philippines", timeBadge: "5 days left", badgeType: "warning" },
  { id: 10, type: "MILLED PALAY", variety: "Dinorado", buyer: "Northern Agritraders", price: "20.00", qty: "5,000", date: "Nov 01, 2026", location: "Isabela, Philippines", timeBadge: "12 days left", badgeType: "normal" },
  { id: 11, type: "UNMILLED PALAY", variety: "Basmati Rice", buyer: "Global Grains Corp.", price: "18.75", qty: "25,000", date: "Oct 30, 2026", location: "Pangasinan, Philippines", timeBadge: "Ends Tomorrow", badgeType: "danger" },
  { id: 12, type: "UNMILLED PALAY", variety: "Premium Jasmine", buyer: "Central Valley Millers", price: "19.50", qty: "10,000", date: "Oct 15, 2026", location: "Nueva Ecija, Philippines", timeBadge: "5 days left", badgeType: "warning" },
];

const getBadgeStyle = (type) => {
  if (type === "warning") return "bg-yellow-100 text-yellow-700 border border-yellow-200";
  if (type === "danger") return "bg-red-100 text-red-700 border border-red-200";
  return "bg-gray-100 text-gray-700 border border-gray-200";
};

export default function FarmerContractsOpportunities() {
  return (
    <div className="flex flex-col gap-6">
      
      {/* ── Top Bar (Filters & Action Button) ────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-2">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
           <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
               type="text" 
               placeholder="Search opportunities"
               className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
             />
           </div>

           <div className="flex flex-wrap gap-2">
              <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none">
                 <option>Product Type</option>
              </select>
              <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none">
                 <option>Rice Variety</option>
              </select>
              <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none">
                 <option>Location</option>
              </select>
              <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none">
                 <option>Qty</option>
              </select>
              <select className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none">
                 <option>Sort By</option>
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
        {mockOpportunities.map((opp) => (
          <div key={opp.id} className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col overflow-hidden hover:shadow-md transition">
             
             {/* Top Image Placeholder */}
             <div className="h-32 bg-[#b6ae9d] relative flex items-center justify-center border-b border-gray-200">
                <span className="text-white/40 font-bold tracking-widest text-sm uppercase">Sack of Rice Image</span>
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm ${getBadgeStyle(opp.badgeType)}`}>
                   {opp.timeBadge}
                </div>
             </div>

             <div className="p-4 flex flex-col gap-3">
                {/* Header info */}
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{opp.type}</p>
                      <h4 className="font-bold text-gray-900 text-md">{opp.variety}</h4>
                   </div>
                   <div className="text-right">
                      <p className="text-lg font-black text-gray-900 leading-none">₱{opp.price}</p>
                      <p className="text-[10px] text-gray-500 font-medium">/kg</p>
                   </div>
                </div>

                {/* Buyer */}
                <div className="flex items-center gap-1 text-green-700">
                   <CheckCircle2 size={12} />
                   <span className="text-xs font-semibold">{opp.buyer}</span>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3 bg-gray-50/80 rounded-lg p-3 border border-gray-100 mt-1">
                   <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Quantity Required</p>
                      <p className="text-xs font-bold text-gray-900">{opp.qty} kg</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Fulfillment Date</p>
                      <p className="text-xs font-bold text-gray-900">{opp.date}</p>
                   </div>
                   <div className="col-span-2">
                      <p className="text-[10px] text-gray-500 mb-0.5">Location</p>
                      <p className="text-xs font-medium text-gray-900 flex items-center gap-1">
                        <MapPin size={10} className="text-gray-400" /> {opp.location}
                      </p>
                   </div>
                </div>

                {/* Action */}
                <button className="w-full mt-2 py-2 bg-green-700 text-white rounded-lg font-medium text-sm hover:bg-green-800 transition">
                   View Details
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
