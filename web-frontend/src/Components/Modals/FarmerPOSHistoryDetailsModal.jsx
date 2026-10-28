import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, Printer, X } from "lucide-react";
import jsPDF from "jspdf";

const money = (value) => Number(value || 0).toLocaleString("en-PH", {
  style: "currency", currency: "PHP",
});

export default function FarmerPOSHistoryDetailsModal({ open, receipt, loading, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const download = () => {
    const doc = new jsPDF();
    const margin = 18;
    let y = 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GrainRise Farmer POS Receipt", margin, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Reference: ${receipt?.reference_no || "—"}`, margin, y);
    y += 6;
    doc.text(
      `Date: ${receipt?.transaction_date ? new Date(receipt.transaction_date).toLocaleString("en-PH") : "—"}`,
      margin,
      y,
    );
    y += 6;
    doc.text(`Payment: ${receipt?.payment_method || "—"}`, margin, y);
    y += 12;
    (receipt?.items || []).forEach((item) => {
      const name = doc.splitTextToSize(item.product_name || "Farmer product", 100);
      doc.text(name, margin, y);
      doc.text(`${item.quantity_label || `${item.quantity_kg} kg`}`, 122, y);
      doc.text(money(item.line_total), 194, y, { align: "right" });
      y += Math.max(name.length * 5, 6);
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${money(receipt?.total_amount)}`, margin, y);
    doc.save(`${receipt?.reference_no || "receipt"}.pdf`);
  };
  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div><h2 className="font-bold text-slate-900">{receipt?.reference_no || "POS Receipt"}</h2><p className="text-xs text-slate-500">Read-only in-store sale</p></div>
          <button type="button" onClick={onClose} aria-label="Close receipt"><X size={19} /></button>
        </div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading receipt…</div> : receipt?.error ? (
          <div className="p-10 text-center text-sm text-red-600">{receipt.error}</div>
        ) : (
          <>
            <div id="farmer-pos-receipt" className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Transaction date</span><strong>{receipt?.transaction_date ? new Date(receipt.transaction_date).toLocaleString("en-PH") : "—"}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Payment method</span><strong>{receipt?.payment_method || "—"}</strong></div>
              <div className="divide-y rounded-xl border">
                {(receipt?.items || []).map((item, index) => <div key={`${item.farm_product_id}-${index}`} className="flex justify-between gap-4 p-3 text-sm"><span>{item.product_name}<small className="block text-slate-500">{item.quantity_label || `${item.quantity_kg} kg`}</small></span><strong>{money(item.line_total)}</strong></div>)}
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-bold"><span>Total</span><span className="text-green-700">{money(receipt?.total_amount)}</span></div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-slate-50 px-6 py-3">
              <button type="button" onClick={download} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"><Download size={16} /> Download</button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"><Printer size={16} /> Print</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
