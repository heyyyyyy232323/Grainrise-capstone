import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, HelpCircle, LogIn, Moon, Sun } from 'lucide-react';
import logoImg from '../../assets/Logo.png';
import '../../LandingPage.css';

const GrainRiseLogo = () => (
  <div className="lp-nav__brand-content">
    <img src={logoImg} alt="GrainRise Logo" className="lp-logo-img" />
  </div>
);

export default function LandingHeader({ scrollTo: customScrollTo }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return !document.documentElement.classList.contains('light');
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('light', !isDarkMode);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
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
    document.documentElement.classList.toggle('light', !nextIsDark);
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
    setIsDarkMode(nextIsDark);
  };

  return (
    <>
      {/* Top Green Notification Bar */}
      <div className="lp-topbar">
        <div className="lp-topbar__inner">
          <div className="lp-topbar__left">
            <ShieldCheck size={15} className="lp-topbar__icon" />
            <span>Official GrainRise Portal</span>
          </div>
          <div className="lp-topbar__right" onClick={() => navigate('/contact-support')} role="button" tabIndex={0}>
            <HelpCircle size={15} className="lp-topbar__icon" />
            <span>Help &amp; Support</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <div className="lp-nav__brand" onClick={() => scrollTo('hero')}>
            <GrainRiseLogo />
          </div>

          {/* Backdrop for mobile drawer */}
          <div
            className={`lp-nav__backdrop ${menuOpen ? 'lp-nav__backdrop--open' : ''}`}
            onClick={() => setMenuOpen(false)}
          />

          {/* Exact 4 Navigation Items from Figma */}
          <ul className={`lp-nav__links ${menuOpen ? 'lp-nav__links--open' : ''}`}>
            {menuOpen && (
              <li className="lp-nav__mobile-close">
                <div className="lp-nav__brand" onClick={() => scrollTo('hero')}>
                  <GrainRiseLogo />
                </div>
                <button
                  className="lp-hamburger lp-hamburger--open"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <span /><span /><span />
                </button>
              </li>
            )}
            <li><button onClick={() => scrollTo('hero')}>Home</button></li>
            <li><button onClick={() => scrollTo('portal-access')}>Portal Access</button></li>
            <li><button onClick={() => scrollTo('explore-grainrise')}>Explore Grainrise</button></li>
            <li><button onClick={() => scrollTo('help')}>Help &amp; Support</button></li>

            {menuOpen && (
              <li className="lp-nav__mobile-actions">
                <button
                  className="lp-nav__login-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/login");
                  }}
                >
                  <LogIn size={16} />
                  <span>Log In</span>
                </button>
                <button
                  className="lp-btn lp-btn--primary lp-nav__download-btn"
                  onClick={() => scrollTo('mobile-promo')}
                >
                  Download Free
                </button>
              </li>
            )}
          </ul>

          <div className="lp-nav__actions">
            <button
              type="button"
              className="lp-nav__theme-toggle"
              onClick={toggleTheme}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className="lp-nav__login-btn"
              id="nav-login-btn"
              onClick={() => navigate("/login")}
            >
              <LogIn size={15} />
              <span>Log In</span>
            </button>
            <button
              className="lp-btn lp-btn--primary lp-nav__download-btn"
              onClick={() => scrollTo('mobile-promo')}
            >
              Download Free
            </button>
            <button
              className={`lp-hamburger ${menuOpen ? 'lp-hamburger--open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
