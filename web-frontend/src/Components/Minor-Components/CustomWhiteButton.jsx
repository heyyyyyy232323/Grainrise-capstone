const CustomWhiteButton = ({
  icon,
  onClick,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center
        p-3
        rounded-full
        bg-gray-200
        text-gray-700
        hover:bg-gray-300
        active:scale-95
        transition
        ${className}
      `}
    >
      {icon}
    </button>
  );
};

export default CustomWhiteButton;