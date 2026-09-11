import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, HelpCircle, LogIn } from 'lucide-react';
import logoImg from '../../assets/Logo.png';
import '../../LandingPage.css';

const GrainRiseLogo = () => (
  <div className="lp-nav__brand-content">
    <img src={logoImg} alt="GrainRise Logo" className="lp-logo-img" />
  </div>
);

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${id}`);
    }
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
          <div className="lp-topbar__right" onClick={() => scrollTo('footer')} role="button" tabIndex={0}>
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

          <ul className={`lp-nav__links ${menuOpen ? 'lp-nav__links--open' : ''}`}>
            <li><button onClick={() => scrollTo('hero')}>Home</button></li>
            <li><button onClick={() => scrollTo('about')}>Portal Access</button></li>
            <li><button onClick={() => scrollTo('services')}>Explore Grainrise</button></li>
            <li><button onClick={() => scrollTo('footer')}>Help &amp; Support</button></li>
          </ul>

          <div className="lp-nav__actions">
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
              className="lp-hamburger"
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
