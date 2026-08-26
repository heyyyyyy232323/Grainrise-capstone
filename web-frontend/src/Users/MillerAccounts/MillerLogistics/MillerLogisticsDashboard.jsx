import React from "react";
import { Link } from "react-router-dom";
import { Calendar, UserPlus, Truck, Package, RotateCcw, Receipt, ChevronRight } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

const DeliveryManagementData = [
  { batchNo: "Batch 2026-001", retailer: "Retailer A", variant: "Dinorado", qty: "2,500 kg", arrival: "Apr 22, 2026" },
  { batchNo: "Batch 2026-001", retailer: "Retailer A", variant: "Dinorado", qty: "2,500 kg", arrival: "Apr 22, 2026" },
  { batchNo: "Batch 2026-001", retailer: "Retailer A", variant: "Dinorado", qty: "2,500 kg", arrival: "Apr 22, 2026" },
  { batchNo: "Batch 2026-001", retailer: "Retailer A", variant: "Dinorado", qty: "2,500 kg", arrival: "Apr 22, 2026" },
  { batchNo: "Batch 2026-001", retailer: "Retailer A", variant: "Dinorado", qty: "2,500 kg", arrival: "Apr 22, 2026" },
];

const ProductReturnsData = [
  { variant: "Dinorado", orderNo: "Batch 2026-001", retailer: "Retailer A", qty: "10 kg" },
  { variant: "Dinorado", orderNo: "Batch 2026-001", retailer: "Retailer A", qty: "10 kg" },
  { variant: "Dinorado", orderNo: "Batch 2026-001", retailer: "Retailer A", qty: "10 kg" },
  { variant: "Dinorado", orderNo: "Batch 2026-001", retailer: "Retailer A", qty: "10 kg" },
  { variant: "Dinorado", orderNo: "Batch 2026-001", retailer: "Retailer A", qty: "10 kg" },
];

const MillerLogisticsDashboard = () => {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Last Updated: Today 10:42 AM</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors self-start">
          <Calendar size={16} className="text-gray-500" />
          July 19, 2026
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">Orders Awaiting Assignment</h3>
            <UserPlus size={18} className="text-emerald-700" />
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">6</p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
            Orders awaiting driver assignment
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">In Transit Orders</h3>
            <Truck size={18} className="text-emerald-700" />
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">0</p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
            Deliveries currently on route
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">Pending Return Issues</h3>
            <RotateCcw size={18} className="text-rose-700" />
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">4</p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-md w-fit">
            Return issues awaiting review
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-[14px] border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">Pending Reimbursements</h3>
            <Receipt size={18} className="text-amber-600" />
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-4">1</p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md w-fit">
            Logistics related handling required
          </div>
        </div>
      </div>

      {/* Middle Section: Charts and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Utilization */}
        <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Load Utilization</h3>
          
          <div className="space-y-6">
            {/* Progress 1 */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-gray-900">Driver Unknown A</span>
                <span className="text-gray-500"><span className="text-gray-900">340</span> / 10,000 kg</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gray-300 rounded-full" style={{ width: "3.4%" }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold mt-2 text-emerald-700">
                <span>Available</span>
                <span className="text-gray-400">3.4%</span>
              </div>
            </div>

            {/* Progress 2 */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-gray-900">Driver Unknown A</span>
                <span className="text-gray-500"><span className="text-gray-900">340</span> / 10,000 kg</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gray-300 rounded-full" style={{ width: "3.4%" }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold mt-2 text-emerald-700">
                <span>Available</span>
                <span className="text-gray-400">3.4%</span>
              </div>
            </div>

            {/* Progress 3 */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-gray-900">Driver Unknown A</span>
                <span className="text-gray-500"><span className="text-gray-900">7,500</span> / 10,000 kg</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "75%" }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold mt-2 text-amber-600">
                <span>Limited Capacity</span>
                <span className="text-gray-400">75%</span>
              </div>
            </div>

            {/* Progress 4 */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-gray-900">Driver Unknown A</span>
                <span className="text-gray-500"><span className="text-gray-900">10,000</span> / 10,000 kg</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-rose-600 rounded-full" style={{ width: "100%" }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold mt-2 text-rose-600">
                <span>Full</span>
                <span className="text-gray-400">100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Cards */}
        <div className="space-y-6 flex flex-col">
          {/* Order Status Breakdown */}
          <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-sm flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Order Status Breakdown</h3>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 h-full pb-4">
              {/* Donut Chart */}
              <div className="relative w-36 h-36 flex-none">
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "conic-gradient(#0B5D1E 0% 41%, #E1AA24 41% 68%, #39A04B 68% 100%)",
                  }}
                ></div>
                <div className="absolute inset-[18%] bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-gray-900">100%</span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Total</span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                {/* Pending */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Pending</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">9%</span>
                </div>
                {/* Forwarded */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Forwarded</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">27%</span>
                </div>
                {/* Assigned */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0B5D1E]"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Assigned</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">41%</span>
                </div>
                {/* Completed */}
                <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#39A04B]"></div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Completed</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">23%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Assignment Status */}
          <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Driver Assignment Status</h3>
            <div className="flex justify-end text-sm font-extrabold text-gray-900 mb-2">100%</div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#0B5D1E] rounded-full w-full"></div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-3 font-medium">All forwarded orders currently have assigned drivers.</p>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Delivery Management Table */}
        <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Delivery Management</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF7E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0B5D1E]">
                  <th className="px-5 py-3 whitespace-nowrap">Batch No.</th>
                  <th className="px-5 py-3 whitespace-nowrap">Retailer</th>
                  <th className="px-5 py-3 whitespace-nowrap">Variant</th>
                  <th className="px-5 py-3 whitespace-nowrap">Qty (kg)</th>
                  <th className="px-5 py-3 whitespace-nowrap">Target Arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DeliveryManagementData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-700 whitespace-nowrap">{row.batchNo}</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">{row.retailer}</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">{row.variant}</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">{row.qty}</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">{row.arrival}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-center mt-auto">
            <Link to="/miller-logistics/delivery-management" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0B5D1E] hover:text-emerald-800 uppercase tracking-wider transition-colors">
              View Delivery Management <ChevronRight size={14} strokeWidth={3} />
            </Link>
          </div>
        </div>

        {/* Product Return Issues Table */}
        <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Product Return Issues</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF7E8] text-[10px] font-extrabold uppercase tracking-wider text-[#0B5D1E]">
                  <th className="px-5 py-3 whitespace-nowrap">Variant</th>
                  <th className="px-5 py-3 whitespace-nowrap">Order No.</th>
                  <th className="px-5 py-3 whitespace-nowrap">Retailer</th>
                  <th className="px-5 py-3 whitespace-nowrap">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ProductReturnsData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">{row.variant}</td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-700 whitespace-nowrap">{row.orderNo}</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">{row.retailer}</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600 whitespace-nowrap">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-center mt-auto">
            <Link to="/miller-logistics/product-returns" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0B5D1E] hover:text-emerald-800 uppercase tracking-wider transition-colors">
              View Product Return Issues <ChevronRight size={14} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MillerLogisticsDashboard;
