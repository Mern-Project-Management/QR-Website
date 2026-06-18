import confetti from "canvas-confetti";

/** Short burst of confetti when the cart unlocks a discount. */
export function fireCartDiscountCelebration(): void {
  if (typeof window === "undefined") return;

  const duration = 2200;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: ["#1d4ed8", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"],
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: ["#1d4ed8", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  confetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.55 },
    colors: ["#1d4ed8", "#22c55e", "#fbbf24", "#a855f7", "#ec4899"],
  });

  frame();
}
