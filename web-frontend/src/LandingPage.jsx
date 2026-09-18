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
  ArrowRight,
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
  Headphones,
  User
} from 'lucide-react';

// Images
import mockup10 from './assets/10.png';
import phoneMockup from './assets/phone3.png';
import riceBgImg from './assets/ricee.jpg';
import heroBgImg from './assets/greenery.jpg';
import glassImg from './assets/glass.png';
import headsetImg from './assets/headset.png';

// ─── Intersection Observer Hook ───────────────────────────────────────────────
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
function AnimatedSection({ children, className = '', id, tag: Tag = 'section', animation = 'fade-up', delay = 0, ...props }) {
  const [ref, inView] = useInView(0.15);
  return (
    <Tag
      ref={ref}
      id={id}
      style={{ transitionDelay: `${delay}ms` }}
      className={`${className} lp-reveal lp-reveal--${animation} ${inView ? 'lp-reveal--visible' : ''}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();
  const { hash } = useLocation();

  // Scroll depth tracking for smooth parallax interactions
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to sections via hash or header clicks
  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      setTimeout(() => scrollTo(id), 100);
    }
  }, [hash]);

  const ECOSYSTEM_STEPS = [
    { icon: <Tractor size={22} strokeWidth={1.8} />,        label: 'Farmers'    },
    { icon: <Truck size={22} strokeWidth={1.8} />,          label: 'Millers'    },
    { icon: <Warehouse size={22} strokeWidth={1.8} />,      label: 'Warehouse'  },
    { icon: <ClipboardCheck size={22} strokeWidth={1.8} />, label: 'Inventory'  },
    { icon: <FileText size={22} strokeWidth={1.8} />,       label: 'Orders'     },
    { icon: <Truck size={22} strokeWidth={1.8} />,          label: 'Transport'  },
    { icon: <Store size={22} strokeWidth={1.8} />,          label: 'Retailers'  },
    { icon: <User size={22} strokeWidth={1.8} />,           label: 'Consumer'   },
  ];

  // Restored: All 5 Role Portals & Routes
  const ROLE_PORTALS = [
    {
      icon: <Tractor size={24} strokeWidth={1.8} />,
      title: 'Farmer Portal',
      desc: 'Log harvests, monitor field agro-climatic advisories, verify moisture grades, and access forward pricing contracts.',
      linkText: 'Continue as Farmer',
      path: '/register/farmer',
    },
    {
      icon: <Building2 size={24} strokeWidth={1.8} />,
      title: 'Miller Portal',
      desc: 'Oversee paddy intake lots, run continuous milling schedules, bid on co-op tenders, and generate milled output manifests.',
      linkText: 'Continue as Miller',
      path: '/register/supplier',
    },
    {
      icon: <ShoppingBag size={24} strokeWidth={1.8} />,
      title: 'Consumer Portal',
      desc: 'Execute institutional procurement, bid on commercial rice parcels, review provenance dossiers, and manage contracts.',
      linkText: 'Continue as Consumer',
      path: '/register',
    },
    {
      icon: <ShoppingCart size={24} strokeWidth={1.8} />,
      title: 'Retailer Portal',
      desc: 'Source authenticated milled sacks, coordinate freight drop-offs, track inbound delivery shipments, and update inventory.',
      linkText: 'Continue as Retailer',
      path: '/register/retailer',
    },
    {
      icon: <Warehouse size={24} strokeWidth={1.8} />,
      title: 'Warehouse Portal',
      desc: 'Audit buffer stock silos, orchestrate pallet movements, manage bay storage thermography, and validate dispatch waybills.',
      linkText: 'Continue as Warehouse',
      path: '/register/warehouse-manager',
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
      action: () => navigate('/login-assistance'),
    },
    {
      icon: <HelpCircle size={18} strokeWidth={2} />,
      title: 'Frequently Asked Questions',
      desc: 'Find answers about portal access and system use.',
      linkText: 'Read FAQs',
      action: () => navigate('/faqs'),
    },
    {
      icon: <FileText size={18} strokeWidth={2} />,
      title: 'Registration Guide',
      desc: 'Get guidance on registering for GrainRise.',
      linkText: 'View Guide',
      action: () => navigate('/registration-guide'),
    },
    {
      icon: <Headphones size={18} strokeWidth={2} />,
      title: 'Contact Support',
      desc: 'Contact the GrainRise support team.',
      linkText: 'Contact Desk',
      action: () => navigate('/contact-support'),
    },
  ];

  return (
    <div className="lp-root animate-page-fade">
      
      {/* Restored: Header navigation handlers */}
      <LandingHeader scrollTo={scrollTo} onNavigate={scrollTo} />

      {/* ── HERO ─── */}
      <section className="lp-hero" id="hero">
        <div className="lp-hero__bg" style={{ backgroundImage: `url(${heroBgImg})` }} />
        <div className="lp-hero__overlay" />

        <div className="lp-hero__inner">
          <div className="lp-hero__content">
            <div className="lp-hero__badge">
              <ShieldCheck size={15} strokeWidth={2.2} />
              <span>Centralized System Portal</span>
            </div>

            <h1 className="lp-hero__headline">
              <span className="inline-block whitespace-nowrap">GrainRise Supply Chain</span><br />
              <span>Portal</span>
            </h1>

            <p className="lp-hero__sub">
              A centralized, mission-critical platform synchronizing farmers, cooperative<br />
              millers, institutional buyers, regional silos, and retailers across the national<br />
              rice reserve and distribution grid.
            </p>

            <div className="lp-hero__ctas">
              <button
                className="lp-hero__btn-login"
                onClick={() => navigate('/login')}
                id="hero-login-btn"
              >
                <LogIn size={15} strokeWidth={2.2} />
                <span>Log In</span>
              </button>
              <button
                className="lp-hero__btn-register"
                onClick={() => navigate('/register')}
                id="hero-register-btn"
              >
                <UserPlus size={15} strokeWidth={2} />
                <span>Register / Join GrainRise</span>
              </button>
            </div>
          </div>

          <div className="lp-hero__mockup-wrap">
            <img
              src={mockup10}
              alt="GrainRise Supply Chain Portal Dashboard"
              className="lp-hero__mockup"
            />
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM, PORTALS & EXPLORE WRAPPER ─── */}
      <div className="lp-ecosystem-portals-wrapper">
        
        {/* ── ECOSYSTEM (Fade Up Effect) ─── */}
        <AnimatedSection className="lp-ecosystem" id="ecosystem" animation="fade-up">
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

        {/* ── ROLE PORTALS (Staggered Cards with Scale & Fade-Up Effect) ─── */}
        <AnimatedSection className="lp-portals" id="portal-access" animation="scale">
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
              {ROLE_PORTALS.map((portal, index) => (
                <AnimatedSection
                  key={portal.title}
                  tag="div"
                  animation="fade-up"
                  delay={index * 100}
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
                </AnimatedSection>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ── EXPLORE GRAINRISE (Zoom & Blur Effect) ─── */}
        <AnimatedSection className="lp-explore" id="explore-grainrise" animation="zoom">
          <div className="lp-explore__bg" style={{ backgroundImage: `url(${glassImg})` }} />
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
              {EXPLORE_FEATURES.map((item, idx) => (
                <AnimatedSection 
                  key={item.title} 
                  tag="div" 
                  animation="fade-up" 
                  delay={idx * 80} 
                  className="lp-explore-card"
                >
                  <div className="lp-explore-card__icon-wrap">
                    {item.icon}
                  </div>
                  <div className="lp-explore-card__content">
                    <h3 className="lp-explore-card__title">{item.title}</h3>
                    <p className="lp-explore-card__desc">{item.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* ── TAKE GRAINRISE ANYWHERE (Slide Left & Right Parallel Split) ─── */}
      <section className="lp-mobile-app" id="mobile-promo">
        <div className="lp-mobile-app__bg" style={{ backgroundImage: `url(${riceBgImg})` }} />
        <div className="lp-mobile-app__overlay" />
        <div className="lp-mobile-app__glow lp-mobile-app__glow--1" />
        <div className="lp-mobile-app__glow lp-mobile-app__glow--2" />
        <div className="lp-mobile-app__inner">
          
          <AnimatedSection className="lp-mobile-app__phone-col" animation="slide-left">
            <div className="lp-phone-orb lp-phone-orb--top" />
            <div className="lp-phone-orb lp-phone-orb--bottom" />
            <img
              src={phoneMockup}
              alt="GrainRise Mobile Application"
              className="lp-mobile-app__phone-img"
              style={{ transform: `translateY(${Math.min(18, scrollY * 0.02)}px)` }}
            />
          </AnimatedSection>

          <AnimatedSection className="lp-mobile-app__content-col" animation="slide-right">
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
              <Download size={16} strokeWidth={2} />
              <span>Install on Mobile</span>
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* ── OPERATIONAL SUPPORT / HELP (Scale Reveal) ─── */}
      <AnimatedSection className="lp-help" id="help" animation="scale">
        <div className="lp-help__inner">
          <div className="lp-help__left">
            <div className="lp-help__badge">Operational Support</div>
            <h2 className="lp-help__headline">
              Need Help Accessing<br />
              GrainRise?
            </h2>
            <img src={headsetImg} alt="GrainRise Support Headset" className="lp-help__img" />
          </div>

          <div className="lp-help__grid">
            {HELP_CARDS.map((card, idx) => (
              <AnimatedSection
                key={card.title}
                tag="div"
                animation="fade-up"
                delay={idx * 100}
                className="lp-help-card"
                onClick={card.action}
                onKeyDown={(e) => e.key === 'Enter' && card.action()}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
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
              </AnimatedSection>
            ))}

          </div>
        </div>
      </AnimatedSection>

      {/* Reusable Landing Page Footer */}
      <LandingFooter />

    </div>
  );
}