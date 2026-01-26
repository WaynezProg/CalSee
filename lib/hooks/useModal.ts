'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseModalOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  trapFocus?: boolean;
}

/**
 * Hook for managing modal accessibility and behavior.
 * Handles:
 * - Escape key to close
 * - Focus trapping within modal
 * - Body scroll lock
 * - Click outside to close
 */
export function useModal({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  trapFocus = true,
}: UseModalOptions) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (!isOpen || !trapFocus) return;

    // Store current active element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal or first focusable element
    const modal = modalRef.current;
    if (modal) {
      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        modal.focus();
      }
    }

    // Restore focus when modal closes
    return () => {
      previousActiveElement.current?.focus();
    };
  }, [isOpen, trapFocus]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !trapFocus) return;

    const modal = modalRef.current;
    if (!modal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, trapFocus]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  return {
    modalRef,
    handleOverlayClick,
  };
}
