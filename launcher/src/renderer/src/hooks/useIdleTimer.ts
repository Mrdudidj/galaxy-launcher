import { useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"] as const;

// Tracks real user input inside the renderer (not whatever's happening in a
// separately-launched Minecraft window) — idling only ever means "nobody's
// touched the launcher itself for a while", so this never fires mid-game just
// because the launcher window sits unfocused in the background.
export function useIdleTimer(idleMs: number, enabled: boolean): boolean {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsIdle(false);
      return;
    }

    function reset(): void {
      setIsIdle(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsIdle(true), idleMs);
    }

    reset();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset));
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [idleMs, enabled]);

  return isIdle;
}
