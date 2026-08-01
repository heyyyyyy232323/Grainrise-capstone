import CustomGreenButton from "../Minor-Components/CustomGreenButton";
import CustomRedButton from "../Minor-Components/CustomRedButton";

const ArchiveProductModal = ({
  isOpen,
  onClose,
  onArchive,
  productName = "Product",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center">
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
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-3 5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Archive Product?
        </h2>

        {/* Description */}
        <p className="text-center text-gray-600 mb-8">
          Move {productName} to the Archive page? It can be restored anytime.
        </p>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-6 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-100 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onArchive}
            disabled={isLoading}
            className="flex-1 px-6 py-2 rounded-lg bg-yellow-500 text-white font-medium hover:bg-yellow-600 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchiveProductModal;
