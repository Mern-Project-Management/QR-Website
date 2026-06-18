import confetti from "canvas-confetti";

/** Above site header (z-1000) and mobile nav so confetti is visible over the cart panel. */
const CELEBRATION_Z_INDEX = 10100;

const CELEBRATION_COLORS = ["#1d4ed8", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];

/** Short burst of confetti when the cart unlocks a discount. */
export function fireCartDiscountCelebration(): void {
  if (typeof window === "undefined") return;

  const duration = 2200;
  const end = Date.now() + duration;
  const isMobile = window.matchMedia("(max-width: 639px)").matches;
  const burstOriginY = isMobile ? 0.22 : 0.55;
  const sideOriginY = isMobile ? 0.28 : 0.65;

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: sideOriginY },
      colors: CELEBRATION_COLORS,
      zIndex: CELEBRATION_Z_INDEX,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: sideOriginY },
      colors: CELEBRATION_COLORS,
      zIndex: CELEBRATION_Z_INDEX,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  confetti({
    particleCount: 100,
    spread: 80,
    origin: { y: burstOriginY },
    colors: CELEBRATION_COLORS,
    zIndex: CELEBRATION_Z_INDEX,
  });

  frame();
}
