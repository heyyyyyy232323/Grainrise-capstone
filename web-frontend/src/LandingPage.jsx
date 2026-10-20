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
  LogIn,
  UserPlus,
  Building2,
  ShoppingBag,
  ShoppingCart,
  CloudSun,
  KeyRound,
  Unlock,
  HelpCircle,
  Headphones,
  User,
  Users,
  Smartphone
} from 'lucide-react';

// Images
import mockup10 from './assets/10.png';
import phoneMockup from './assets/phone6.png';
import riceBgImg from './assets/ricee.jpg';
import heroBgImg from './assets/greenery.jpg';
import glassImg from './assets/glass.png';
import headsetImg from './assets/headset.png';
import shakehandsImg from './assets/shakehands2.png';

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
    { icon: <Tractor size={22} strokeWidth={1.8} />,        label: 'Farm'       },
    { icon: <Truck size={22} strokeWidth={1.8} />,          label: 'Millers'    },
    { icon: <Warehouse size={22} strokeWidth={1.8} />,      label: 'Warehouse'  },
    { icon: <ClipboardCheck size={22} strokeWidth={1.8} />, label: 'Inventory'  },
    { icon: <FileText size={22} strokeWidth={1.8} />,       label: 'Orders'     },
    { icon: <Truck size={22} strokeWidth={1.8} />,          label: 'Transport'  },
    { icon: <Store size={22} strokeWidth={1.8} />,          label: 'Retailers'  },
  ];

  const EXPLORE_FEATURES = [
    {
      icon: <ShoppingBag size={22} strokeWidth={1.8} />,
      title: 'Procurement & Sourcing',
      desc: 'Opportunities, bidding, product sourcing, and procurement.',
    },
    {
      icon: <Package size={22} strokeWidth={1.8} />,
      title: 'Inventory',
      desc: 'Stock availability, monitoring, and warehouse inventory.',
    },
    {
      icon: <CloudSun size={22} strokeWidth={1.8} />,
      title: 'Climate & Forecasting',
      desc: 'Climate-informed farming and demand forecasting.',
    },
    {
      icon: <FileText size={22} strokeWidth={1.8} />,
      title: 'Contracts',
      desc: 'Applications, offers, agreements, and active contracts.',
    },
    {
      icon: <ClipboardList size={22} strokeWidth={1.8} />,
      title: 'Orders & Transactions',
      desc: 'Purchasing, order processing, and transaction records.',
    },
    {
      icon: <Truck size={22} strokeWidth={1.8} />,
      title: 'Delivery & Logistics',
      desc: 'Fulfillment, delivery coordination, and logistics tracking.',
    },
  ];

  const STAKEHOLDER_CARDS = [
    {
      icon: <Building2 size={24} strokeWidth={1.8} />,
      title: 'Miller',
      desc: 'Manage rice procurement, milling operations, supply availability, contracts, orders, and distribution coordination.',
      action: () => navigate('/login'),
    },
    {
      icon: <Warehouse size={24} strokeWidth={1.8} />,
      title: 'Warehouse Portal',
      desc: 'Manage warehouse inventory, receiving, storage, fulfillment, distribution activities, and authorized warehouse operations.',
      action: () => navigate('/login'),
    },
    {
      icon: <ShoppingCart size={24} strokeWidth={1.8} />,
      title: 'Retailer Portal',
      desc: 'Manage rice sourcing, orders, inventory replenishment, deliveries, and transaction records.',
      action: () => navigate('/login'),
    },
  ];

  const HELP_CARDS = [
    {
      icon: <Unlock size={16} strokeWidth={1.8} />,
      title: 'Login Assistance',
      desc: 'Recover account access or reset credentials.',
      linkText: 'Recover Access',
      action: () => navigate('/login-assistance'),
    },
    {
      icon: <HelpCircle size={16} strokeWidth={1.8} />,
      title: 'Frequently Asked Questions',
      desc: 'Find answers about portal access and system use.',
      linkText: 'Read FAQs',
      action: () => navigate('/faqs'),
    },
    {
      icon: <FileText size={16} strokeWidth={1.8} />,
      title: 'Registration Guide',
      desc: 'Get guidance on registering for GrainRise.',
      linkText: 'View Guide',
      action: () => navigate('/registration-guide'),
    },
    {
      icon: <Headphones size={16} strokeWidth={1.8} />,
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
            <h1 className="lp-hero__headline">
              <span>GrainRise Supply Chain</span><br className="lp-hero__line-break" />
              <span>Portal</span>
            </h1>

            <p className="lp-hero__sub">
              A centralized, mission-critical platform synchronizing farmers, cooperative
              <br className="lp-hero__line-break" />
              millers, institutional buyers, regional silos, and retailers across the national
              <br className="lp-hero__line-break" />
              rice reserve and distribution grid.
            </p>

            <div className="lp-hero__ctas">
              <button
                className="lp-hero__btn-partner"
                onClick={() => navigate('/partner-with-us')}
                id="hero-partner-btn"
              >
                <Users size={16} strokeWidth={2} />
                <span>Partner With Us</span>
              </button>
              <button
                className="lp-hero__btn-login"
                onClick={() => navigate('/login')}
                id="hero-login-btn"
              >
                <LogIn size={16} strokeWidth={2} />
                <span>Log In</span>
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

        {/* ── EXPLORE GRAINRISE (Zoom & Blur Effect) ─── */}
        <AnimatedSection className="lp-explore" id="explore-grainrise" animation="zoom">
          <div className="lp-explore__bg" style={{ backgroundImage: `url(${glassImg})` }} />
          <div className="lp-explore__inner">
            <div className="lp-explore__header">
              <h2 className="lp-section-headline lp-section-headline--center lp-explore__title">
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

        {/* ── GRAINRISE STAKEHOLDERS ─── */}
        <AnimatedSection className="lp-stakeholders" id="stakeholders" animation="fade-up">
          <div className="lp-stakeholders__inner">
            <div className="lp-stakeholders__header">
              <h2 className="lp-stakeholders__title">
                GrainRise Stakeholders
              </h2>
              <p className="lp-stakeholders__sub">
                GrainRise connects authorized millers, warehouse owners, and retailers through a coordinated rice supply chain management system.
              </p>
            </div>

            <div className="lp-stakeholders__grid">
              {STAKEHOLDER_CARDS.map((card, idx) => (
                <AnimatedSection
                  key={card.title}
                  tag="div"
                  animation="fade-up"
                  delay={idx * 100}
                  className="lp-stakeholder-card"
                  onClick={card.action}
                  role="button"
                  tabIndex={0}
                >
                  <div className="lp-stakeholder-card__icon">
                    {card.icon}
                  </div>
                  <h3 className="lp-stakeholder-card__title">{card.title}</h3>
                  <p className="lp-stakeholder-card__desc">{card.desc}</p>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ── PARTNER WITH GRAINRISE ─── */}
        <AnimatedSection className="lp-partner-cta" id="partner-cta" animation="fade-up">
          <div className="lp-partner-cta__card">
            <div className="lp-partner-cta__content">
              <h2 className="lp-partner-cta__headline">
                Partner With GrainRise
              </h2>
              <p className="lp-partner-cta__sub">
                Interested in connecting your organization with the GrainRise supply chain network?<br />
                Send us your partnership details and our team will review your inquiry.
              </p>
              <button
                className="lp-partner-cta__btn"
                onClick={() => navigate('/partner-with-us')}
                id="partner-section-cta-btn"
              >
                <Users size={16} strokeWidth={2} />
                <span>Partner With Us</span>
              </button>
            </div>

            <div className="lp-partner-cta__img-wrap">
              <img
                src={shakehandsImg}
                alt="Partner With GrainRise"
                className="lp-partner-cta__img"
              />
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
              <Smartphone size={16} strokeWidth={2} />
              <span>Install on Mobile</span>
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* ── OPERATIONAL SUPPORT / HELP (Scale Reveal) ─── */}
      <AnimatedSection className="lp-help" id="help" animation="scale">
        <div className="lp-help__inner">
          <div className="lp-help__left">
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