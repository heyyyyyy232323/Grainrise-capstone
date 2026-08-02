import { useState } from "react";
import { BadgeDollarSign, TrendingUp, Coins, ClipboardList, CheckCircle } from "lucide-react";
import KPICard from "../../../Components/Graphs/KPICard";
import DistributionCard from "../../../Components/Graphs/PieChartCard";
import SalesTrendCard from "../../../Components/Graphs/LineGraphsCard";
import RecentActivityCard from "../../../Components/Graphs/RecentActivityCard";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateDisplay from "../../../Components/Minor-Components/DateDisplay";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const WarehouseSalesDashboard = () => {
  const [selectedTrendRange, setSelectedTrendRange] = useState("Week");

  const lastUpdatedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const salesMetrics = [
    { 
      title: "TODAY'S SALES", 
      value: "₱24,580", 
      trend: "Sales recorded today", 
      icon: <BadgeDollarSign size={18} strokeWidth={2.2} />, 
      tone: "success" 
    },
    { 
      title: "SALES THIS MONTH", 
      value: "₱548,920", 
      trend: "Accumulated monthly revenue", 
      icon: <TrendingUp size={18} strokeWidth={2.2} />, 
      tone: "success" 
    },
    { 
      title: "POTENTIAL SALES", 
      value: "₱1.5M", 
      trend: "Estimated revenue from active and pending sales", 
      icon: <Coins size={18} strokeWidth={2.2} />, 
      tone: "success" 
    },
    { 
      title: "PENDING ONLINE ORDERS", 
      value: "12 Orders", 
      trend: "Requires seller attention", 
      icon: <ClipboardList size={18} strokeWidth={2.2} />, 
      tone: "warning" 
    },
  ];

  const salesTrendData = [
    { label: "Week 1", value: 55000 },
    { label: "Week 2", value: 135000 },
    { label: "Week 3", value: 101000 },
    { label: "Week 4", value: 168000 },
  ];

  const rangeOptions = [
    { label: "Week", value: "Week" },
    { label: "Month", value: "Month" },
    { label: "Year", value: "Year" }
  ];

  const salesDistribution = [
    { label: "Walk-in Sales", value: 65, color: "#0B7A2A" },
    { label: "Online Sales", value: 35, color: "#E0AC1C" },
  ];

  const recentOrderActivity = [
    { 
      id: "activity-1", 
      title: "New Online Order Received", 
      description: "Order #1060 from Sarah Miller - P2,450.00", 
      time: "10:05 AM", 
      icon: CheckCircle, 
      color: "#0B7A2A" 
    },
    { 
      id: "activity-2", 
      title: "New Online Order Received", 
      description: "Order #1060 from Sarah Miller - P2,450.00", 
      time: "10:05 AM", 
      icon: CheckCircle, 
      color: "#0B7A2A" 
    },
    { 
      id: "activity-3", 
      title: "New Online Order Received", 
      description: "Order #1060 from Sarah Miller - P2,450.00", 
      time: "10:05 AM", 
      icon: CheckCircle, 
      color: "#0B7A2A" 
    },
  ];

  const topSellingColumns = [
    {
      key: "rank",
      label: "Rank",
      width: "60px",
      render: (row) => {
        if (row.rank <= 3) {
          return (
            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-800 text-white text-[11px] font-bold">
              {row.rank}
            </div>
          );
        }
        return (
          <div className="flex items-center justify-center h-5 w-5 text-gray-500 text-[11px] font-bold">
            {row.rank}
          </div>
        );
      },
    },
    { key: "product", label: "Product" },
    { key: "quantity", label: "Quantity Sold" },
  ];

  const topSellingProducts = [
    { id: 1, rank: 1, product: "Dinorado", quantity: "130kg" },
    { id: 2, rank: 2, product: "Dinorado", quantity: "130kg" },
    { id: 3, rank: 3, product: "Dinorado", quantity: "130kg" },
    { id: 4, rank: 4, product: "Dinorado", quantity: "130kg" },
    { id: 5, rank: 5, product: "Dinorado", quantity: "130kg" },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Main", path: "/warehouse-sales/dashboard" },
          { label: "Dashboard" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Last Updated: Today , {lastUpdatedTime}
          </p>
        </div>
        <DateDisplay />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {salesMetrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <SalesTrendCard
            title="Sales Trend"
            data={salesTrendData}
            selectedRange={selectedTrendRange}
            rangeOptions={rangeOptions}
            onRangeChange={setSelectedTrendRange}
            maxValue={200000}
            axisFormatter={(val) => `₱${val / 1000}k`}
            valueFormatter={(val) => `₱${val / 1000}k`}
          />
        </div>
        <div>
          <DistributionCard
            title="Sales Distribution"
            totalLabel="100% Revenue"
            items={salesDistribution}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RecentActivityCard
          title="Recent Order Activity"
          activities={recentOrderActivity}
        />
        <SectionedTableCard
          title="Top Selling Products"
          columns={topSellingColumns}
          sections={[{ rows: topSellingProducts }]}
        />
      </div>
    </>
  );
};

export default WarehouseSalesDashboard;
