import { useEffect } from "react";

interface Shortcut {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't fire inside inputs/textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const sc of shortcuts) {
        const metaMatch = sc.meta ? (e.metaKey || e.ctrlKey) : true;
        const ctrlMatch = sc.ctrl ? e.ctrlKey : true;
        const shiftMatch = sc.shift ? e.shiftKey : true;
        const keyMatch = e.key.toLowerCase() === sc.key.toLowerCase();

        if (metaMatch && ctrlMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          sc.handler();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
