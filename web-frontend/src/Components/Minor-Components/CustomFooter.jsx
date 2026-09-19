const CustomFooter = () => {
  return (
    <footer className="w-full bg-green-50 px-6 sm:px-10 py-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-600">
      <p>© 2026 GrainRise. All rights reserved.</p>

      <div className="flex items-center gap-2">
        <a href="/privacy-policy" className="hover:text-green-700 transition">
          Privacy Policy
        </a>
        <span className="text-gray-400">|</span>
        <a href="/terms-policies" className="hover:text-green-700 transition">
          Terms of Service
        </a>
        <span className="text-gray-400">|</span>
        <a href="/contact-support" className="hover:text-green-700 transition">
          Contact Support
        </a>
      </div>
    </footer>
  );
};

export default CustomFooter;