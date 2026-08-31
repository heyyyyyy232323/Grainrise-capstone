import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart, MessageSquare, ArrowRight } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import field1 from "../../../assets/field1.png";
import field2 from "../../../assets/field2.png";

export const WAREHOUSE_NEWS_DATA = [
  {
    id: 1,
    category: "SUPPLY CHAIN & LOGISTICS",
    categoryColor: "bg-yellow-100 text-yellow-700",
    date: "August 29, 2026 · 10:00 AM",
    title: "National Buffer Stock Procurement Guidelines Released for Q4",
    description: "The National Food Authority has outlined updated storage standards and receiving protocols for accredited regional storage warehouses handling the upcoming main harvest season...",
    likes: 42,
    comments: 11,
    source: "National Food Authority",
    image: field1,
  },
  {
    id: 2,
    category: "STORAGE & GRAIN QUALITY",
    categoryColor: "bg-blue-100 text-blue-700",
    date: "August 22, 2026 · 08:15 AM",
    title: "Automated Moisture Monitoring and Silo Temperature Control",
    description: "New IoT sensor guidelines help warehouse managers maintain optimal 14% grain moisture levels, preventing spoilage and insect infestation during prolonged storage periods...",
    likes: 67,
    comments: 15,
    source: "Bureau of Postharvest Dev",
    image: field2,
  },
  {
    id: 3,
    category: "REGULATORY COMPLIANCE",
    categoryColor: "bg-amber-100 text-amber-700",
    date: "August 18, 2026 · 02:30 PM",
    title: "Regional Grain Storage Facility Accreditation Renewal Schedule",
    description: "Regional warehouse operators must complete their annual compliance and pest management audits before October 15 to maintain active distribution licensing...",
    likes: 85,
    comments: 24,
    source: "Agri Licensing Bureau",
    image: field1,
  },
];

export default function WarehouseManagerNewsUpdates() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [currentPage, setCurrentPage] = useState(1);
  const [likedArticles, setLikedArticles] = useState({});

  const toggleLike = (e, id) => {
    e.stopPropagation();
    setLikedArticles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = WAREHOUSE_NEWS_DATA.filter((news) => {
    if (search) {
      const q = search.toLowerCase();
      if (!news.title.toLowerCase().includes(q) && !news.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Resources" }, { label: "News & Updates" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          News &amp; Updates
        </h2>
        <p className="text-sm text-slate-500">
          Storage advisories, regulatory policies, and supply chain logistics news.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search news and updates..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-gray-700"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((news) => {
          const isLiked = likedArticles[news.id];
          const displayLikes = isLiked ? news.likes + 1 : news.likes;

          return (
            <div
              key={news.id}
              onClick={() => navigate(`/warehouse-manager/news-updates/${news.id}`)}
              className="border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col md:flex-row overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-full md:w-64 h-48 md:h-auto overflow-hidden shrink-0 border-r border-slate-100 bg-slate-100">
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-5 flex flex-col justify-between w-full">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase ${news.categoryColor}`}>
                      {news.category}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">{news.date}</span>
                  </div>

                  <h4 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-emerald-700 transition-colors">
                    {news.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                    {news.description}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                    <button
                      onClick={(e) => toggleLike(e, news.id)}
                      className={`flex items-center gap-1 ${isLiked ? "text-emerald-700 font-semibold" : "hover:text-emerald-700"}`}
                    >
                      <Heart size={14} fill={isLiked ? "currentColor" : "none"} /> {displayLikes}
                    </button>
                    <span><MessageSquare size={14} className="inline mr-1" /> {news.comments} Comments</span>
                    <span className="hidden sm:inline-block">Source: {news.source}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/warehouse-manager/news-updates/${news.id}`);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
                  >
                    Read More <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
