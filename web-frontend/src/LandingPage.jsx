import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './LandingPage.css';

// Reusable Components
import LandingHeader from './Components/Major-Components/LandingHeader';
import LandingFooter from './Components/Major-Components/LandingFooter';

// Icons
import {
  Store,
  Truck,
  Warehouse,
  Package,
  FileText,
  CheckCircle,
  ChevronRight,
  ArrowRight,
  ChevronLeft,
  BarChart3,
  TrendingUp,
  Wrench,
  Download,
  Tractor,
  ClipboardCheck,
  ClipboardList
} from 'lucide-react';

// Images
import dashboardMockup from './assets/lapisIStop.png';
import grainHands from './assets/handss.png';
import groceryImg from './assets/Grocery.png';
import bluescreenImg from './assets/bluescreen.jpg';
import talkieImg from './assets/talkie.jpg';
import pinkscreenImg from './assets/pinkscreen.jpg';
import stockImg from './assets/stock.jpg';
import phoneImg from './assets/phone.jpg';
import phone2Img from './assets/phone2.jpg';
import ctaBgImg from './assets/adminloginBG.png';

// ─── Animated counter ─────────────────────────────────────────────────────────
function useCounter(target, duration, trigger) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let current = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
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
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const navigate = useNavigate();
  const { hash } = useLocation();

  // Scroll to hash element on load or hash change (e.g. when navigating from /login)
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [hash]);

  const [statsRef, statsInView] = useInView(0.3);
  const c500 = useCounter(500, 2000, statsInView);
  const c120 = useCounter(120, 2200, statsInView);
  const c98  = useCounter(98,  1800, statsInView);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const ECOSYSTEM_STEPS = [
    { icon: <Tractor size={26} strokeWidth={1.8} />,        label: 'Suppliers'  },
    { icon: <Warehouse size={26} strokeWidth={1.8} />,      label: 'Warehouse'  },
    { icon: <ClipboardCheck size={26} strokeWidth={1.8} />,  label: 'Inventory'  },
    { icon: <ClipboardList size={26} strokeWidth={1.8} />,   label: 'Orders'     },
    { icon: <Truck size={26} strokeWidth={1.8} />,          label: 'Transport'  },
    { icon: <Store size={26} strokeWidth={1.8} />,          label: 'Retailers'  },
  ];

  const TESTIMONIALS = [
    {
      body: "GrainRise has completely revolutionized how we handle seasonal spikes. Our inventory accuracy jumped from 82% to 99% in just three months. It's the brain of our operation.",
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
    { icon: <BarChart3 size={20} strokeWidth={1.8} />, name: 'Stock Awareness',    desc: 'See current stock levels instantly to prevent shortages and overstocking.' },
    { icon: <Package  size={20} strokeWidth={1.8} />, name: 'Inventory Control',  desc: 'Track inflow and outflow with accurate inventory records.' },
    { icon: <TrendingUp size={20} strokeWidth={1.8} />, name: 'Demand Forecasting', desc: 'Predict demand using historical data for smarter restocking.' },
    { icon: <Truck    size={20} strokeWidth={1.8} />, name: 'Delivery Tracking',  desc: 'Monitor deliveries in real time with clear route visibility.' },
    { icon: <Wrench   size={20} strokeWidth={1.8} />, name: 'Operation Tools',    desc: 'Built-in tools for smoother workflows and coordination.' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial(p => (p + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lp-root">
      
      {/* Reusable Landing Page Header */}
      <LandingHeader />

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
            <button className="lp-btn lp-btn--cta" onClick={() => navigate('/register')} id="hero-register-btn">Join Us Now</button>
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
            <div className="lp-ticker__item"><Store size={26} strokeWidth={1.8} /><span>Retailers</span></div>
            <div className="lp-ticker__item"><Truck size={26} strokeWidth={1.8} /><span>Suppliers</span></div>
            <div className="lp-ticker__item"><Warehouse size={26} strokeWidth={1.8} /><span>Warehouses</span></div>
          </div>
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
                <div className="lp-flow-arrow"><ArrowRight size={20} strokeWidth={1.5} color="#aac8aa" /></div>
              )}
            </React.Fragment>
          ))}
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
            <div className="lp-check-item"><CheckCircle size={18} strokeWidth={2} /><span>Real-time visibility</span></div>
            <div className="lp-check-item"><CheckCircle size={18} strokeWidth={2} /><span>Smarter restocking</span></div>
            <div className="lp-check-item"><CheckCircle size={18} strokeWidth={2} /><span>Cleaner operations</span></div>
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
                {svc.icon}
              </div>
              <div className="lp-service-text">
                <div className="lp-service-name">{svc.name}</div>
                <div className="lp-service-desc">{svc.desc}</div>
              </div>
              <div className="lp-service-arrow"><ChevronRight size={18} strokeWidth={2} color="#2d6a35" /></div>
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
            </div>
            <div className="lp-why-card__content">
              <h3 className="lp-why-card__tag">REAL-TIME TRACKING</h3>
              <p className="lp-why-card__desc">Monitor your inventory, shipments, and operations in real-time from any device.</p>
            </div>
          </div>

          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={talkieImg} alt="User Management" className="lp-why-card__img" />
            </div>
            <div className="lp-why-card__content">
              <h3 className="lp-why-card__tag">USER MANAGEMENT</h3>
              <p className="lp-why-card__desc">Manage roles and access across your entire team — from warehouse staff to retailers — from one place.</p>
            </div>
          </div>

          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={dashboardMockup} alt="Secure & Compliant" className="lp-why-card__img" />
            </div>
            <div className="lp-why-card__content">
              <h3 className="lp-why-card__tag">SECURE &amp; COMPLIANT</h3>
              <p className="lp-why-card__desc">Protection measures help keep your data safe and standards-ready across all operations.</p>
            </div>
          </div>

          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={pinkscreenImg} alt="Advanced Analytics" className="lp-why-card__img" />
            </div>
            <div className="lp-why-card__content">
              <h3 className="lp-why-card__tag">ADVANCED ANALYTICS</h3>
              <p className="lp-why-card__desc">Use reports to track performance, spot trends, and continuously improve operations.</p>
            </div>
          </div>

          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={grainHands} alt="Sales Management" className="lp-why-card__img" />
            </div>
            <div className="lp-why-card__content">
              <h3 className="lp-why-card__tag">SALES MANAGEMENT</h3>
              <p className="lp-why-card__desc">Track orders, monitor sales performance, and manage retailer transactions efficiently in one dashboard.</p>
            </div>
          </div>

          <div className="lp-why-card">
            <div className="lp-why-card__img-wrap">
              <img src={stockImg} alt="Procurement Control" className="lp-why-card__img" />
            </div>
            <div className="lp-why-card__content">
              <h3 className="lp-why-card__tag">PROCUREMENT CONTROL</h3>
              <p className="lp-why-card__desc">Streamline supplier orders, purchase requests, and procurement approvals across your supply chain.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─── */}
      <section className="lp-testimonials" id="testimonials">
        <div className="lp-testimonials__header">
          <h2 className="lp-testimonials__title">What our <span className="lp-green">Partners</span> Say</h2>
        </div>
        
        <div className="lp-testimonials__grid">
          {TESTIMONIALS.map((t, idx) => (
            <div className="lp-tcard" key={idx}>
              <div className="lp-tcard__quote">“”</div>
              <p className="lp-tcard__body">"{t.body}"</p>
              <div className="lp-tcard__author">
                <div className="lp-tcard__avatar">{t.initials}</div>
                <div>
                  <div className="lp-tcard__name">{t.name}</div>
                  <div className="lp-tcard__role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MOBILE PROMO ─── */}
      <section className="lp-mobile-promo">
        <div className="lp-mobile-promo__inner">
          <div className="lp-mobile-promo__images">
            <div className="lp-phone-wrap lp-phone-wrap--back">
              <img src={phoneImg} alt="GrainRise on smartphone back" className="lp-phone-img" />
            </div>
            <div className="lp-phone-wrap lp-phone-wrap--front">
              <img src={phone2Img} alt="GrainRise on smartphone front" className="lp-phone-img" />
            </div>
          </div>

          <div className="lp-mobile-promo__content">
            <h2 className="lp-mobile-promo__headline">
              Take GrainRise<br />Anywhere
            </h2>
            <p className="lp-mobile-promo__description">
              Stay connected with your operations wherever you are. Download the official GrainRise Android application to monitor inventory, warehouse activities, deliveries, and retailer transactions from your mobile device.
            </p>
            <button className="lp-mobile-promo__btn" onClick={() => alert("Downloading GrainRise APK...")}>
              <Download size={18} />
              Download APK
            </button>
            <p className="lp-mobile-promo__notice">
              Official Android APK . Secure Download . Optimized for GrainRise Users
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─── */}
      <section className="lp-cta-banner">
        <div className="lp-cta-banner__bg" style={{ backgroundImage: `url(${ctaBgImg})` }} />
        <div className="lp-cta-banner__overlay" />
        <div className="lp-cta-banner__inner">
          <h2 className="lp-cta-banner__headline">
            Power the Future of Rice Distribution
          </h2>
          <p className="lp-cta-banner__sub">
            Register as a <strong>Supplier</strong> or <strong>Warehouse Manager</strong> and manage your operations with GrainRise.
          </p>
          <button
            className="lp-btn lp-cta-banner__btn"
            onClick={() => navigate('/register/supplier-warehouse')}
            id="cta-get-started-btn"
          >
            Join Us Now
          </button>
        </div>
      </section>

      {/* Reusable Landing Page Footer */}
      <LandingFooter />

    </div>
  );
}
