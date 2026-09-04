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
  ClipboardList,
  ShieldCheck,
  LogIn,
  UserPlus,
  Building2,
  ShoppingBag,
  ShoppingCart,
  CloudSun,
  KeyRound,
  HelpCircle,
  Headphones
} from 'lucide-react';

// Images
import dashboardMockup from './assets/dashboardd.png';
import phoneMockup from './assets/phone3.png';
import grainHands from './assets/handss.png';
import groceryImg from './assets/Grocery.png';
import warehouseImg from './assets/supplier-warehouse.jpg';
import bluescreenImg from './assets/bluescreen.jpg';
import talkieImg from './assets/talkie.jpg';
import pinkscreenImg from './assets/pinkscreen.jpg';
import stockImg from './assets/stock.jpg';
import phoneImg from './assets/phone.jpg';
import phone2Img from './assets/phone2.jpg';
import ctaBgImg from './assets/adminloginBG.png';
import grainBgImg from './assets/grainnn.jpg';
import fieldBgImg from './assets/field2.png';
import riceBgImg from './assets/ricee.jpg';
import heroBgImg from './assets/burnt.jpg';

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
function useInView(threshold = 0.12, rootMargin = '0px 0px -40px 0px') {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        obs.unobserve(el);
      }
    }, { threshold, rootMargin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);
  return [ref, inView];
}

// ─── Scroll Reveal Wrapper ────────────────────────────────────────────────────
function AnimatedSection({ children, className = '', id, tag: Tag = 'section', animation = 'fade-up' }) {
  const [ref, inView] = useInView(0.15);
  return (
    <Tag
      ref={ref}
      id={id}
      className={`${className} lp-reveal lp-reveal--${animation} ${inView ? 'lp-reveal--visible' : ''}`}
    >
      {children}
    </Tag>
  );
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
    { icon: <Tractor size={24} strokeWidth={1.8} />,        label: 'Farmers'    },
    { icon: <Truck size={24} strokeWidth={1.8} />,          label: 'Millers'    },
    { icon: <Warehouse size={24} strokeWidth={1.8} />,      label: 'Warehouse'  },
    { icon: <Package size={24} strokeWidth={1.8} />,        label: 'Inventory'  },
    { icon: <ClipboardList size={24} strokeWidth={1.8} />,   label: 'Orders'     },
    { icon: <Truck size={24} strokeWidth={1.8} />,          label: 'Transport'  },
    { icon: <Store size={24} strokeWidth={1.8} />,          label: 'Retailers'  },
  ];

  const ROLE_PORTALS = [
    {
      icon: <Tractor size={24} strokeWidth={1.8} />,
      title: 'Farmer Portal',
      desc: 'Log harvests, monitor field agro-climatic advisories, verify moisture grades, and access forward pricing contracts.',
      linkText: 'Continue as Farmer',
      path: '/login',
    },
    {
      icon: <Building2 size={24} strokeWidth={1.8} />,
      title: 'Miller Portal',
      desc: 'Oversee paddy intake lots, run continuous milling schedules, bid on co-op tenders, and generate milled output manifests.',
      linkText: 'Continue as Miller',
      path: '/login',
    },
    {
      icon: <ShoppingBag size={24} strokeWidth={1.8} />,
      title: 'Buyer Portal',
      desc: 'Execute institutional procurement, bid on commercial rice parcels, review provenance dossiers, and manage contracts.',
      linkText: 'Continue as Buyer',
      path: '/login',
    },
    {
      icon: <ShoppingCart size={24} strokeWidth={1.8} />,
      title: 'Retailer Portal',
      desc: 'Source authenticated milled sacks, coordinate freight drop-offs, track inbound delivery shipments, and update inventory.',
      linkText: 'Continue as Retailer',
      path: '/login',
    },
    {
      icon: <Warehouse size={24} strokeWidth={1.8} />,
      title: 'Warehouse Portal',
      desc: 'Audit buffer stock silos, orchestrate pallet movements, manage bay storage thermography, and validate dispatch waybills.',
      linkText: 'Continue as Warehouse',
      path: '/login',
    },
  ];

  const EXPLORE_FEATURES = [
    {
      icon: <ShoppingBag size={20} strokeWidth={1.8} />,
      title: 'Procurement & Sourcing',
      desc: 'Opportunities, bidding, product sourcing, and procurement.',
    },
    {
      icon: <Package size={20} strokeWidth={1.8} />,
      title: 'Inventory',
      desc: 'Stock availability, monitoring, and warehouse inventory.',
    },
    {
      icon: <CloudSun size={20} strokeWidth={1.8} />,
      title: 'Climate & Forecasting',
      desc: 'Climate-informed farming and demand forecasting.',
    },
    {
      icon: <FileText size={20} strokeWidth={1.8} />,
      title: 'Contracts',
      desc: 'Applications, offers, agreements, and active contracts.',
    },
    {
      icon: <ClipboardList size={20} strokeWidth={1.8} />,
      title: 'Orders & Transactions',
      desc: 'Purchasing, order processing, and transaction records.',
    },
    {
      icon: <Truck size={20} strokeWidth={1.8} />,
      title: 'Delivery & Logistics',
      desc: 'Fulfillment, delivery coordination, and logistics tracking.',
    },
  ];

  const HELP_CARDS = [
    {
      icon: <KeyRound size={18} strokeWidth={2} />,
      title: 'Login Assistance',
      desc: 'Recover account access or reset credentials.',
      linkText: 'Recover Access',
      action: () => navigate('/login'),
    },
    {
      icon: <HelpCircle size={18} strokeWidth={2} />,
      title: 'Frequently Asked Questions',
      desc: 'Find answers about portal access and system use.',
      linkText: 'Read FAQs',
      action: () => alert('Frequently Asked Questions coming soon!'),
    },
    {
      icon: <FileText size={18} strokeWidth={2} />,
      title: 'Registration Guide',
      desc: 'Get guidance on registering for GrainRise.',
      linkText: 'View Guide',
      action: () => navigate('/register'),
    },
    {
      icon: <Headphones size={18} strokeWidth={2} />,
      title: 'Contact Support',
      desc: 'Contact the GrainRise support team.',
      linkText: 'Contact Desk',
      action: () => { window.location.href = 'mailto:grainriseph@gmail.com'; },
    },
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
    <div className="lp-root animate-page-fade">
      
      {/* Reusable Landing Page Header */}
      <LandingHeader />

      {/* ── HERO ─── */}
      <section className="lp-hero" id="hero">
        <div className="lp-hero__bg" style={{ backgroundImage: `url(${heroBgImg})` }} />
        <div className="lp-hero__overlay" />

        <div className="lp-hero__inner">
          {/* Left Column: Headline, Badge, Subtitle & CTAs */}
          <div className="lp-hero__content">
            <div className="lp-hero__badge">
              <ShieldCheck size={16} strokeWidth={2.2} />
              <span>Centralized System Portal</span>
            </div>

            <h1 className="lp-hero__headline">
              GrainRise Supply Chain<br />
              Portal
            </h1>

            <p className="lp-hero__sub">
              A centralized, mission-critical platform synchronizing farmers, cooperative millers, institutional buyers, regional silos, and retailers across the national rice reserve and distribution grid.
            </p>

            <div className="lp-hero__ctas">
              <button
                className="lp-btn lp-btn--primary lp-hero__btn-login"
                onClick={() => navigate('/login')}
                id="hero-login-btn"
              >
                <LogIn size={16} strokeWidth={2.2} />
                <span>Log In</span>
              </button>
              <button
                className="lp-btn lp-btn--outline lp-hero__btn-register"
                onClick={() => navigate('/register')}
                id="hero-register-btn"
              >
                <UserPlus size={16} strokeWidth={2} />
                <span>Register / Join GrainRise</span>
              </button>
            </div>
          </div>

          {/* Right Column: Dashboard Mockup */}
          <div className="lp-hero__mockup-wrap">
            <img
              src={dashboardMockup}
              alt="GrainRise Supply Chain Portal Dashboard"
              className="lp-hero__mockup"
            />
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM ─── */}
      <AnimatedSection className="lp-ecosystem" id="ecosystem">
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
                <div className="lp-flow-arrow"><ArrowRight size={18} strokeWidth={1.8} /></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </AnimatedSection>

      {/* ── ROLE PORTALS ─── */}
      <AnimatedSection className="lp-portals" id="portal-access">
        <div className="lp-portals__inner">
          <div className="lp-portals__header">
            <h2 className="lp-section-headline lp-section-headline--center">
              Access the GrainRise Portal
            </h2>
            <p className="lp-portals__sub">
              Select your role to continue to the GrainRise tools and services designed for your part of the rice supply chain.
            </p>
          </div>

          <div className="lp-portals__grid">
            {ROLE_PORTALS.map((portal) => (
              <div
                key={portal.title}
                className="lp-portal-card"
                onClick={() => navigate(portal.path)}
                role="button"
                tabIndex={0}
              >
                <div className="lp-portal-card__icon">{portal.icon}</div>
                <h3 className="lp-portal-card__title">{portal.title}</h3>
                <p className="lp-portal-card__desc">{portal.desc}</p>
                <div className="lp-portal-card__action">
                  <span>{portal.linkText}</span>
                  <ArrowRight size={15} strokeWidth={2} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ── EXPLORE GRAINRISE ─── */}
      <AnimatedSection className="lp-explore" id="explore-grainrise">
        <div className="lp-explore__inner">
          <div className="lp-explore__header">
            <h2 className="lp-section-headline lp-section-headline--center">
              Explore GrainRise
            </h2>
            <p className="lp-explore__sub">
              Access the major tools supporting farming, procurement, inventory, forecasting, contracts, and distribution.
            </p>
          </div>

          <div className="lp-explore__grid">
            {EXPLORE_FEATURES.map((item) => (
              <div key={item.title} className="lp-explore-card">
                <div className="lp-explore-card__icon-wrap">
                  {item.icon}
                </div>
                <div className="lp-explore-card__content">
                  <h3 className="lp-explore-card__title">{item.title}</h3>
                  <p className="lp-explore-card__desc">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ── TAKE GRAINRISE ANYWHERE (MOBILE PROMO) ─── */}
      <AnimatedSection className="lp-mobile-app" id="mobile-promo">
        <div className="lp-mobile-app__bg" style={{ backgroundImage: `url(${riceBgImg})` }} />
        <div className="lp-mobile-app__overlay" />
        <div className="lp-mobile-app__glow lp-mobile-app__glow--1" />
        <div className="lp-mobile-app__glow lp-mobile-app__glow--2" />
        <div className="lp-mobile-app__inner">
          <div className="lp-mobile-app__phone-col">
            <div className="lp-phone-orb lp-phone-orb--top" />
            <div className="lp-phone-orb lp-phone-orb--bottom" />
            <img
              src={phoneMockup}
              alt="GrainRise Mobile Application on Smartphone"
              className="lp-mobile-app__phone-img"
            />
          </div>

          <div className="lp-mobile-app__content-col">
            <h2 className="lp-mobile-app__headline">
              Take GrainRise<br />Anywhere
            </h2>
            <p className="lp-mobile-app__sub">
              Manage your operations wherever you are. Access inventory, deliveries, and transactions with the GrainRise mobile app.
            </p>
            <button
              className="lp-btn lp-mobile-app__btn"
              onClick={() => alert("Downloading GrainRise APK...")}
            >
              <Download size={17} strokeWidth={2.2} />
              <span>Download APK</span>
            </button>
          </div>
        </div>
      </AnimatedSection>

      {/* ── OPERATIONAL SUPPORT / HELP ─── */}
      <AnimatedSection className="lp-help" id="help">
        <div className="lp-help__inner">
          <div className="lp-help__left">
            <div className="lp-help__badge">Operational Support</div>
            <h2 className="lp-help__headline">
              Need Help Accessing<br />
              GrainRise?
            </h2>
          </div>

          <div className="lp-help__grid">
            {HELP_CARDS.map((card) => (
              <div
                key={card.title}
                className="lp-help-card"
                onClick={card.action}
                role="button"
                tabIndex={0}
              >
                <div className="lp-help-card__icon-wrap">
                  {card.icon}
                </div>
                <h3 className="lp-help-card__title">{card.title}</h3>
                <p className="lp-help-card__desc">{card.desc}</p>
                <div className="lp-help-card__action">
                  <span>{card.linkText}</span>
                  <ArrowRight size={14} strokeWidth={2} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Reusable Landing Page Footer */}
      <LandingFooter />

    </div>
  );
}
