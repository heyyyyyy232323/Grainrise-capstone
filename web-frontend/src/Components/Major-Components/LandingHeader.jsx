import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImg from '../../assets/Logo.png';
import '../../LandingPage.css';

const GrainRiseLogo = () => (
  <img src={logoImg} alt="GrainRise Logo" className="lp-logo-img" />
);

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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
    <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
      <div className="lp-nav__inner">
        <div className="lp-nav__brand" onClick={() => scrollTo('hero')} style={{ cursor: 'pointer' }}>
          <GrainRiseLogo />
        </div>

        <ul className={`lp-nav__links ${menuOpen ? 'lp-nav__links--open' : ''}`}>
          <li><button onClick={() => scrollTo('hero')}>Home</button></li>
          <li><button onClick={() => scrollTo('about')}>About</button></li>
          <li><button onClick={() => scrollTo('services')}>Services</button></li>
          <li><button onClick={() => scrollTo('ecosystem')}>Features</button></li>
          <li><button onClick={() => scrollTo('footer')}>Contact</button></li>
        </ul>

        <div className="lp-nav__actions">
          <button
            className="lp-btn lp-btn--primary"
            id="nav-login-btn"
            onClick={() => navigate("/login")}
          >
            Log In
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
  );
}
