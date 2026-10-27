import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import POSProductCard from "../../../Components/Minor-Components/POSProductCard";
import POSCartCard from "../../../Components/Minor-Components/POSCartCard";
import PaginationControls from "../../../Components/Minor-Components/PaginationControls";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import WarehousePOSPaymentProofModal from "../../../Components/Modals/WarehouseSales/WarehousePOSPaymentProofModal";
import WarehousePOSSalesReceiptModal from "../../../Components/Modals/WarehouseSales/WarehousePOSSalesReceiptModal";
import {
	ChevronDown,
	AlertCircle,
	RefreshCw,
	QrCode,
	Camera,
	CheckCircle2,
} from "lucide-react";

const API_BASE = (
	import.meta.env.VITE_API_BASE_URL ||
	import.meta.env.VITE_API_URL ||
	"http://127.0.0.1:8000"
).replace(/\/$/, "");

function getAuthToken() {
	return (
		sessionStorage.getItem("grainrise_token") ||
		localStorage.getItem("grainrise_token") ||
		localStorage.getItem("access_token") ||
		""
	);
}

function resolveMediaUrl(url) {
	if (!url || typeof url !== "string") return "";
	const trimmed = url.trim();
	if (!trimmed) return "";
	if (
		trimmed.startsWith("http://") ||
		trimmed.startsWith("https://") ||
		trimmed.startsWith("data:") ||
		trimmed.startsWith("blob:")
	) {
		return trimmed;
	}
	if (trimmed.startsWith("/")) {
		return `${API_BASE}${trimmed}`;
	}
	return `${API_BASE}/media/${trimmed}`;
}

function makeIdempotencyKey() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return `pos-${crypto.randomUUID()}`;
	}
	return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const stockFilterOptions = [
	{ value: "all", label: "All" },
	{ value: "in-stock", label: "Products In Stock" },
	{ value: "low-stock", label: "Low Stock Products" },
];

const PAYMENT_METHODS = ["Cash", "GCash", "Bank Transfer"];

const PRODUCTS_PER_PAGE = 6;
const LOW_STOCK_THRESHOLD = 50;

export default function WarehousePOS() {
	const [products, setProducts] = useState([]);
	const [paymentAccounts, setPaymentAccounts] = useState([]);
	const [loadingProducts, setLoadingProducts] = useState(true);
	const [refreshingStock, setRefreshingStock] = useState(false);
	const [fetchError, setFetchError] = useState("");

	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState("all");
	const [page, setPage] = useState(1);

	// Cart items: { id, productId, name, price, quantity, rawQuantity, stockAvailable, expiryFormatted }
	const [cartItems, setCartItems] = useState([]);
	const [paymentMethod, setPaymentMethod] = useState("Cash");
	const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
	const [selectedCredentialsId, setSelectedCredentialsId] = useState(null);
	const [cashInput, setCashInput] = useState("");

	const [checkoutError, setCheckoutError] = useState("");
	const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
	const [showProofModal, setShowProofModal] = useState(false);
	const [completedReceipt, setCompletedReceipt] = useState(null);
	const [showReceiptModal, setShowReceiptModal] = useState(false);

	const idempotencyKeyRef = useRef(makeIdempotencyKey());
	const dropdownRef = useRef(null);

	const fetchPosInventory = useCallback(async (isSilentRefresh = false) => {
		if (isSilentRefresh) {
			setRefreshingStock(true);
		} else {
			setLoadingProducts(true);
		}
		setFetchError("");

		try {
			const token = getAuthToken();
			const res = await fetch(`${API_BASE}/api/warehouse/sales/pos/products/`, {
				method: "GET",
				headers: {
					Accept: "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			});

			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.detail || "Failed to load POS products.");
			}

			const mappedProducts = (Array.isArray(data.products) ? data.products : []).map((p) => ({
				id: p.warehouse_product_id || p.product_id || p.id,
				warehouse_product_id: p.warehouse_product_id || p.product_id || p.id,
				name: p.productName || p.product_name || "Unnamed Product",
				sku: p.product_code || p.sku || "",
				category: p.category || "General",
				productType: p.productType || "Rice",
				price: Number(p.selling_price_per_sack ?? p.price ?? 0),
				unitCostPerKg: Number(p.unit_cost_per_kg ?? 0),
				unitLabel: "Per Sack",
				stockAvailable: Number(p.stockAvailable ?? p.available_sacks ?? 0),
				stockUnit: "sacks",
				image: p.image || "",
				expiryDate: p.expiryDate || null,
				expiryFormatted: p.expiryFormatted || "—",
			}));

			setProducts(mappedProducts);
			setPaymentAccounts(Array.isArray(data.payment_accounts) ? data.payment_accounts : []);

			// Synchronize existing cart items with latest stock & prices
			setCartItems((prevCart) => {
				if (prevCart.length === 0) return prevCart;
				const byId = new Map(mappedProducts.map((mp) => [mp.id, mp]));
				return prevCart
					.map((item) => {
						const latest = byId.get(item.productId);
						if (!latest || latest.stockAvailable < 1) {
							return null;
						}
						const clampedQty = Math.min(item.quantity, latest.stockAvailable);
						return {
							...item,
							name: latest.name,
							price: latest.price,
							stockAvailable: latest.stockAvailable,
							quantity: clampedQty,
							rawQuantity: String(clampedQty),
						};
					})
					.filter(Boolean);
			});
		} catch (err) {
			setFetchError(err.message || "Unable to load POS products.");
		} finally {
			setLoadingProducts(false);
			setRefreshingStock(false);
		}
	}, []);

	useEffect(() => {
		fetchPosInventory(false);
	}, [fetchPosInventory]);

	// Close payment method dropdown on outside click
	useEffect(() => {
		const handleOutside = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
				setShowPaymentDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleOutside);
		return () => document.removeEventListener("mousedown", handleOutside);
	}, []);

	// Filter configured payment accounts matching current payment method
	const matchingPaymentAccounts = useMemo(() => {
		if (paymentMethod === "GCash") {
			return paymentAccounts.filter((a) => (a.type || "").toLowerCase() === "gcash" && a.is_active);
		}
		if (paymentMethod === "Bank Transfer") {
			return paymentAccounts.filter((a) => (a.type || "").toLowerCase() === "bank" && a.is_active);
		}
		return [];
	}, [paymentAccounts, paymentMethod]);

	const activePaymentAccount = useMemo(() => {
		if (matchingPaymentAccounts.length === 0) return null;
		if (selectedCredentialsId) {
			const found = matchingPaymentAccounts.find(
				(a) => Number(a.credentials_id) === Number(selectedCredentialsId)
			);
			if (found) return found;
		}
		return matchingPaymentAccounts[0];
	}, [matchingPaymentAccounts, selectedCredentialsId]);

	useEffect(() => {
		if (matchingPaymentAccounts.length > 0) {
			setSelectedCredentialsId(matchingPaymentAccounts[0].credentials_id);
		} else {
			setSelectedCredentialsId(null);
		}
	}, [paymentMethod, matchingPaymentAccounts]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return products.filter((p) => {
			if (p.stockAvailable < 1) return false;
			if (
				q &&
				!`${p.name} ${p.sku} ${p.category} ${p.productType}`
					.toLowerCase()
					.includes(q)
			) {
				return false;
			}
			if (filter === "in-stock") return p.stockAvailable > 0;
			if (filter === "low-stock")
				return p.stockAvailable > 0 && p.stockAvailable < LOW_STOCK_THRESHOLD;
			return true;
		});
	}, [products, query, filter]);

	const inStockCount = useMemo(
		() => products.filter((p) => p.stockAvailable > 0).length,
		[products]
	);
	const lowStockCount = useMemo(
		() =>
			products.filter(
				(p) => p.stockAvailable > 0 && p.stockAvailable < LOW_STOCK_THRESHOLD
			).length,
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
		setCheckoutError("");
		if (!product || product.stockAvailable < 1) {
			setCheckoutError(`'${product?.name || "Product"}' is out of stock.`);
			return;
		}

		let exceeded = false;
		setCartItems((prev) => {
			const idx = prev.findIndex((it) => it.productId === product.id);
			if (idx !== -1) {
				const existing = prev[idx];
				if (existing.quantity >= product.stockAvailable) {
					exceeded = true;
					return prev;
				}
				const nextQty = Math.min(existing.quantity + 1, product.stockAvailable);
				const copy = [...prev];
				copy[idx] = {
					...existing,
					price: product.price,
					stockAvailable: product.stockAvailable,
					quantity: nextQty,
					rawQuantity: String(nextQty),
				};
				return copy;
			}
			return [
				...prev,
				{
					id: `ci-${product.id}`,
					productId: product.id,
					name: product.name,
					price: product.price,
					quantity: 1,
					rawQuantity: "1",
					stockAvailable: product.stockAvailable,
					expiryFormatted: product.expiryFormatted,
				},
			];
		});

		if (exceeded) {
			setCheckoutError(
				`Maximum available stock reached for '${product.name}' (${product.stockAvailable} ${
					product.stockAvailable === 1 ? "sack" : "sacks"
				}).`
			);
		}
		idempotencyKeyRef.current = makeIdempotencyKey();
	};

	const handleQuantityChange = (cartId, qty) => {
		setCheckoutError("");
		setCartItems((prev) =>
			prev
				.map((it) => {
					if (it.id !== cartId) return it;
					if (qty <= 0) return null;
					const clamped = Math.min(qty, it.stockAvailable);
					return {
						...it,
						quantity: clamped,
						rawQuantity: String(clamped),
					};
				})
				.filter(Boolean)
		);
		idempotencyKeyRef.current = makeIdempotencyKey();
	};

	const handleRawQuantityChange = (cartId, rawVal) => {
		setCheckoutError("");
		setCartItems((prev) =>
			prev.map((it) => (it.id === cartId ? { ...it, rawQuantity: rawVal } : it))
		);
	};

	const handleRemove = (cartId) => {
		setCheckoutError("");
		setCartItems((prev) => prev.filter((it) => it.id !== cartId));
		idempotencyKeyRef.current = makeIdempotencyKey();
	};

	const handleClearCart = () => {
		setCheckoutError("");
		setCartItems([]);
		setCashInput("");
		setPaymentMethod("Cash");
		setSelectedCredentialsId(null);
		idempotencyKeyRef.current = makeIdempotencyKey();
	};


	const itemCount = useMemo(
		() => cartItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0),
		[cartItems]
	);
	const subtotal = useMemo(
		() =>
			cartItems.reduce(
				(s, it) => s + Number(it.price || 0) * (Number(it.quantity) || 0),
				0
			),
		[cartItems]
	);
	const total = subtotal;

	const parsedCash = useMemo(() => {
		if (paymentMethod !== "Cash") return total;
		const n = parseFloat(String(cashInput).trim());
		return Number.isFinite(n) && n >= 0 ? n : 0;
	}, [cashInput, paymentMethod, total]);

	const change = useMemo(() => {
		if (paymentMethod !== "Cash") return 0;
		return Math.max(0, parsedCash - total);
	}, [paymentMethod, parsedCash, total]);

	const validateCartBeforeCheckout = () => {
		if (cartItems.length === 0) {
			return "Your cart is empty. Please add at least one product before completing a transaction.";
		}

		const productById = new Map(products.map((p) => [p.id, p]));
		for (const item of cartItems) {
			const rawStr = String(item.rawQuantity ?? item.quantity ?? "").trim();
			if (!rawStr || !/^\d+$/.test(rawStr)) {
				return `Invalid quantity for '${item.name}'. Please enter a positive whole number of sacks.`;
			}
			const parsedQty = parseInt(rawStr, 10);
			if (!Number.isInteger(parsedQty) || parsedQty < 1) {
				return `Quantity for '${item.name}' must be at least 1 sack (zero, negative, or decimal quantities are not allowed).`;
			}
			const latestProd = productById.get(item.productId);
			if (!latestProd || latestProd.stockAvailable < 1) {
				return `'${item.name}' is no longer available in stock.`;
			}
			if (parsedQty > latestProd.stockAvailable) {
				return `Quantity for '${item.name}' (${parsedQty} sacks) exceeds available stock (${latestProd.stockAvailable} sacks).`;
			}
		}

		if (total <= 0) {
			return "Invalid checkout total.";
		}

		return null;
	};

	const submitPosCheckout = async ({
		methodKey,
		amountPaidValue,
		referenceNo = null,
		credentialsId = null,
		paymentProofImage = null,
		paymentConfirmed = false,
	}) => {
		setIsSubmittingCheckout(true);
		setCheckoutError("");

		try {
			const token = getAuthToken();
			const payload = {
				items: cartItems.map((it) => ({
					product_id: it.productId,
					productName: it.name,
					quantity: parseInt(String(it.rawQuantity ?? it.quantity), 10),
				})),
				payment_method: methodKey,
				amount_paid: amountPaidValue,
				reference_no: referenceNo,
				credentials_id: credentialsId,
				payment_proof_image: paymentProofImage,
				payment_confirmed: paymentConfirmed,
				idempotency_key: idempotencyKeyRef.current,
			};

			const res = await fetch(`${API_BASE}/api/warehouse/sales/pos/checkout/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(payload),
			});

			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.detail || data.message || "Failed to complete POS transaction.");
			}

			// Checkout succeeded! Clear cart, reset to Cash, refresh inventory, and open receipt modal
			setShowProofModal(false);
			setCartItems([]);
			setCashInput("");
			setPaymentMethod("Cash");
			setSelectedCredentialsId(null);
			idempotencyKeyRef.current = makeIdempotencyKey();
			await fetchPosInventory(true);

			if (data.receipt) {
				setCompletedReceipt(data.receipt);
				setShowReceiptModal(true);
			}

		} catch (err) {
			setCheckoutError(err.message || "Transaction failed. Please try again.");
			throw err;
		} finally {
			setIsSubmittingCheckout(false);
		}
	};

	const handleCompleteTransactionClick = async () => {
		setCheckoutError("");
		const cartErr = validateCartBeforeCheckout();
		if (cartErr) {
			setCheckoutError(cartErr);
			return;
		}

		if (paymentMethod === "Cash") {
			const rawCashTrimmed = String(cashInput).trim();
			if (rawCashTrimmed === "") {
				setCheckoutError("Please enter the Amount Paid for this Cash transaction.");
				return;
			}
			const numericCash = Number(rawCashTrimmed);
			if (!Number.isFinite(numericCash) || numericCash < 0) {
				setCheckoutError("Please enter a valid Amount Paid.");
				return;
			}
			if (numericCash < total) {
				setCheckoutError(
					`Insufficient Amount Paid. Total payable is ₱${total.toLocaleString("en-PH", {
						minimumFractionDigits: 2,
					})}, but Amount Paid is ₱${numericCash.toLocaleString("en-PH", {
						minimumFractionDigits: 2,
					})}.`
				);
				return;
			}

			try {
				await submitPosCheckout({
					methodKey: "cash",
					amountPaidValue: numericCash,
				});
			} catch {
				// Error message already set in checkoutError
			}
			return;
		}

		// GCash or Bank Transfer
		if (!activePaymentAccount) {
			setCheckoutError(
				`No active ${paymentMethod} payment account is configured for this Warehouse branch. Please configure an active ${paymentMethod} account in Payment Accounts first.`
			);
			return;
		}

		setShowProofModal(true);
	};

	const handleCheckDuplicateReference = async (candidateReference) => {
		const token = getAuthToken();
		const methodKey = paymentMethod === "GCash" ? "gcash" : "bank";
		const res = await fetch(`${API_BASE}/api/warehouse/sales/pos/check-reference/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify({
				payment_method: methodKey,
				reference_no: candidateReference,
				credentials_id: activePaymentAccount?.credentials_id || null,
			}),
		});
		const data = await res.json().catch(() => ({}));
		return data;
	};

	const handleConfirmDigitalPaymentProof = async ({
		capturedImage,
		referenceNo,
		credentialsId,
		confirmed,
	}) => {
		const methodKey = paymentMethod === "GCash" ? "gcash" : "bank";
		try {
			await submitPosCheckout({
				methodKey,
				amountPaidValue: total,
				referenceNo,
				credentialsId: credentialsId || activePaymentAccount?.credentials_id || null,
				paymentProofImage: capturedImage,
				paymentConfirmed: confirmed,
			});
		} catch {
			// Error surfaced in POS / modal
		}
	};

	const activeQrUrl = resolveMediaUrl(activePaymentAccount?.qr_image_url);

	return (
		<div className="w-full">
			<Breadcrumbs
				items={[
					{ label: "Sales", path: "/warehouse-sales" },
					{ label: "Point of Sale" },
				]}
			/>

			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold text-gray-900">Point of Sale</h1>
					<p className="text-sm text-slate-500">
						Browse available warehouse products and process walk-in retailer transactions efficiently.
					</p>
				</div>

				<button
					type="button"
					onClick={() => fetchPosInventory(true)}
					disabled={loadingProducts || refreshingStock}
					className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
				>
					<RefreshCw
						className={`h-3.5 w-3.5 text-emerald-700 ${
							refreshingStock ? "animate-spin" : ""
						}`}
					/>
					{refreshingStock ? "Refreshing..." : "Refresh Stock"}
				</button>
			</div>

			{fetchError && (
				<div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					<AlertCircle className="h-4 w-4 shrink-0" />
					<span>{fetchError}</span>
				</div>
			)}

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
							className={`rounded-full px-4 py-1.5 text-sm font-semibold transition cursor-pointer ${
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
							className={`rounded-full px-4 py-1.5 text-sm font-semibold transition cursor-pointer ${
								filter === "low-stock"
									? "bg-amber-500 text-white"
									: "bg-amber-50 text-amber-700 hover:bg-amber-100"
							}`}
						>
							{lowStockCount} Low Stock Products
						</button>
					</div>

					{loadingProducts ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{Array.from({ length: 6 }).map((_, idx) => (
								<div
									key={idx}
									className="h-[310px] w-full max-w-[340px] animate-pulse rounded-[14px] border border-slate-200 bg-white p-4"
								>
									<div className="h-[140px] w-full rounded-lg bg-slate-100" />
									<div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
									<div className="mt-3 h-6 w-1/2 rounded bg-slate-100" />
									<div className="mt-4 h-3 w-1/3 rounded bg-slate-100" />
								</div>
							))}
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
								{paginated.map((p) => (
									<POSProductCard
										key={p.id}
										image={p.image || undefined}
										name={p.name}
										sku={p.sku}
										price={p.price}
										unitLabel={p.unitLabel}
										stockAvailable={p.stockAvailable}
										stockUnit="sacks"
										onAddToCart={() => handleAddToCart(p)}
									/>
								))}
							</div>

							{paginated.length === 0 ? (
								<div className="mt-6 text-sm text-slate-500">
									No active products with at least 1 sack (25 kg) match your search.
								</div>
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
						</>
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
										rawQuantity={it.rawQuantity}
										maxQuantity={it.stockAvailable}
										onQuantityChange={(qty) => handleQuantityChange(it.id, qty)}
										onRawQuantityChange={(raw) => handleRawQuantityChange(it.id, raw)}
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

							{/* Payment Method Selector */}
							<div className="relative" ref={dropdownRef}>
								<button
									type="button"
									onClick={() => setShowPaymentDropdown((prev) => !prev)}
									className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left transition hover:border-slate-300 cursor-pointer"
								>
									<div>
										<p className="text-xs text-slate-500">Payment Method</p>
										<p className="text-sm font-bold text-slate-900">{paymentMethod}</p>
									</div>
									<ChevronDown
										size={16}
										className={`text-slate-400 transition-transform ${
											showPaymentDropdown ? "rotate-180" : ""
										}`}
									/>
								</button>

								{showPaymentDropdown && (
									<div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
										{PAYMENT_METHODS.map((method) => (
											<button
												key={method}
												type="button"
												onClick={() => {
													setPaymentMethod(method);
													setShowPaymentDropdown(false);
													setCheckoutError("");
												}}
												className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition cursor-pointer ${
													paymentMethod === method
														? "bg-emerald-50 font-bold text-emerald-700"
														: "text-slate-700 hover:bg-slate-50"
												}`}
											>
												<span>{method}</span>
												{paymentMethod === method && (
													<CheckCircle2 className="h-4 w-4 text-emerald-600" />
												)}
											</button>
										))}
									</div>
								)}
							</div>

							{/* Payment Method Specific Panel */}
							{paymentMethod === "Cash" ? (
								<>
									<div>
										<label className="text-xs text-slate-500">Amount Paid</label>
										<div className="mt-1 flex items-center rounded-md border border-slate-200 px-3 py-2 focus-within:border-emerald-600">
											<span className="mr-1 text-slate-500">₱</span>
											<input
												type="number"
												min="0"
												step="0.01"
												placeholder="0.00"
												value={cashInput}
												onChange={(e) => {
													setCashInput(e.target.value);
													setCheckoutError("");
												}}
												className="w-full text-right outline-none text-slate-800 font-semibold"
											/>
										</div>
									</div>

									<div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-3">
										<span className="text-base font-bold text-slate-900">Change</span>
										<span className="text-base font-bold text-emerald-700">
											₱{change.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
										</span>
									</div>
								</>
							) : (
								<div className="space-y-2.5 rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
									{matchingPaymentAccounts.length > 1 && (
										<div>
											<label className="block text-[11px] font-semibold text-slate-600 mb-1">
												Select {paymentMethod} Account
											</label>
											<select
												value={activePaymentAccount?.credentials_id || ""}
												onChange={(e) => setSelectedCredentialsId(Number(e.target.value))}
												className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600"
											>
												{matchingPaymentAccounts.map((acc) => (
													<option key={acc.credentials_id} value={acc.credentials_id}>
														{acc.provider_name} — {acc.account_number}
													</option>
												))}
											</select>
										</div>
									)}

									{activePaymentAccount ? (
										<div className="flex items-start justify-between gap-3">
											<div className="text-xs space-y-0.5 text-slate-700">
												<p className="font-bold text-emerald-800">
													{activePaymentAccount.provider_name || paymentMethod}
												</p>
												<p className="text-[11px]">
													<span className="text-slate-500">Name:</span>{" "}
													<span className="font-semibold text-slate-900">
														{activePaymentAccount.account_name}
													</span>
												</p>
												<p className="text-[11px]">
													<span className="text-slate-500">Acct No:</span>{" "}
													<span className="font-mono font-bold text-slate-900">
														{activePaymentAccount.account_number}
													</span>
												</p>
												<p className="pt-1 text-[11px] font-bold text-emerald-700">
													Amount Payable: ₱
													{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
												</p>
											</div>

											{activeQrUrl ? (
												<img
													src={activeQrUrl}
													alt={`${paymentMethod} QR`}
													className="h-16 w-16 shrink-0 rounded border border-slate-200 bg-white object-contain p-1"
												/>
											) : (
												<div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-white text-slate-400">
													<QrCode className="h-5 w-5" />
													<span className="text-[8px]">No QR</span>
												</div>
											)}
										</div>
									) : (
										<p className="text-xs font-medium text-amber-700">
											No active {paymentMethod} account configured in Payment Accounts.
										</p>
									)}

									<div className="flex items-center justify-between border-t border-emerald-200/60 pt-2 text-xs">
										<span className="font-medium text-slate-600">Change</span>
										<span className="font-bold text-emerald-700">₱0.00</span>
									</div>
								</div>
							)}

							{checkoutError && (
								<div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
									<span>{checkoutError}</span>
								</div>
							)}

							<div className="flex gap-3 pt-1">
								<button
									type="button"
									onClick={handleClearCart}
									disabled={isSubmittingCheckout}
									className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
								>
									Clear Cart
								</button>
								<CustomGreenButton
									onClick={handleCompleteTransactionClick}
									disabled={isSubmittingCheckout || cartItems.length === 0}
									text={
										isSubmittingCheckout ? (
											"Processing..."
										) : paymentMethod === "Cash" ? (
											"Complete Transaction"
										) : (
											<span className="inline-flex items-center gap-1.5">
												<Camera className="h-3.5 w-3.5" />
												Capture Proof &amp; Pay
											</span>
										)
									}
									className="flex-1 !rounded-md"
								/>
							</div>
						</div>
					</div>
				</aside>
			</div>

			{/* Camera-Only Payment Proof Modal for GCash / Bank Transfer */}
			<WarehousePOSPaymentProofModal
				isOpen={showProofModal}
				onClose={() => !isSubmittingCheckout && setShowProofModal(false)}
				paymentMethod={paymentMethod}
				paymentAccount={activePaymentAccount}
				totalPayable={total}
				onCheckDuplicateReference={handleCheckDuplicateReference}
				onConfirmPaymentProof={handleConfirmDigitalPaymentProof}
				isSubmitting={isSubmittingCheckout}
			/>

			{/* Sales Receipt Modal */}
			<WarehousePOSSalesReceiptModal
				isOpen={showReceiptModal}
				onClose={() => {
					setShowReceiptModal(false);
					setPaymentMethod("Cash");
					setCashInput("");
					setSelectedCredentialsId(null);
				}}
				receiptData={completedReceipt}
			/>

		</div>
	);
}