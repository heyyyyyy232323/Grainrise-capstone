const CustomAmberButton = ({
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
        bg-[#D97706]
        text-white
        font-medium
        hover:bg-[#B45309]
        active:scale-95
        transition
        ${className}
      `}
    >
      {text}
    </button>
  );
};

export default CustomAmberButton;