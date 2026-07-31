import { useEffect, useState } from 'react';

/** Subscribe to a CSS media query from React. SSR-safe and resize-safe. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** true below the `md` Tailwind breakpoint (phones + small tablets in portrait) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** true on devices without a precise hover-capable pointer (touch screens) */
export function useIsTouch(): boolean {
  return !useMediaQuery('(hover: hover) and (pointer: fine)');
}

/** true when the viewport is very short (landscape phones, split screens) */
export function useIsShort(): boolean {
  return useMediaQuery('(max-height: 520px)');
}
