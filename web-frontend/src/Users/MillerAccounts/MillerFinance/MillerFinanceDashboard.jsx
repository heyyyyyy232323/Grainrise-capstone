import { useMemo, useState } from "react";
import { BadgeDollarSign, CalendarDays, CircleCheckBig, CircleX, TrendingUp } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";
import RevenueExpenseTrendChart from "../../../Components/Graphs/RevenueExpenseTrendChart";

const periodOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Overall", value: "overall" },
];

const chartDataByPeriod = {
  daily: {
    revenue: [
      { label: "Mon", value: 122000 },
      { label: "Tue", value: 168000 },
      { label: "Wed", value: 151000 },
      { label: "Thu", value: 183000 },
      { label: "Fri", value: 176000 },
      { label: "Sat", value: 208000 },
      { label: "Sun", value: 199000 },
    ],
    expenses: [
      { label: "Mon", value: 81000 },
      { label: "Tue", value: 109000 },
      { label: "Wed", value: 95000 },
      { label: "Thu", value: 124000 },
      { label: "Fri", value: 116000 },
      { label: "Sat", value: 137000 },
      { label: "Sun", value: 129000 },
    ],
  },
  weekly: {
    revenue: [
      { label: "W1", value: 126000 },
      { label: "W2", value: 191000 },
      { label: "W3", value: 149000 },
      { label: "W4", value: 218000 },
      { label: "W5", value: 178000 },
      { label: "W6", value: 245000 },
      { label: "W7", value: 205000 },
      { label: "W8", value: 276000 },
    ],
    expenses: [
      { label: "W1", value: 78000 },
      { label: "W2", value: 112000 },
      { label: "W3", value: 95000 },
      { label: "W4", value: 141000 },
      { label: "W5", value: 121000 },
      { label: "W6", value: 161000 },
      { label: "W7", value: 145000 },
      { label: "W8", value: 179000 },
    ],
  },
  monthly: {
    revenue: [
      { label: "Jan", value: 121000 },
      { label: "Feb", value: 188000 },
      { label: "Mar", value: 150000 },
      { label: "Apr", value: 219000 },
      { label: "May", value: 179000 },
      { label: "Jun", value: 247000 },
      { label: "Jul", value: 206000 },
      { label: "Aug", value: 276000 },
      { label: "Sep", value: 236000 },
      { label: "Oct", value: 289000 },
      { label: "Nov", value: 257000 },
      { label: "Dec", value: 315081 },
    ],
    expenses: [
      { label: "Jan", value: 82000 },
      { label: "Feb", value: 110000 },
      { label: "Mar", value: 96000 },
      { label: "Apr", value: 140000 },
      { label: "May", value: 120000 },
      { label: "Jun", value: 160000 },
      { label: "Jul", value: 145000 },
      { label: "Aug", value: 178000 },
      { label: "Sep", value: 165000 },
      { label: "Oct", value: 188000 },
      { label: "Nov", value: 174000 },
      { label: "Dec", value: 217729 },
    ],
  },
  yearly: {
    revenue: [
      { label: "2022", value: 1630000 },
      { label: "2023", value: 1910000 },
      { label: "2024", value: 2200000 },
      { label: "2025", value: 2810000 },
      { label: "2026", value: 3150810 },
    ],
    expenses: [
      { label: "2022", value: 1090000 },
      { label: "2023", value: 1240000 },
      { label: "2024", value: 1480000 },
      { label: "2025", value: 1870000 },
      { label: "2026", value: 2177290 },
    ],
  },
  overall: {
    revenue: [
      { label: "Q1", value: 540000 },
      { label: "Q2", value: 710000 },
      { label: "Q3", value: 860000 },
      { label: "Q4", value: 1040000 },
      { label: "Q5", value: 1250000 },
      { label: "Q6", value: 1460000 },
    ],
    expenses: [
      { label: "Q1", value: 360000 },
      { label: "Q2", value: 470000 },
      { label: "Q3", value: 530000 },
      { label: "Q4", value: 650000 },
      { label: "Q5", value: 780000 },
      { label: "Q6", value: 910000 },
    ],
  },
};

const formatCurrency = (value) =>
  `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MillerFinanceDashboard() {
  const [selectedRange, setSelectedRange] = useState("monthly");

  const chartSeries = useMemo(() => {
    const current = chartDataByPeriod[selectedRange] || chartDataByPeriod.monthly;

    return [
      {
        key: "revenue",
        label: "Revenue",
        data: current.revenue,
        lineColor: "#16C38A",
        fillColor: "rgba(22, 195, 138, 0.12)",
        strokeWidth: 1.25,
      },
      {
        key: "expenses",
        label: "Expenses",
        data: current.expenses,
        lineColor: "#D94B44",
        fillColor: "rgba(217, 75, 68, 0.06)",
        strokeWidth: 1.1,
      },
    ];
  }, [selectedRange]);

  const metrics = [
    {
      title: "Unpaid Expenses",
      value: "₱21,012.70",
      footer: "Outstanding payments",
      tone: "danger",
      icon: <CircleX size={18} strokeWidth={2.2} />,
    },
    {
      title: "Paid Expenses",
      value: "₱196,716.30",
      footer: "Cleared payments",
      tone: "success",
      icon: <CircleCheckBig size={18} strokeWidth={2.2} />,
    },
    {
      title: "Total Expenses",
      value: "₱217,729.00",
      footer: "Total recorded expenses",
      tone: "warning",
      icon: <BadgeDollarSign size={18} strokeWidth={2.2} />,
    },
    {
      title: "Net Revenue",
      value: "₱315,081.00",
      footer: "Revenue after expenses",
      tone: "success",
      variant: "solid",
      icon: <TrendingUp size={18} strokeWidth={2.2} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
          <h1 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">Last Updated: Today · 10:42 AM</p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
          <CalendarDays size={16} className="text-slate-500" />
          <span>July 19, 2026</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <KPICard key={metric.title} {...metric} />
        ))}
      </div>

      <RevenueExpenseTrendChart
        title="Expenses vs Revenue"
        subtitle="Performance over selected period"
        selectedRange={selectedRange}
        rangeOptions={periodOptions}
        onRangeChange={setSelectedRange}
        series={chartSeries}
        height={320}
        axisFormatter={(value) => `₱${Math.round(value / 1000)}k`}
        valueFormatter={formatCurrency}
      />
    </div>
  );
}
