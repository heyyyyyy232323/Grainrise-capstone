import { createPortal } from "react-dom";

const RestoreProductModal = ({
  isOpen,
  onClose,
  onRestore,
  productName = "Product",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-all duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center shadow-md">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Restore Product
        </h2>

        {/* Description */}
        <p className="text-center text-gray-600 mb-8">
          Restore {productName} to the Active Products list?
        </p>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-6 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-100 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onRestore}
            disabled={isLoading}
            className="flex-1 px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
          >
            {isLoading ? "Restoring..." : "Restore"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RestoreProductModal;
