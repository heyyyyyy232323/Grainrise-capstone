import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, HelpCircle, LogIn, Users, Moon, Sun, Menu, X } from 'lucide-react';
import logoImg from '../../assets/Logo.png';
import { translations, useLanguagePreference } from '../../lib/translations';
import useToast from '../hooks/useToast';
import Toast from '../Modals/Toast';

const GrainRiseLogo = () => (
  <div className="flex items-center">
    <img src={logoImg} alt="GrainRise Logo" className="h-8 sm:h-9 w-auto object-contain" />
  </div>
);

export default function LandingHeader({ scrollTo: customScrollTo }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [language, setLanguage] = useLanguagePreference();
  const { toasts, showToast, removeToast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return document.documentElement.classList.contains('dark');
  });
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[language].common;

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);

    const onStorage = (e) => {
      if (e.key === 'theme') {
        setIsDarkMode(e.newValue === 'dark');
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('storage', onStorage);
    };
  }, [isDarkMode]);

  const scrollTo = (id) => {
    setMenuOpen(false);
    if (customScrollTo) {
      customScrollTo(id);
      return;
    }
    if (location.pathname === "/") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${id}`);
    }
  };

  const toggleTheme = () => {
    const nextIsDark = !isDarkMode;
    if (nextIsDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    setIsDarkMode(nextIsDark);

    showToast({
      type: 'success',
      title: nextIsDark ? (language === 'tl' ? 'Dark mode na' : 'Dark mode enabled') : (language === 'tl' ? 'Light mode na' : 'Light mode enabled'),
      message: nextIsDark ? (language === 'tl' ? 'Nakabukas na ang dark mode.' : 'Dark mode is now active.') : (language === 'tl' ? 'Nakabukas na ang light mode.' : 'Light mode is now active.'),
      duration: 2200,
    });
  };

  const handleLanguageChange = (nextLanguage) => {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    showToast({
      type: 'success',
      title: nextLanguage === 'tl' ? 'Wika na-update' : 'Language updated',
      message: nextLanguage === 'tl' ? 'Nakapili na ang Tagalog.' : 'English is now selected.',
      duration: 2200,
    });
  };

  return (
    <>
      {toasts.length > 0 && toasts.map((toast) => (
        <Toast
          key={toast.id}
          isOpen={true}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={3000}
          onClose={() => removeToast(toast.id)}
          position="top-right"
          containerClassName="top-24"
          zIndex={12}
        />
      ))}
      <div className="bg-[#00580c] dark:bg-[#0d1a11] text-white dark:text-emerald-300 text-[11px] sm:text-xs py-1 px-6 sm:px-12 border-b border-emerald-900/30">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-emerald-200 dark:text-emerald-400" />
            <span>{t.officialPortal}</span>
          </div>
          <div
            className="flex items-center gap-1.5 font-medium cursor-pointer hover:underline text-emerald-100 dark:text-emerald-300"
            onClick={() => navigate('/contact-support')}
            role="button"
            tabIndex={0}
          >
            <HelpCircle size={14} />
            <span>{t.helpSupport}</span>
          </div>
        </div>
      </div>

      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 px-6 sm:px-12 ${
          scrolled
            ? 'bg-white/95 dark:bg-[#101d16]/95 backdrop-blur-md shadow-md border-b border-gray-200/80 dark:border-white/10 py-2.5'
            : 'bg-white dark:bg-[#101d16] border-b border-gray-100 dark:border-white/10 py-3.5'
        }`}
      >
        <div className="max-w-[1240px] mx-auto flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => scrollTo('hero')}>
            <GrainRiseLogo />
          </div>

          <ul className="hidden md:flex items-center gap-6 lg:gap-8">
            <li>
              <button
                onClick={() => scrollTo('hero')}
                className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {t.home}
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollTo('stakeholders')}
                className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {t.stakeholders}
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollTo('explore-grainrise')}
                className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {t.explore}
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollTo('help')}
                className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                {t.helpSupport}
              </button>
            </li>
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/15 bg-white/70 dark:bg-[#0f1c16] overflow-hidden">
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 text-[10px] font-semibold ${language === 'en' ? 'bg-emerald-700 text-white' : 'text-gray-700 dark:text-gray-200'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('tl')}
                className={`px-2 py-1 text-[10px] font-semibold ${language === 'tl' ? 'bg-emerald-700 text-white' : 'text-gray-700 dark:text-gray-200'}`}
              >
                TL
              </button>
            </div>
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-emerald-500/30 text-gray-600 dark:text-emerald-300 hover:bg-gray-100 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              onClick={toggleTheme}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              id="nav-login-btn"
              onClick={() => navigate("/login")}
            >
              <LogIn size={15} />
              <span>{t.login}</span>
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00580c] hover:bg-[#004509] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
              onClick={() => navigate('/partner-with-us')}
            >
              <Users size={15} />
              <span>{t.partnerWithUs}</span>
            </button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/15 bg-white/70 dark:bg-[#0f1c16] overflow-hidden text-[10px] font-semibold">
              <button type="button" onClick={() => handleLanguageChange('en')} className={`px-1.5 py-1 ${language === 'en' ? 'bg-emerald-700 text-white' : 'text-gray-700 dark:text-gray-200'}`}>EN</button>
              <button type="button" onClick={() => handleLanguageChange('tl')} className={`px-1.5 py-1 ${language === 'tl' ? 'bg-emerald-700 text-white' : 'text-gray-700 dark:text-gray-200'}`}>TL</button>
            </div>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-emerald-500/30 text-gray-600 dark:text-emerald-300"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden relative z-10 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#101d16] -mx-6 sm:-mx-12 px-6 sm:px-12 py-4 flex flex-col gap-3 shadow-xl">
            <button
              onClick={() => scrollTo('hero')}
              className="text-left text-sm font-medium py-2 text-gray-800 dark:text-gray-200 hover:text-emerald-700"
            >
              {t.home}
            </button>
            <button
              onClick={() => scrollTo('stakeholders')}
              className="text-left text-sm font-medium py-2 text-gray-800 dark:text-gray-200 hover:text-emerald-700"
            >
              {t.stakeholders}
            </button>
            <button
              onClick={() => scrollTo('explore-grainrise')}
              className="text-left text-sm font-medium py-2 text-gray-800 dark:text-gray-200 hover:text-emerald-700"
            >
              {t.explore}
            </button>
            <button
              onClick={() => scrollTo('help')}
              className="text-left text-sm font-medium py-2 text-gray-800 dark:text-gray-200 hover:text-emerald-700"
            >
              {t.helpSupport}
            </button>

            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
              <button
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 dark:border-white/20 text-sm font-semibold text-gray-800 dark:text-white"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/login");
                }}
              >
                <LogIn size={16} />
                <span>{t.login}</span>
              </button>
              <button
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#00580c] text-white text-sm font-semibold"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/partner-with-us');
                }}
              >
                <Users size={15} />
                <span>{t.partnerWithUs}</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
