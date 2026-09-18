import { useState, useEffect } from 'react';

const BREAKPOINT = 768;

export function useResponsive() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth > BREAKPOINT);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT + 1}px)`);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { isDesktop, isMobile: !isDesktop };
}
