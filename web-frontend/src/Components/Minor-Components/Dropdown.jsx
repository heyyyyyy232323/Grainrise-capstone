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

  return (
    <div className={`w-full relative ${className}`} ref={dropdownRef}>
      {renderLabel()}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between
          w-full px-3 py-2
          rounded-[8px] border
          text-[13px] font-medium
          bg-white text-gray-700
          cursor-pointer
          selection:bg-transparent
          transition-colors
          ${isOpen ? "border-[#0B5D1E] ring-1 ring-[#EAF7E8]" : error ? "border-red-500" : "border-slate-200 hover:bg-slate-50"}
        `}
      >
        <span
          className="truncate font-normal"
          style={{ color: "#1E1E1E" }}
        >
          {(() => {
            if (!value || value === "all") return placeholder;
            const activeOpt = options.find((opt) => (typeof opt === "string" ? opt : opt.value) === value);
            return activeOpt ? (typeof activeOpt === "string" ? activeOpt : activeOpt.label) : placeholder;
          })()}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 ml-2 transition-transform duration-200 ${
            isOpen ? "transform rotate-180 text-[#0B5D1E]" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-[999] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] max-h-60 overflow-y-auto p-2">
          {options.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {options.map((option, idx) => {
                const optionText = typeof option === "string" ? option : option.label || option.value;
                const optionValue = typeof option === "string" ? option : option.value;
                const isSelected = value === optionValue;

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(optionValue)}
                    className={`
                      px-4 py-3 
                      text-sm text-left
                      cursor-pointer 
                      rounded-[10px]
                      transition-colors 
                      ${isSelected ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold" : "text-gray-700 font-medium hover:bg-gray-100"}
                    `}
                  >
                    {optionText}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
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