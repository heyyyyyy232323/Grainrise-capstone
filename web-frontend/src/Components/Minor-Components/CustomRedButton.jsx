const CustomRedButton = ({
  text,
  onClick,
  type = "button",
  className = "",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        px-6 py-2
        rounded-lg
        bg-[#DC2626]
        text-white
        font-medium
        hover:bg-[#B91C1C]
        active:scale-95
        transition
        ${className}
      `}
    >
      {text}
    </button>
  );
};

export default CustomRedButton;