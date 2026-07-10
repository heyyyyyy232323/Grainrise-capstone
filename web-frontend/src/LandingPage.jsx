import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';

// ── Actual project images ─────────────────────────────────────
import dashboardMockup from './assets/lapisIStop.png';
import grainHands from './assets/handss.png';
import groceryImg from './assets/Grocery.png';
import bluescreenImg from './assets/bluescreen.jpg';
import talkieImg from './assets/talkie.jpg';
import pinkscreenImg from './assets/pinkscreen.jpg';
import stockImg from './assets/stock.jpg';
import logoImg from './assets/Logo.png';

// ─── SVG Icon Components ──────────────────────────────────────────────────────
const IconRetailer = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconSupplier = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconDistributor = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconWarehouse = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20V8l10-6 10 6v12H2z"/>
    <rect x="8" y="14" width="8" height="6"/>
  </svg>
);
const IconInventory = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconOrder = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconTransport = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6a35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconArrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aac8aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);
const GrainRiseLogo = () => (
  <img src={logoImg} alt="GrainRise Logo" className="lp-logo-img" />
);

// ─── Animated counter ─────────────────────────────────────────────────────────
function useCounter(target, duration, trigger) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let current = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [trigger, target, duration]);
  return count;
}

// ─── Intersection observer ────────────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setInView(true);
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [statsRef, statsInView] = useInView(0.3);
  const c500 = useCounter(500, 2000, statsInView);
  const c120 = useCounter(120, 2200, statsInView);
  const c98  = useCounter(98,  1800, statsInView);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const ECOSYSTEM_STEPS = [
    { icon: <IconSupplier />,    label: 'Suppliers'  },
    { icon: <IconWarehouse />,   label: 'Warehouse'  },
    { icon: <IconInventory />,   label: 'Inventory'  },
    { icon: <IconOrder />,       label: 'Orders'     },
    { icon: <IconTransport />,   label: 'Transport'  },
    { icon: <IconRetailer />,    label: 'Retailers'  },
  ];

  const TESTIMONIALS = [
    {
      body: "GrainRise has completely revolutionized how we handle seasonal spikes. Our inventory accuracy jumped from 80% to 99% in just three months. It’s the brain of our operation.",
      initials: "RM",
      color: "#2d6a35",
      name: "Ricardo Mendoza",
      role: "Warehouse Manager",
    },
    {
      body: "The logistics tracking is a game-changer. Being able to give our retailers precise ETAs has strengthened our relationships and reduced support calls by half.",
      initials: "SC",
      color: "#4a7a4a",
      name: "Sarah Chen",
      role: "Distribution Lead",
    },
    {
      body: "As a cooperative, we need transparency. GrainRise provides a single source of truth that both farmers and buyers trust. It makes procurement effortless.",
      initials: "AB",
      color: "#1a5c28",
      name: "Antonio Bautista",
      role: "Co-Op Director",
    }
  ];

  const SERVICES = [
    { emoji: '📊', name: 'Stock Awareness',     desc: 'See current stock levels instantly to prevent shortages and overstocking.' },
    { emoji: '📦', name: 'Inventory Control',   desc: 'Track inflow and outflow with accurate inventory records.' },
    { emoji: '📈', name: 'Demand Forecasting',  desc: 'Predict demand using historical data for smarter restocking.' },
    { emoji: '🚚', name: 'Delivery Tracking',   desc: 'Monitor deliveries in real time with clear route visibility.' },
    { emoji: '🔧', name: 'Operation Tools',     desc: 'Built-in tools for smoother workflows and coordination.' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial(p => (p + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lp-root">

      {/* ── NAVBAR ─── */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <div className="lp-nav__brand">
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

      {/* ── HERO ─── */}
      <section className="lp-hero" id="hero">
        <div className="lp-hero__bg-blob lp-hero__bg-blob--1" />
        <div className="lp-hero__bg-blob lp-hero__bg-blob--2" />

        <div className="lp-hero__content">
          <h1 className="lp-hero__headline">
            Empowering the Future of Rice<br />
            <span className="lp-green">Supply Chain Management</span>
          </h1>
          <p className="lp-hero__sub">
            Built for smarter inventory, logistics, and supply chain operations.
          </p>
          <div className="lp-hero__ctas">
            <button className="lp-btn lp-btn--cta" id="hero-register-btn">Register</button>
            <button className="lp-btn lp-btn--outline" onClick={() => scrollTo('about')} id="hero-learn-btn">Learn More</button>
          </div>
        </div>

        {/* Dashboard mockup image */}
        <div className="lp-hero__mockup-wrap">
          <img
            src={dashboardMockup}
            alt="GrainRise Dashboard on a desktop monitor"
            className="lp-hero__mockup"
          />
        </div>

        {/* Stakeholder ticker */}
        <div className="lp-hero__ticker">
          <span className="lp-ticker__label">Built for Rice Supply Chain Stakeholders</span>
          <div className="lp-ticker__items">
            <div className="lp-ticker__item"><IconRetailer /><span>Retailers</span></div>
            <div className="lp-ticker__item"><IconSupplier /><span>Suppliers</span></div>
            <div className="lp-ticker__item"><IconDistributor /><span>Distributors</span></div>
            <div className="lp-ticker__item"><IconWarehouse /><span>Warehouses</span></div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─── */}
      <section className="lp-stats" ref={statsRef}>
        <div className="lp-stats__item">
          <div className="lp-stats__number">{statsInView ? c500 : 0}+</div>
          <div className="lp-stats__label">Businesses Supported</div>
        </div>
        <div className="lp-stats__item">
          <div className="lp-stats__number">{statsInView ? c120 : 0}K</div>
          <div className="lp-stats__label">Rice Bags Trackable</div>
        </div>
        <div className="lp-stats__item">
          <div className="lp-stats__number">{statsInView ? c98 : 0}%</div>
          <div className="lp-stats__label">Delivery Accuracy</div>
        </div>
        <div className="lp-stats__item">
          <div className="lp-stats__number">24/7</div>
          <div className="lp-stats__label">System Monitoring</div>
        </div>
      </section>

      {/* ── ABOUT ─── */}
      <section className="lp-about" id="about">
        <div className="lp-about__text">
          <h2 className="lp-section-headline">
            Transforming Rice Supply Chains Through Innovation and Technology
          </h2>
          <p className="lp-about__body">
            GrainRise modernizes rice distribution through smart tools and sustainable practices. We connect key stakeholders across the ecosystem helping create a cleaner, faster, and more reliable supply chain.
          </p>
          <p className="lp-about__body">
            Built on innovation and inclusivity, we help businesses reduce waste, improve planning, and increase profitability. With AI-driven insights and forecasting, teams can make smarter decisions with confidence.
          </p>
          <div className="lp-about__checks">
            <div className="lp-check-item"><IconCheck /><span>Real time visibility</span></div>
            <div className="lp-check-item"><IconCheck /><span>Smarter restocking</span></div>
            <div className="lp-check-item"><IconCheck /><span>Cleaner operations</span></div>
          </div>
        </div>

        {/* About image */}
        <div className="lp-about__image-wrap">
          <img
            src={groceryImg}
            alt="Grocery and rice products"
            className="lp-about__image"
          />
        </div>
      </section>

      {/* ── ECOSYSTEM ─── */}
      <section className="lp-ecosystem" id="ecosystem">
        <div className="lp-ecosystem__badge">How it works</div>
        <h2 className="lp-section-headline lp-section-headline--center">
          Connected Supply Chain Ecosystem
        </h2>
        <div className="lp-ecosystem__flow">
          {ECOSYSTEM_STEPS.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="lp-flow-step">
                <div className="lp-flow-icon">{step.icon}</div>
                <span className="lp-flow-label">{step.label}</span>
              </div>
              {i < ECOSYSTEM_STEPS.length - 1 && (
                <div className="lp-flow-arrow"><IconArrow /></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── SERVICES ─── */}
      <section className="lp-services" id="services">
        <div className="lp-services__left">
          <h2 className="lp-section-headline">Our Services</h2>
          <p className="lp-services__sub">
            Everything you need to run a cleaner, faster, and more predictable rice distribution workflow.
          </p>
          {/* Grain hands image */}
          <div className="lp-services__image-wrap">
            <img
              src={grainHands}
              alt="Hands holding rice grain"
              className="lp-services__image"
            />
          </div>
        </div>

        <div className="lp-services__right">
          {SERVICES.map(svc => (
            <div key={svc.name} className="lp-service-item">
              <div className="lp-service-icon">
                <span>{svc.emoji}</span>
              </div>
              <div className="lp-service-text">
                <div className="lp-service-name">{svc.name}</div>
                <div className="lp-service-desc">{svc.desc}</div>
              </div>
              <div className="lp-service-arrow"><IconChevronRight /></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY CHOOSE ─── */}
      <section className="lp-why" id="why">
        <div className="lp-why__header">
          <h2 className="lp-why__title">Why Choose <span className="lp-green">GrainRise</span>?</h2>
          <p className="lp-why__sub">A smarter way to manage rice distribution — built for clarity, speed, and better decision-making.</p>
        </div>
        <div className="lp-why__grid">
          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={bluescreenImg} alt="Real-Time Tracking" className="lp-why-card__img" />
              <div className="lp-why-card__overlay">
                <span className="lp-why-card__tag">Real-Time Tracking</span>
                <p className="lp-why-card__desc">Monitor your inventory, shipments, and operations in real-time from any device.</p>
              </div>
            </div>
          </div>
          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={talkieImg} alt="User Management" className="lp-why-card__img" />
              <div className="lp-why-card__overlay">
                <span className="lp-why-card__tag">User Management</span>
                <p className="lp-why-card__desc">Manage roles and access across your entire team — from warehouse staff to retailers — from one place.</p>
              </div>
            </div>
          </div>
          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={dashboardMockup} alt="Secure & Compliant" className="lp-why-card__img" />
              <div className="lp-why-card__overlay">
                <span className="lp-why-card__tag">Secure &amp; Compliant</span>
                <p className="lp-why-card__desc">Protection measures help keep your data safe and standards-ready across all operations.</p>
              </div>
            </div>
          </div>
          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={pinkscreenImg} alt="Advanced Analytics" className="lp-why-card__img" />
              <div className="lp-why-card__overlay">
                <span className="lp-why-card__tag">Advanced Analytics</span>
                <p className="lp-why-card__desc">Use reports to track performance, spot trends, and continuously improve operations.</p>
              </div>
            </div>
          </div>
          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={grainHands} alt="Sales Management" className="lp-why-card__img" />
              <div className="lp-why-card__overlay">
                <span className="lp-why-card__tag">Sales Management</span>
                <p className="lp-why-card__desc">Track orders, monitor sales performance, and manage retailer transactions efficiently in one dashboard.</p>
              </div>
            </div>
          </div>
          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={stockImg} alt="Procurement Control" className="lp-why-card__img" />
              <div className="lp-why-card__overlay">
                <span className="lp-why-card__tag">Procurement Control</span>
                <p className="lp-why-card__desc">Streamline supplier orders, purchase requests, and procurement approvals across your supply chain.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─── */}
      <section className="lp-testimonials" id="testimonials">
        <div className="lp-testimonials__header">
          <h2 className="lp-testimonials__title">What our <span className="lp-green">Partners</span> Say</h2>
          <p className="lp-testimonials__sub">Hear from the people transforming their supply chains with GrainRise.</p>
        </div>
        
        <div className="lp-testimonials__carousel-wrap">
          <div className="lp-testimonials__carousel-overflow">
            <div 
              className="lp-testimonials__slider"
              style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
            >
              {TESTIMONIALS.map((t, idx) => (
                <div className="lp-testimonials__slide" key={idx}>
                  <div className="lp-tcard">
                    <div className="lp-tcard__quote">“”</div>
                    <p className="lp-tcard__body">{t.body}</p>
                    <div className="lp-tcard__author">
                      <div className="lp-tcard__avatar" style={{background: t.color}}>{t.initials}</div>
                      <div>
                        <div className="lp-tcard__name">{t.name}</div>
                        <div className="lp-tcard__role">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="lp-testimonials__controls">
            <button 
              className="lp-tcarousel-btn" 
              onClick={() => setCurrentTestimonial(p => Math.max(0, p - 1))} 
              disabled={currentTestimonial === 0}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="lp-tcarousel-dots">
              {TESTIMONIALS.map((_, i) => (
                <button 
                  key={i} 
                  className={`lp-tcarousel-dot ${currentTestimonial === i ? 'active' : ''}`} 
                  onClick={() => setCurrentTestimonial(i)}
                  aria-label={`Go to slide ${i+1}`}
                />
              ))}
            </div>
            <button 
              className="lp-tcarousel-btn" 
              onClick={() => setCurrentTestimonial(p => Math.min(TESTIMONIALS.length - 1, p + 1))} 
              disabled={currentTestimonial === TESTIMONIALS.length - 1}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─── */}
      <section className="lp-cta-banner">
        <div className="lp-cta-banner__inner">
          <h2 className="lp-cta-banner__headline">
            Power the Future of Rice Distribution
          </h2>
          <p className="lp-cta-banner__sub">
            Register as a Supplier or Warehouse Manager and manage your operations with GrainRise.
          </p>
          <button
            className="lp-btn lp-btn--cta lp-btn--lg"
            id="cta-get-started-btn"
          >
            Register
          </button>
        </div>
      </section>

      {/* ── FOOTER ─── */}
      <footer className="lp-footer" id="footer">
        <div className="lp-footer__inner">

          {/* Brand column */}
          <div className="lp-footer__brand">
            <div className="lp-footer__brand-logo">
              <GrainRiseLogo />
            </div>
            <p className="lp-footer__tagline">
              Transforming rice supply chains with intelligent technology and data-driven insights for a sustainable future.
            </p>
            <div className="lp-footer__socials">
              <button className="lp-footer__social-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </button>
              <button className="lp-footer__social-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </span>
                  grainriseph@gmail.com
                </li>
                <li>
                  <span className="lp-footer__contact-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
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
          </div>
        </div>
      </footer>
    </div>
  );
}
