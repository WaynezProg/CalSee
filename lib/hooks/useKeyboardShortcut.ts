'use client';

import { useEffect, useCallback } from 'react';

type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';

interface ShortcutOptions {
  key: string;
  modifiers?: KeyModifier[];
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for handling keyboard shortcuts.
 *
 * @example
 * // Simple shortcut
 * useKeyboardShortcut({ key: 'Escape' }, () => closeModal());
 *
 * // With modifiers
 * useKeyboardShortcut({ key: 's', modifiers: ['ctrl'] }, () => save());
 *
 * // Conditionally enabled
 * useKeyboardShortcut({ key: 'Enter', enabled: isFormValid }, () => submit());
 */
export function useKeyboardShortcut(
  options: ShortcutOptions,
  callback: () => void
) {
  const { key, modifiers = [], enabled = true, preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Check if key matches (case-insensitive)
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      // Check modifiers
      const ctrlRequired = modifiers.includes('ctrl');
      const altRequired = modifiers.includes('alt');
      const shiftRequired = modifiers.includes('shift');
      const metaRequired = modifiers.includes('meta');

      const ctrlPressed = e.ctrlKey || e.metaKey; // Support Cmd on Mac
      const altPressed = e.altKey;
      const shiftPressed = e.shiftKey;
      const metaPressed = e.metaKey;

      if (ctrlRequired !== ctrlPressed) return;
      if (altRequired !== altPressed) return;
      if (shiftRequired !== shiftPressed) return;
      if (metaRequired !== metaPressed) return;

      // Don't trigger if user is typing in an input
      const activeElement = document.activeElement;
      const isTyping =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true';

      // Allow escape even when typing
      if (isTyping && key.toLowerCase() !== 'escape') return;

      if (preventDefault) {
        e.preventDefault();
      }

      callback();
    },
    [key, modifiers, enabled, preventDefault, callback]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Hook for registering multiple keyboard shortcuts at once.
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{ options: ShortcutOptions; callback: () => void }>
) {
  useEffect(() => {
    const handlers = shortcuts.map(({ options, callback }) => {
      const { key, modifiers = [], enabled = true, preventDefault = true } = options;

      const handler = (e: KeyboardEvent) => {
        if (!enabled) return;
        if (e.key.toLowerCase() !== key.toLowerCase()) return;

        const ctrlRequired = modifiers.includes('ctrl');
        const altRequired = modifiers.includes('alt');
        const shiftRequired = modifiers.includes('shift');
        const metaRequired = modifiers.includes('meta');

        const ctrlPressed = e.ctrlKey || e.metaKey;
        const altPressed = e.altKey;
        const shiftPressed = e.shiftKey;
        const metaPressed = e.metaKey;

        if (ctrlRequired !== ctrlPressed) return;
        if (altRequired !== altPressed) return;
        if (shiftRequired !== shiftPressed) return;
        if (metaRequired !== metaPressed) return;

        const activeElement = document.activeElement;
        const isTyping =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement?.getAttribute('contenteditable') === 'true';

        if (isTyping && key.toLowerCase() !== 'escape') return;

        if (preventDefault) e.preventDefault();
        callback();
      };

      document.addEventListener('keydown', handler);
      return handler;
    });

    return () => {
      handlers.forEach((handler) => {
        document.removeEventListener('keydown', handler);
      });
    };
  }, [shortcuts]);
}
