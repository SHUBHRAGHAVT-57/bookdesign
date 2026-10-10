import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  labelledBy: string;
  describedBy?: string;
  onClose?: () => void;
  children: ReactNode;
}

/** Accessible dialog: focus moves in, Tab is trapped, Escape closes (if allowed), focus is restored. */
export default function Modal({ labelledBy, describedBy, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el)?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && onClose) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
