import { useState, useRef, useEffect, type ReactNode } from 'react';

export function Modal({ open, onClose, children, className = '' }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div className={`animate-scale-in ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, side, children, width = 'w-[420px]' }: { open: boolean; onClose: () => void; side: 'left' | 'right'; children: ReactNode; width?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        className={`relative ${side === 'right' ? 'mr-auto' : 'ml-auto'} h-full ${width} bg-wa-sidebar dark:bg-wa-sidebarDark shadow-2xl animate-slide-${side} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function Menu({ open, onClose, x, y, children }: { open: boolean; onClose: () => void; x: number; y: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="fixed z-50 bg-wa-sidebar dark:bg-wa-panelDark rounded-lg shadow-xl border border-wa-border dark:border-wa-borderDark py-2 min-w-[180px] animate-scale-in origin-top-left"
    >
      {children}
    </div>
  );
}

export function MenuItem({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-wa-hover dark:hover:bg-wa-hoverDark transition-colors ${danger ? 'text-red-500' : 'text-wa-text dark:text-wa-textDark'}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap z-50 pointer-events-none animate-fade-in">
          {label}
        </span>
      )}
    </span>
  );
}

export function CopyrightFooter({ variant = 'login' }: { variant?: 'login' | 'sidebar' }) {
  return (
    <div className={`text-center text-[11px] leading-relaxed ${variant === 'login' ? 'text-[#8696a0] py-4' : 'text-wa-secondary dark:text-wa-secondaryDark py-2 px-2'} select-none`}>
      حقوق الطبع للمهندس عزالدين الرهمي ورقم الهاتف +967777320031
    </div>
  );
}
