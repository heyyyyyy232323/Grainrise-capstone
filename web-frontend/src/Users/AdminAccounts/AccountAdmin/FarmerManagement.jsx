import { Sprout } from "lucide-react";

const FarmerManagement = () => {
  return (
    <div className="min-h-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-[#0B5D1E]">
            <Sprout size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Farmer Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage and review registered farmer accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-[#0B5D1E]">
            <Sprout size={32} />
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            Farmer Management
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
            This module is currently prepared as a routing placeholder.
            Farmer account management functionality will be implemented here.
          </p>

          <div className="mt-5 inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Module Under Development
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerManagement;