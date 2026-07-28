'use client';

import { useRef, useEffect } from 'react';

type Props = {
  initialValue: string;
  onConfirm: (instance: string) => void;
  onClose: () => void;
};

export default function FediModal({ initialValue, onConfirm, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const val = inputRef.current?.value.trim();
      if (val) onConfirm(val);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-medium">
          마스토돈/미스키 인스턴스 주소를 입력하세요
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
            placeholder="mastodon.social"
            defaultValue={initialValue}
            onKeyDown={handleKeyDown}
          />
          <button
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
            onClick={() => {
              const val = inputRef.current?.value.trim();
              if (val) onConfirm(val);
            }}
          >
            확인
          </button>
          <button
            className="rounded-lg bg-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            onClick={onClose}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
