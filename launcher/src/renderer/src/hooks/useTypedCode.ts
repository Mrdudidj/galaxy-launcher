import { useEffect, useRef } from "react";

// Konami-code-style: buffers recent keystrokes anywhere in the app and fires
// once the buffer ends with `code` (case-insensitive). Ignores keydowns that
// originate from a text input/textarea so typing the phrase into a normal
// form field (chat, a report's text box, …) doesn't accidentally trigger it.
export function useTypedCode(code: string, onMatch: () => void): void {
  const bufferRef = useRef("");
  const normalized = code.toLowerCase();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key.length !== 1) return;

      bufferRef.current = (bufferRef.current + e.key).slice(-normalized.length).toLowerCase();
      if (bufferRef.current === normalized) {
        bufferRef.current = "";
        onMatch();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [normalized, onMatch]);
}
