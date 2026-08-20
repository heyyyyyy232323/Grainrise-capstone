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
          w-full px-4 py-3
          rounded-xl border
          bg-white text-gray-700
          cursor-pointer
          selection:bg-transparent
          transition
          ${isOpen ? "border-green-600 ring-2 ring-green-100" : error ? "border-red-500" : "border-[#CECECE] hover:border-gray-400"}
        `}
      >
        <span className={`truncate ${!value ? "text-gray-500" : "text-gray-700"}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-200 ${
            isOpen ? "transform rotate-180 text-green-700" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-[999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto scrollbar-thin">
          {options.length > 0 ? (
            options.map((option, idx) => {
              const optionText = typeof option === "string" ? option : option.label || option.value;
              const optionValue = typeof option === "string" ? option : option.value;
              const isSelected = value === optionValue;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(optionValue)}
                  className={`
                    px-4 py-2.5 
                    text-sm text-gray-700 text-left
                    cursor-pointer 
                    transition-colors 
                    hover:bg-gray-100
                    ${isSelected ? "bg-green-50 text-green-800 font-semibold" : ""}
                  `}
                >
                  {optionText}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-2.5 text-sm text-gray-400 text-center italic">
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