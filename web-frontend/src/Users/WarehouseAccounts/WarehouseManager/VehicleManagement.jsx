import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import { Car } from "lucide-react";

export default function VehicleManagement() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Management" },
            { label: "Vehicle Management" },
          ]}
        />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-[-0.02em] text-gray-900">
          Vehicle Management
        </h2>
        <p className="text-sm text-gray-500">
          Oversee fleet vehicles, maintenance schedules, and logistics assignments.
        </p>
      </div>

      <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B5D1E]">
          <Car className="h-8 w-8 text-[#0B5D1E]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Vehicle Management
        </h3>
        <p className="mt-1 max-w-md text-sm text-gray-500">
          This module is not yet implemented.
        </p>
      </div>
    </div>
  );
}

