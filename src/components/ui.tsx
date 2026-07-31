import {
  useState, useRef, useEffect, useLayoutEffect, type ReactNode,
} from 'react';
import { cn } from '@/utils';
import { useIsMobile, useIsTouch } from '@/hooks/useMediaQuery';

// ─── Escape-to-close helper ──────────────────────────────────────────────────
function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onClose]);
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  children,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn('w-full max-w-md animate-scale-in', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────────
/**
 * Full-screen sheet on phones, side panel from `md` upwards.
 * `side` is a physical side so it stays predictable inside the RTL shell.
 */
export function Drawer({
  open,
  onClose,
  side,
  children,
  width = 'md:w-[380px] lg:w-[420px]',
}: {
  open: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  children: ReactNode;
  width?: string;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className={cn(
          'absolute top-0 bottom-0 flex w-full max-w-full flex-col overflow-hidden bg-wa-sidebar dark:bg-wa-sidebarDark shadow-2xl',
          width,
          side === 'right' ? 'right-0 animate-slide-right' : 'left-0 animate-slide-left',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Menu (viewport-aware dropdown) ──────────────────────────────────────────
/**
 * Anchored dropdown that clamps itself inside the viewport, so it can never
 * open off-screen on a phone. Turns into a bottom sheet under `md`.
 */
export function Menu({
  open,
  onClose,
  x,
  y,
  children,
}: {
  open: boolean;
  onClose: () => void;
  x: number;
  y: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [pos, setPos] = useState({ left: x, top: y });

  useEscape(open, onClose);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const id = window.setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  // Clamp inside the viewport once we know the real size
  useLayoutEffect(() => {
    if (!open || isMobile || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pad = 8;
    setPos({
      left: Math.max(pad, Math.min(x, window.innerWidth - rect.width - pad)),
      top: Math.max(pad, Math.min(y, window.innerHeight - rect.height - pad)),
    });
  }, [open, isMobile, x, y]);

  if (!open) return null;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 animate-fade-in" />
        <div
          ref={ref}
          className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto scrollbar-thin scroll-touch rounded-t-2xl border-t border-wa-border dark:border-wa-borderDark bg-wa-sidebar dark:bg-wa-panelDark pb-safe shadow-2xl animate-sheet-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto my-2 h-1 w-10 rounded-full bg-wa-secondary/40" />
          <div className="py-1">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 max-h-[80dvh] min-w-[200px] overflow-y-auto scrollbar-thin rounded-lg border border-wa-border dark:border-wa-borderDark bg-wa-sidebar dark:bg-wa-panelDark py-2 shadow-xl animate-scale-in"
    >
      {children}
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-start text-sm transition-colors md:py-2.5',
        'hover:bg-wa-hover dark:hover:bg-wa-hoverDark active:bg-wa-active dark:active:bg-wa-activeDark',
        danger ? 'text-red-500' : 'text-wa-text dark:text-wa-textDark',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Tooltip (hover-capable pointers only) ───────────────────────────────────
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const isTouch = useIsTouch();

  if (isTouch) return <>{children}</>;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white animate-fade-in">
          {label}
        </span>
      )}
    </span>
  );
}

export function CopyrightFooter({ variant = 'login' }: { variant?: 'login' | 'sidebar' }) {
  return (
    <div
      className={cn(
        'select-none text-balance px-2 text-center text-[10px] leading-relaxed sm:text-[11px]',
        variant === 'login'
          ? 'py-4 text-[#8696a0]'
          : 'shrink-0 py-2 pb-safe text-wa-secondary dark:text-wa-secondaryDark',
      )}
    >
      حقوق الطبع للمهندس عزالدين الرهمي ورقم الهاتف +967777320031
    </div>
  );
}
