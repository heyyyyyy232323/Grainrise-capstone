import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, RefreshCw, Search, ShoppingBag } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import POSProductCard from "../../Components/Minor-Components/POSProductCard";
import POSCartCard from "../../Components/Minor-Components/POSCartCard";
import POSPaymentProofModal from "../../Components/Modals/MillerSales/POSPaymentProofModal";
import POSSalesReceiptModal from "../../Components/Modals/MillerSales/POSSalesReceiptModal";
import useFarmerPointOfSale from "../../Components/hooks/Farmer/useFarmerPointOfSale";
import { translations, useLanguagePreference } from "../../lib/translations";

const METHODS = { Cash: "cash", GCash: "gcash", "Bank Transfer": "bank" };
const money = (value) => Number(value || 0).toLocaleString("en-PH", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export default function FarmerPointOfSale() {
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const {
    products, paymentAccounts, paymentMethods, isLoadingProducts, isCheckingOut,
    error, loadProducts, checkout, clearError,
  } = useFarmerPointOfSale();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState("Cash");
  const [cash, setCash] = useState("");
  const [proofOpen, setProofOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const idempotency = useRef(`farmer-pos-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    if (paymentMethods.length && !paymentMethods.includes(method)) setMethod(paymentMethods[0]);
  }, [paymentMethods, method]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((p) => p.stockAvailable > 0 &&
      (!needle || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(needle)));
  }, [products, query]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const paid = Number(cash) || 0;
  const change = method === "Cash" ? Math.max(0, paid - total) : 0;
  const accounts = paymentAccounts.filter((a) => {
    const type = String(a.type || a.method || "").toLowerCase();
    return method === "GCash" ? type === "gcash" : method === "Bank Transfer" ? type.includes("bank") : false;
  });
  const account = accounts[0];

  const add = (product) => {
    clearError(); setCheckoutError("");
    setCart((items) => {
      const current = items.find((item) => item.productId === product.id);
      if (current) return items.map((item) => item.productId === product.id
        ? { ...item, quantity: Math.min(item.quantity + 1, product.stockAvailable), rawQuantity: String(Math.min(item.quantity + 1, product.stockAvailable)) } : item);
      return [...items, { id: `cart-${product.id}`, productId: product.id, name: product.name, price: product.price,
        unitLabel: product.unitLabel, quantity: 1, rawQuantity: "1", stockAvailable: product.stockAvailable }];
    });
  };
  const updateQuantity = (id, value) => setCart((items) => items.map((item) => item.id === id
    ? { ...item, quantity: Math.min(Number(value), item.stockAvailable), rawQuantity: String(value) } : item).filter((item) => Number(item.quantity) > 0));
  const submit = async ({ paymentProofImage = null, referenceNo = null, credentialsId = null, confirmed = false } = {}) => {
    setCheckoutError("");
    if (!cart.length) return setCheckoutError(t.pointOfSale.addProductPrompt);
    const invalid = cart.find((item) => !/^(?:\d+\.?\d*|\.\d+)$/.test(String(item.rawQuantity)) ||
      Number(item.rawQuantity) <= 0 || Number(item.rawQuantity) > item.stockAvailable);
    if (invalid) return setCheckoutError(t.pointOfSale.validQuantity.replace("{name}", invalid.name).replace("{max}", invalid.stockAvailable));
    if (method === "Cash" && paid < total) return setCheckoutError(t.pointOfSale.minimumAmount.replace("{amount}", money(total)));
    const result = await checkout({
      items: cart.map((item) => ({ farm_product_id: item.productId, quantity_kg: Number(item.rawQuantity) })),
      payment_method: METHODS[method] || method.toLowerCase(),
      amount_paid: method === "Cash" ? paid : total,
      reference_no: referenceNo,
      credentials_id: credentialsId || account?.credentials_id || null,
      payment_proof_image: paymentProofImage,
      payment_confirmed: confirmed,
      idempotency_key: idempotency.current,
    });
    if (!result.success) return setCheckoutError(result.error || "Transaction failed.");
    const receiptItems = (result.data.items || []).map((line, index) => ({
      ...line,
      product_name: line.product_name || cart[index]?.name || `Product #${line.farm_product_id}`,
      quantity_label: `${line.quantity_kg} kg`,
      line_subtotal: line.line_subtotal ?? line.line_total ?? 0,
    }));
    setProofOpen(false); setReceipt({ ...result.data, items: receiptItems }); setCart([]); setCash("");
    idempotency.current = `farmer-pos-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    loadProducts();
  };

  return <div className="w-full">
    <Breadcrumbs items={[{ label: t.sidebar?.farm || t.sidebar.farm, path: "/farmer/dashboard" }, { label: t.pointOfSale.title }]} />
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">{t.pointOfSale.title}</h1>
        <p className="text-sm text-slate-500">{t.pointOfSale.subtitle}</p>
      </div>
      <button type="button" onClick={async () => { setRefreshing(true); await loadProducts(); setRefreshing(false); }}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" disabled={refreshing}>
        <RefreshCw className={refreshing ? "animate-spin" : ""} size={14} /> {t.pointOfSale.refreshStock}
      </button>
    </div>
    {(error || checkoutError) && <div className="mb-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      <AlertCircle size={16} /> <span>{checkoutError || error}</span></div>}
    <div className="flex flex-col gap-6 lg:flex-row">
      <section className="min-w-0 flex-1">
        <div className="relative mb-5"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.pointOfSale.searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600" /></div>
        {isLoadingProducts ? <div className="py-16 text-center text-sm text-slate-500">{t.pointOfSale.loadingProducts}</div> :
          filtered.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((p) =>
            <POSProductCard key={p.id} image={p.image} name={p.name} sku={p.sku} price={p.price} unitLabel={p.unitLabel}
              stockAvailable={p.stockAvailable} stockUnit={p.stockUnit} onAddToCart={() => add(p)} />)}</div> :
          <div className="flex flex-col items-center py-16 text-slate-400"><ShoppingBag size={40} /><p className="mt-2 text-sm">{t.pointOfSale.noProducts}</p></div>}
      </section>
      <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm lg:w-[390px]">
        <div className="border-b p-4"><h2 className="font-bold text-slate-900">{t.pointOfSale.currentSale}</h2><p className="text-xs text-slate-500">{cart.length} {t.pointOfSale.productsLabel}</p></div>
        <div className="max-h-[390px] space-y-3 overflow-y-auto p-4">{cart.length ? cart.map((item) =>
          <POSCartCard key={item.id} name={item.name} price={item.price} unitLabel={item.unitLabel} quantity={item.quantity}
            rawQuantity={item.rawQuantity} maxQuantity={item.stockAvailable} allowDecimal onQuantityChange={(qty) => updateQuantity(item.id, qty)}
            onRawQuantityChange={(raw) => setCart((items) => items.map((x) => x.id === item.id ? { ...x, rawQuantity: raw } : x))}
            onRemove={() => setCart((items) => items.filter((x) => x.id !== item.id))} />) :
          <p className="py-8 text-center text-sm text-slate-400">{t.pointOfSale.emptyCart}</p>}</div>
        <div className="space-y-3 border-t p-4"><div className="flex justify-between text-sm"><span>{t.pointOfSale.subtotal}</span><b>₱{money(total)}</b></div>
          <div className="flex justify-between font-bold"><span>{t.pointOfSale.total}</span><span>₱{money(total)}</span></div>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border p-2 text-sm">
            {paymentMethods.map((m) => <option key={m}>{m}</option>)}</select>
          {method === "Cash" ? <><input type="number" min="0" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)}
            placeholder={t.pointOfSale.amountPaid} className="w-full rounded-lg border p-2 text-sm" /><div className="flex justify-between rounded-lg bg-emerald-50 p-3 text-sm"><b>{t.pointOfSale.change}</b><b>₱{money(change)}</b></div></> :
            <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{account ? `${t.pointOfSale.payTo} ${account.provider_name || method}. Capture proof to continue.` : t.pointOfSale.noActiveAccount.replace("{method}", method)}</p>}
          <div className="flex gap-2"><button type="button" onClick={() => { setCart([]); setCash(""); }} className="flex-1 rounded-lg border p-2 text-sm">{t.pointOfSale.clearCart}</button>
            <button type="button" disabled={!cart.length || isCheckingOut} onClick={() => method === "Cash" ? submit() : account ? setProofOpen(true) : setCheckoutError(t.pointOfSale.noActiveAccount.replace("{method}", method))}
              className="flex-1 rounded-lg bg-emerald-700 p-2 text-sm font-semibold text-white disabled:opacity-40">{isCheckingOut ? t.pointOfSale.processing : method === "Cash" ? t.pointOfSale.completeTransaction : t.pointOfSale.captureProofAndPay}</button></div>
        </div>
      </aside>
    </div>
    <POSPaymentProofModal isOpen={proofOpen} onClose={() => setProofOpen(false)} paymentMethod={method} paymentAccount={account}
      totalPayable={total} isSubmitting={isCheckingOut} onCheckDuplicateReference={async () => ({ exists: false })}
      onConfirmPaymentProof={({ capturedImage, referenceNo, credentialsId, confirmed }) => submit({ paymentProofImage: capturedImage, referenceNo, credentialsId, confirmed })} />
    <POSSalesReceiptModal isOpen={Boolean(receipt)} onClose={() => setReceipt(null)} receiptData={receipt}
      receiptContextLabel="GrainRise Farmer POS" />
  </div>;
}
