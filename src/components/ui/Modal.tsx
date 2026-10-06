import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: ReactNode;
  wide?: boolean;
  hideClose?: boolean;
}

export function Modal({ open, onClose, title, sub, children, wide, hideClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-[2px]"
        onClick={hideClose ? undefined : onClose}
      />
      <div
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-lift animate-fade-in sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            {sub ? <p className="mt-0.5 text-sm text-ink-500">{sub}</p> : null}
          </div>
          {!hideClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
