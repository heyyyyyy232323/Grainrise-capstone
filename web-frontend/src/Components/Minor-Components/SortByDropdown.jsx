import { useState } from "react";
import { ArrowUpDown, ChevronDown, Check } from "lucide-react";

const defaultOptions = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "batch-asc", label: "Batch ID (A-Z)" },
  { value: "status", label: "Status" },
];

const SortByDropdown = ({ value, onChange, options = defaultOptions }) => {
  const [open, setOpen] = useState(false);
  const activeLabel = options.find((opt) => opt.value === value)?.label || "Sort By";

  const handleSelect = (optionValue) => {
    onChange?.(optionValue);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
      >
        <ArrowUpDown size={16} className="text-gray-600" />
        <span className="text-gray-700 whitespace-nowrap">{activeLabel}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg py-1.5 z-20 w-48">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {option.label}
                {option.value === value && <Check size={14} className="text-green-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SortByDropdown;