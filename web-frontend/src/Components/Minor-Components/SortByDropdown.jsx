import { useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";

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
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
          color: "#374151",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
      >
        <ArrowUpDown size={16} style={{ color: "#6b7280" }} />
        <span style={{ color: "#374151" }}>{activeLabel}</span>
        <ChevronDown
          size={16}
          style={{
            color: "#9ca3af",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              padding: "8px",
              zIndex: 20,
              minWidth: "240px",
            }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? "#0B5D1E" : "#374151",
                    background: isSelected ? "#EAF7E8" : "transparent",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    marginBottom: "2px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SortByDropdown;