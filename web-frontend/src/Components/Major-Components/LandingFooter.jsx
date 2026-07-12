import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import logoImg from '../../assets/Logo.png';
import '../../LandingPage.css';

const GrainRiseLogo = () => (
  <img src={logoImg} alt="GrainRise Logo" className="lp-logo-img" />
);

// Define brand SVGs since lucide-react does not include trademarked brand logos
const FacebookIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const LinkedinIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
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
    <footer className="lp-footer" id="footer">
      <div className="lp-footer__inner">
        {/* Brand column */}
        <div className="lp-footer__brand">
          <div className="lp-footer__brand-logo" onClick={() => scrollTo('hero')} style={{ cursor: 'pointer' }}>
            <GrainRiseLogo />
          </div>
          <p className="lp-footer__tagline">
            Transforming rice supply chains with intelligent technology and data-driven insights for a sustainable future.
          </p>
          <div className="lp-footer__socials">
            <button className="lp-footer__social-btn" aria-label="LinkedIn">
              <LinkedinIcon size={14} />
            </button>
            <button className="lp-footer__social-btn" aria-label="Facebook">
              <FacebookIcon size={14} />
            </button>
          </div>
        </div>

        {/* Links columns */}
        <div className="lp-footer__links">
          <div className="lp-footer__col">
            <h4>Resources</h4>
            <ul>
              <li><button onClick={() => scrollTo('about')}>Documentation</button></li>
              <li><button onClick={() => scrollTo('services')}>User Guide</button></li>
              <li><button onClick={() => scrollTo('ecosystem')}>FAQ</button></li>
              <li><button>Support</button></li>
            </ul>
          </div>
          <div className="lp-footer__col">
            <h4>Company</h4>
            <ul>
              <li><button onClick={() => scrollTo('about')}>About Us</button></li>
              <li><button>Privacy Policy</button></li>
              <li><button>Terms</button></li>
            </ul>
          </div>
          <div className="lp-footer__col">
            <h4>Get In Touch</h4>
            <ul className="lp-footer__contact-list">
              <li>
                <span className="lp-footer__contact-icon">
                  <Mail size={14} />
                </span>
                grainriseph@gmail.com
              </li>
              <li>
                <span className="lp-footer__contact-icon">
                  <Phone size={14} />
                </span>
                +1 (555) 123-4567
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="lp-footer__bottom">
        <p>&copy; 2024 GrainRise. All rights reserved.</p>
        <div className="lp-footer__bottom-links">
          <button>Sitemap</button>
          <span className="lp-footer__separator">|</span>
          <button>Privacy Policy</button>
          <span className="lp-footer__separator">|</span>
          <button>Terms of Service</button>
        </div>
      </div>
    </footer>
  );
}
