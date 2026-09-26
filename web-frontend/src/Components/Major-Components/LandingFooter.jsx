import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImg from '../../assets/Logo.png';

const GrainRiseLogo = () => (
  <img src={logoImg} alt="GrainRise Logo" className="h-8 w-auto object-contain" />
);

// Define brand SVGs since lucide-react does not include trademarked brand logos
const FacebookIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const XIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export default function LandingFooter() {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollTo = (id) => {
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <footer className="w-full bg-[#0a1b11] dark:bg-[#08120b] text-gray-300 py-12 px-6 sm:px-12 border-t border-emerald-950/40" id="footer">
      <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-8 border-b border-white/10">
        {/* Brand column */}
        <div className="flex flex-col gap-3 max-w-[420px]">
          <div onClick={() => scrollTo('hero')} className="cursor-pointer">
            <GrainRiseLogo />
          </div>
          <p className="text-xs sm:text-[13px] text-gray-400 leading-relaxed">
            Transforming rice supply chains with intelligent technology and data-driven insights for a sustainable future.
          </p>
          <div className="flex items-center gap-3 mt-1">
            <a
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors"
              aria-label="Facebook"
              href="https://www.facebook.com/profile.php?id=61594411016375"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FacebookIcon size={14} />
            </a>
            <a
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors"
              aria-label="Instagram"
              href="https://www.instagram.com/grainrise.ai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramIcon size={14} />
            </a>
            <a
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors"
              aria-label="X"
              href="https://x.com/Grainrise"
              target="_blank"
              rel="noopener noreferrer"
            >
              <XIcon size={12} />
            </a>
          </div>
        </div>

        {/* Right side navigation links */}
        <div className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm font-medium">
          <button onClick={() => navigate('/contact-support')} className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer">
            Help / Support
          </button>
          <button onClick={() => navigate('/contact-us')} className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer">
            Contact Us
          </button>
          <button onClick={() => navigate('/faqs')} className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer">
            FAQs
          </button>
          <button onClick={() => navigate('/privacy-policy')} className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer">
            Privacy Policy
          </button>
          <button onClick={() => navigate('/terms-policies')} className="text-gray-300 hover:text-emerald-400 transition-colors cursor-pointer">
            Terms / Policies
          </button>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
        <p>&copy; 2026 GrainRise. All rights reserved.</p>
        <p className="text-gray-500">Centralized Rice Supply Chain Operations</p>
      </div>
    </footer>
  );
}