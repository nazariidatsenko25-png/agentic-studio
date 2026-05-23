'use client';

import { useEffect, useRef } from 'react';

/**
 * Lightweight scroll-reveal hook using IntersectionObserver.
 * Adds 'revealed' class when element enters viewport.
 * Only triggers once (no re-hide on scroll up).
 */
export function useScrollReveal<T extends HTMLElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
        ...options,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * Observe multiple children inside a container for staggered reveals.
 * Each child with class 'scroll-reveal' (or variant) gets 'revealed' 
 * added with a stagger delay.
 */
export function useScrollRevealChildren(
  selector = '.scroll-reveal',
  staggerMs = 100,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const children = container.querySelectorAll(selector);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const index = Array.from(children).indexOf(el);
            setTimeout(() => {
              el.classList.add('revealed');
            }, index * staggerMs);
            observer.unobserve(el);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -20px 0px',
        ...options,
      }
    );

    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [selector, staggerMs]);

  return ref;
}
