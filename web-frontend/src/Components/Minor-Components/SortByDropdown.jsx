import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const defaultOptions = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "batch-asc", label: "Batch ID (A-Z)" },
  { value: "status", label: "Status" },
];

const SortByDropdown = ({ value, onChange, options = defaultOptions, placeholder = "Sort By" }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeOption = options.find((opt) => (typeof opt === "string" ? opt : opt.value) === value);
  const activeLabel = activeOption
    ? typeof activeOption === "string"
      ? activeOption
      : activeOption.label
    : placeholder;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange?.(optionValue);
    setOpen(false);
  };

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        <span className="whitespace-nowrap">{activeLabel}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[190px]">
          {options.map((option, idx) => {
            const optValue = typeof option === "string" ? option : option.value;
            const optLabel = typeof option === "string" ? option : option.label || option.value;
            const isSelected = optValue === value;

            return (
              <button
                key={optValue || idx}
                type="button"
                onClick={() => handleSelect(optValue)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {optLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SortByDropdown;