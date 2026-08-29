import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const Dropdown = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Select Option",
  error,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  // Check if label contains '*' to color it red
  const renderLabel = () => {
    if (!label) return null;
    if (label.endsWith("*")) {
      const baseLabel = label.slice(0, -1).trim();
      return (
        <label className="block mb-2 text-sm font-medium text-gray-700 text-left">
          {baseLabel} <span className="text-red-500">*</span>
        </label>
      );
    }
    return (
      <label className="block mb-2 text-sm font-medium text-gray-700 text-left">
        {label}
      </label>
    );
  };

  const activeOption = options.find((opt) => (typeof opt === "string" ? opt : opt.value) === value);
  const displayLabel = !value || value === "all"
    ? placeholder
    : activeOption
    ? (typeof activeOption === "string" ? activeOption : activeOption.label)
    : placeholder;

  const isFiltered = value && value !== "all" && value !== "";

  return (
    <div className={`w-full relative ${className}`} ref={dropdownRef}>
      {renderLabel()}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2
          w-full px-3 py-2
          rounded-lg border
          text-sm font-medium
          bg-white text-gray-700
          hover:bg-gray-50
          cursor-pointer
          transition-colors
          ${isFiltered ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : "border-gray-200"}
          ${isOpen ? "ring-1 ring-emerald-500 border-emerald-500" : error ? "border-red-500" : ""}
        `}
      >
        <span className="truncate text-left flex-1">
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 ml-1.5 shrink-0 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-[999] min-w-full w-max max-w-[280px] mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto p-1.5 right-0 sm:right-auto sm:left-0">
          {options.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {options.map((option, idx) => {
                const optionText = typeof option === "string" ? option : option.label || option.value;
                const optionValue = typeof option === "string" ? option : option.value;
                const isSelected = value === optionValue;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(optionValue)}
                    className={`
                      w-full px-3 py-2 
                      text-xs text-left
                      cursor-pointer 
                      rounded-lg
                      transition-colors 
                      ${isSelected ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold" : "text-gray-700 font-medium hover:bg-gray-100"}
                    `}
                  >
                    {optionText}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-400 text-center italic">
              No options available
            </div>
          )}
        </div>
      )}

      {error && <span className="text-xs text-red-500 mt-1 block text-left">{error}</span>}
    </div>
  );
};

export default Dropdown;