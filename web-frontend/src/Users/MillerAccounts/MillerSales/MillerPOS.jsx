import { useMemo, useState } from "react";
import POSProductCard from "../../../Components/Minor-Components/POSProductCard";
import POSCartCard from "../../../Components/Minor-Components/POSCartCard";
import PaginationControls from "../../../Components/Minor-Components/PaginationControls";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import { ChevronDown } from "lucide-react";

const sampleProducts = Array.from({ length: 15 }, (_, i) => ({
	id: `p-${i + 1}`,
	name: "Dinorado Rice",
	sku: `WR-00${(i % 6) + 1}`,
	price: 1500,
	unitLabel: "Per Sack",
	stockAvailable: 300 - i * 5,
}));

const stockFilterOptions = [
	{ value: "all", label: "All" },
	{ value: "in-stock", label: "Products In Stock" },
	{ value: "low-stock", label: "Low Stock Products" },
];

const PRODUCTS_PER_PAGE = 6;
const LOW_STOCK_THRESHOLD = 50;

export default function MillerPOS() {
	const [products] = useState(sampleProducts);
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState("all");
	const [page, setPage] = useState(1);

	const [cartItems, setCartItems] = useState([]); // { id, productId, name, price, quantity }
	const [paymentMethod] = useState("Cash");
	const [cash, setCash] = useState(0);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return products.filter((p) => {
			if (q && !(`${p.name} ${p.sku}`.toLowerCase().includes(q))) return false;
			if (filter === "in-stock") return p.stockAvailable > 0;
			if (filter === "low-stock") return p.stockAvailable > 0 && p.stockAvailable < LOW_STOCK_THRESHOLD;
			return true;
		});
	}, [products, query, filter]);

	const inStockCount = useMemo(() => products.filter((p) => p.stockAvailable > 0).length, [products]);
	const lowStockCount = useMemo(
		() => products.filter((p) => p.stockAvailable > 0 && p.stockAvailable < LOW_STOCK_THRESHOLD).length,
		[products]
	);

	const totalPages = Math.max(Math.ceil(filtered.length / PRODUCTS_PER_PAGE), 1);
	const safePage = Math.min(page, totalPages);

	const paginated = useMemo(() => {
		const start = (safePage - 1) * PRODUCTS_PER_PAGE;
		return filtered.slice(start, start + PRODUCTS_PER_PAGE);
	}, [filtered, safePage]);

	const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PRODUCTS_PER_PAGE + 1;
	const rangeEnd = Math.min(safePage * PRODUCTS_PER_PAGE, filtered.length);

	const handleSearchChange = (value) => {
		setQuery(value);
		setPage(1);
	};

	const handleFilterChange = (value) => {
		setFilter(value);
		setPage(1);
	};

	const togglePillFilter = (value) => {
		setFilter((prev) => (prev === value ? "all" : value));
		setPage(1);
	};

	const handleAddToCart = (product) => {
		setCartItems((prev) => {
			const idx = prev.findIndex((it) => it.productId === product.id);
			if (idx !== -1) {
				const copy = [...prev];
				copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
				return copy;
			}
			return [
				...prev,
				{ id: `ci-${product.id}`, productId: product.id, name: product.name, price: product.price, quantity: 1 },
			];
		});
	};

	const handleQuantityChange = (cartId, qty) => {
		setCartItems((prev) => prev.map((it) => (it.id === cartId ? { ...it, quantity: qty } : it)).filter((it) => it.quantity > 0));
	};

	const handleRemove = (cartId) => setCartItems((prev) => prev.filter((it) => it.id !== cartId));

	const itemCount = useMemo(() => cartItems.reduce((s, it) => s + it.quantity, 0), [cartItems]);
	const subtotal = useMemo(() => cartItems.reduce((s, it) => s + it.price * it.quantity, 0), [cartItems]);
	const total = subtotal;
	const change = Math.max(0, cash - total);

	return (
		<div className="w-full">
			<Breadcrumbs
				items={[
					{ label: "Sales", path: "/sales" },
					{ label: "Point of Sale" },
				]}
			/>

			<div className="mb-4">
				<h1 className="text-2xl md:text-3xl font-bold text-gray-900">Point of Sale</h1>
				<p className="text-sm text-slate-500">Browse available miller products and process walk-in retailer transactions efficiently.</p>
			</div>

			<div className="flex flex-col lg:flex-row gap-6">
				{/* Products area */}
				<div className="flex-1">
					<div className="flex gap-3 mb-4 items-center">
						<div className="flex-1">
							<SearchFilter
								onSearch={handleSearchChange}
								placeholder="Search product code, variant, or product name"
							/>
						</div>
						<SortByDropdown
							value={filter}
							onChange={handleFilterChange}
							options={stockFilterOptions}
						/>
					</div>

					<div className="flex gap-3 mb-5">
						<button
							type="button"
							onClick={() => togglePillFilter("in-stock")}
							className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
								filter === "in-stock"
									? "bg-emerald-600 text-white"
									: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
							}`}
						>
							{inStockCount} Products In Stock
						</button>
						<button
							type="button"
							onClick={() => togglePillFilter("low-stock")}
							className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
								filter === "low-stock"
									? "bg-amber-500 text-white"
									: "bg-amber-50 text-amber-700 hover:bg-amber-100"
							}`}
						>
							{lowStockCount} Low Stock Products
						</button>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{paginated.map((p) => (
							<POSProductCard
								key={p.id}
								name={p.name}
								sku={p.sku}
								price={p.price}
								unitLabel={p.unitLabel}
								stockAvailable={p.stockAvailable}
								onAddToCart={() => handleAddToCart(p)}
							/>
						))}
					</div>

					{paginated.length === 0 ? (
						<div className="mt-6 text-sm text-slate-500">No products match your search.</div>
					) : (
						<div className="mt-6">
							<PaginationControls
								currentPage={safePage}
								totalPages={totalPages}
								onPageChange={setPage}
								pageLabel={`Showing ${rangeStart}-${rangeEnd} of ${filtered.length} products`}
							/>
						</div>
					)}
				</div>

				{/* Cart column */}
				<aside className="w-full lg:w-[400px] sticky top-20 self-start">
					<div className="flex max-h-[calc(100vh-6rem)] flex-col rounded-md border border-slate-200 bg-white">
						<div className="flex items-center justify-between px-4 pt-4">
							<h3 className="text-lg font-bold text-slate-900">Current Sale</h3>
							<span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white">
								Items: {itemCount}
							</span>
						</div>

						<div className="mt-3 flex-1 space-y-3 overflow-y-auto px-4">
							{cartItems.length === 0 ? (
								<div className="text-sm text-slate-500 pb-4">No items in cart</div>
							) : (
								cartItems.map((it) => (
									<POSCartCard
										key={it.id}
										name={it.name}
										price={it.price}
										quantity={it.quantity}
										onQuantityChange={(qty) => handleQuantityChange(it.id, qty)}
										onRemove={() => handleRemove(it.id)}
									/>
								))
							)}
						</div>

						<div className="border-t border-slate-100 px-4 py-4 space-y-3">
							<div className="flex items-center justify-between text-sm text-slate-600">
								<span>Subtotal</span>
								<span>₱{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-base font-bold text-slate-900">Total</span>
								<span className="text-base font-bold text-slate-900">
									₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
								</span>
							</div>

							<button
								type="button"
								className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left"
							>
								<div>
									<p className="text-xs text-slate-500">Payment Method</p>
									<p className="text-sm font-bold text-slate-900">{paymentMethod}</p>
								</div>
								<ChevronDown size={16} className="text-slate-400" />
							</button>

							<div>
								<label className="text-xs text-slate-500">Amount Paid</label>
								<div className="mt-1 flex items-center rounded-md border border-slate-200 px-3 py-2">
									<span className="mr-1 text-slate-500">₱</span>
									<input
										type="number"
										value={cash}
										onChange={(e) => setCash(Number(e.target.value))}
										className="w-full text-right outline-none text-slate-500"
									/>
								</div>
							</div>

							<div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-3">
								<span className="text-base font-bold text-slate-900">Change</span>
								<span className="text-base font-bold text-emerald-700">
									₱{change.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
								</span>
							</div>

							<div className="flex gap-3 pt-1">
								<button
									onClick={() => setCartItems([])}
									className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
								>
									Clear Cart
								</button>
								<CustomGreenButton
									text="Complete Transaction"
									className="flex-1 !rounded-md"
								/>
							</div>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}
