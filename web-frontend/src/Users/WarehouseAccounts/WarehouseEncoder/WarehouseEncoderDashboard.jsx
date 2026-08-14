import { useMemo } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import KPICard from "../../../Components/Graphs/KPICard";
import CategoryBarCard from "../../../Components/Graphs/BarGraphsCard";
import RecentActivityCard from "../../../Components/Graphs/RecentActivityCard";
import { DollarSign, ShoppingCart, Users, Package } from "lucide-react";

const sampleBars = [
	{ label: "Supplier A", value: 89 },
	{ label: "Supplier B", value: 13 },
	{ label: "Supplier C", value: 64 },
	{ label: "Supplier D", value: 24 },
];

const sampleActivity = [
	{ id: "e1", title: "New Supplier Registered", description: "Supplier X joined the platform", time: "5 mins ago", icon: Users, color: "#0B7A2A" },
	{ id: "e2", title: "Order Received", description: "Order #1234 placed", time: "20 mins ago", icon: ShoppingCart, color: "#0F9D2A" },
	{ id: "e3", title: "Payment Received", description: "Payment cleared for order #1220", time: "1 hour ago", icon: DollarSign, color: "#0B7A2A" },
];

export default function WarehouseEncoderDashboard() {
	const metrics = useMemo(() => [
		{ title: "Today's Sales", value: "₱24,580", footer: "Sales recorded today", icon: <DollarSign size={18} strokeWidth={2.2} />, tone: "success" },
		{ title: "Open Orders", value: "128", footer: "Awaiting processing", icon: <ShoppingCart size={18} strokeWidth={2.2} />, tone: "warning" },
		{ title: "Active Users", value: "1,204", footer: "Across all roles", icon: <Users size={18} strokeWidth={2.2} />, tone: "neutral" },
		{ title: "Fulfillment Rate", value: "98%", footer: "Orders completed on time", icon: <Package size={18} strokeWidth={2.2} />, tone: "success" },
	], []);

	return (
		<div className="space-y-6">
			<div>
				<Breadcrumbs items={[{ label: "Main" }, { label: "Dashboard" }]} />
				<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Warehouse Encoder Dashboard</h1>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{metrics.map((m) => (
					<KPICard key={m.title} {...m} />
				))}
			</div>

			<div className="grid gap-6 xl:grid-cols-3">
				<CategoryBarCard title="Supplier Employee Distributions" items={sampleBars} seriesLabel="2026" className="h-full xl:col-span-2" />
				<RecentActivityCard title="Recent Activity" items={sampleActivity} />
			</div>
		</div>
	);
}