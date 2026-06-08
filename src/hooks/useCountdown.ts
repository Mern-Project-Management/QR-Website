import { useCallback, useEffect, useState } from "react";

/** Live second-by-second countdown (OTP resend, retry buttons, etc.). */
export function useCountdown(initialSeconds = 0) {
  const [endsAt, setEndsAt] = useState<number | null>(
    initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : null,
  );
  const [remaining, setRemaining] = useState(Math.max(0, Math.floor(initialSeconds)));

  const start = useCallback((seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    if (s <= 0) {
      setEndsAt(null);
      setRemaining(0);
      return;
    }
    setEndsAt(Date.now() + s * 1000);
    setRemaining(s);
  }, []);

  const reset = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
  }, []);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setEndsAt(null);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return { remaining, isActive: remaining > 0, start, reset };
}

export function parseCooldownFromMessage(message: string): number | null {
  const match = message.match(/wait\s+(\d+)\s+seconds?/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatOtpCooldownMessage(remaining: number): string {
  return `Please wait ${remaining} second${remaining === 1 ? "" : "s"} before requesting a new OTP`;
}
