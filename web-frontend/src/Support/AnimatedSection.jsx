import React, { useRef, useState, useEffect } from 'react';

/**
 * useInView hook that fires when the element enters the viewport.
 * Triggers once and stays visible.
 */
export function useInView(threshold = 0.1, rootMargin = '0px 0px -40px 0px') {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}

/**
 * AnimatedSection wrapper component for scroll reveal effects.
 * Supports: 'fade-up', 'fade-in', 'scale', 'slide-left', 'slide-right', 'zoom'
 */
export function AnimatedSection({
  children,
  className = '',
  id,
  tag: Tag = 'div',
  animation = 'fade-up',
  delay = 0,
  threshold = 0.1,
  style = {},
  ...props
}) {
  const [ref, inView] = useInView(threshold);

  return (
    <Tag
      ref={ref}
      id={id}
      style={{
        ...style,
        transitionDelay: `${delay}ms`,
      }}
      className={`lp-reveal lp-reveal--${animation} ${inView ? 'lp-reveal--visible' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default AnimatedSection;

