import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import WarehouseManagerMessagesTab from "./WarehouseManagerMessagesTab";

export default function WarehouseManagerMessages() {
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[{ label: "Management" }, { label: "Messages" }]}
        />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Messages
        </h2>
        <p className="text-sm text-slate-500">
          View and manage your conversations in one place.
        </p>
      </div>

      {/* ── Messages Panel ───────────────────────────────────────────────── */}
      <WarehouseManagerMessagesTab />
    </div>
  );
}
