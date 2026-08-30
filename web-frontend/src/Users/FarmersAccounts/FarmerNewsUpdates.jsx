import { Search, Heart, MessageSquare, ArrowRight } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";

const MOCK_NEWS = [
  {
    id: 1,
    category: "MARKET UPDATES",
    date: "August 20, 2026, 10:00 AM",
    title: "Palay Buying Prices Show Stable Movement This Month",
    description: "Recent market analysis indicate stable palay buying prices across selected agricultural areas, providing a predictable revenue stream for local producers...",
    likes: 24,
    comments: 8,
    source: "Department of Agriculture",
    image: "bg-green-700/20"
  },
  {
    id: 2,
    category: "ADVISORY & BEST PRACTICES",
    date: "August 17, 2026, 08:15 AM",
    title: "El Niño Preparations: Water Management Strategies for Q4",
    description: "With projected rainfall deficits approaching in the final quarter, experts recommend immediate implementation of efficient irrigation scheduling and soil...",
    likes: 56,
    comments: 12,
    source: "PAGASA",
    image: "bg-blue-700/20"
  },
  {
    id: 3,
    category: "GRANT PROGRAMS & SUPPORT",
    date: "August 10, 2026, 02:30 PM",
    title: "New Fertilizer Discount Vouchers Available for Registration",
    description: "Eligible registered farmers can now apply for the Q3 fertilizer discount voucher program through the centralized portal to offset rising input costs for the...",
    likes: 112,
    comments: 45,
    source: "National Agri Board",
    image: "bg-yellow-600/20"
  }
];

export default function FarmerNewsUpdates() {
  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Resources" }, { label: "News & Updates" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          News & Updates
        </h2>
        <p className="text-sm text-slate-500">
          Stay informed with the latest agricultural news, market updates, advisories, and programs.
        </p>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search news and updates"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
           <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[100px]">
              <option>Year</option>
              <option>2026</option>
           </select>
           <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[100px]">
              <option>Month</option>
              <option>August</option>
           </select>
           <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[160px]">
              <option>News Category</option>
              <option>Market Updates</option>
              <option>Advisory</option>
           </select>
           <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none min-w-[120px]">
              <option>Sort By</option>
              <option>Latest</option>
           </select>
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {MOCK_NEWS.map((news) => (
          <div key={news.id} className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col md:flex-row overflow-hidden hover:border-green-300 transition">
             
             {/* Thumbnail Placeholder */}
             <div className={`w-full md:w-64 h-48 md:h-auto ${news.image} flex items-center justify-center shrink-0 border-r border-slate-100`}>
                <span className="text-black/30 font-bold text-sm tracking-widest uppercase">Image</span>
             </div>

             {/* Content */}
             <div className="p-5 flex flex-col justify-center w-full">
                <div className="flex items-center gap-3 mb-2">
                   <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-sm">
                      {news.category}
                   </span>
                   <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span> {news.date}
                   </span>
                </div>

                <h4 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{news.title}</h4>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                   {news.description}
                </p>

                <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-3">
                   <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      <span className="flex items-center gap-1 hover:text-green-700 cursor-pointer transition">
                         <Heart size={14} /> {news.likes}
                      </span>
                      <span className="flex items-center gap-1 hover:text-green-700 cursor-pointer transition">
                         <MessageSquare size={14} /> {news.comments} Comments
                      </span>
                      <span className="hidden sm:inline-block">Source: {news.source}</span>
                   </div>
                   <button className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1 transition">
                      Read More <ArrowRight size={14} />
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
         <p className="text-sm text-gray-500">Showing 1-3 of 28 new articles</p>
         <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 text-gray-400 rounded-md text-sm cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 bg-green-700 text-white font-medium rounded-md text-sm">1</button>
            <button className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition">2</button>
            <button className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition">3</button>
            <button className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-sm transition">Next</button>
         </div>
      </div>
    </div>
  );
}
