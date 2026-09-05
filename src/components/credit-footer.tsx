'use client';

import { Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const GYEON_URL = 'https://github.com/rycont/gyeon';

function CreditText() {
  return (
    <>
      헤아리는{' '}
      <a
        href={GYEON_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600 dark:decoration-zinc-600 dark:hover:text-zinc-300"
      >
        견주기
      </a>
      의 아이디어를 차용하였으며 원작자의 허가를 받았습니다.
    </>
  );
}

export default function CreditFooter() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open ]);

  return (
    <footer className="mt-auto pt-8 pb-2">
      <p className="hidden text-center text-xs text-zinc-400 md:block dark:text-zinc-500">
        <CreditText />
      </p>

      <div ref={wrapRef} className="relative flex justify-center md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="출처 정보"
          aria-expanded={open}
          aria-controls="credit-note"
          className="flex h-11 w-11 items-center justify-center text-base text-zinc-500 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
        {open && (
          <div
            id="credit-note"
            role="note"
            className="absolute bottom-full mb-2 w-64 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-center text-xs leading-relaxed text-zinc-500 shadow-lg dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            <CreditText />
          </div>
        )}
      </div>
    </footer>
  );
}
