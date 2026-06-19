"use client";

import { useRef, useState } from "react";

type Props = {
  onClick: () => void;
  tooltip: string;
  className: string;
  children: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

export default function TooltipButton({ onClick, tooltip, className, children, ariaLabel, disabled }: Props) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTouchEnd = useRef(0);

  return (
    <div className="relative inline-flex">
      <button
        onClick={onClick}
        disabled={disabled}
        onTouchStart={() => { if (!disabled) timer.current = setTimeout(() => setShow(true), 500); }}
        onTouchEnd={() => { clearTimeout(timer.current); setShow(false); lastTouchEnd.current = Date.now(); }}
        onTouchMove={() => { clearTimeout(timer.current); setShow(false); }}
        onMouseEnter={() => { if (!disabled && Date.now() - lastTouchEnd.current > 300) setShow(true); }}
        onMouseLeave={() => setShow(false)}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </button>
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 shadow-lg dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {tooltip}
        </div>
      )}
    </div>
  );
}
