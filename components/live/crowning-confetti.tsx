import type { CSSProperties } from "react";

/** Gold confetti burst — parent should be `position: relative`. */
export function CrowningConfetti({ count = 18 }: { count?: number }) {
  return (
    <div className="crowning-confetti" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        // Spread evenly across width, then jitter so pieces don’t clump
        const base = ((i + 0.5) / count) * 100;
        const jitter = ((i * 37) % 11) - 5;
        const left = Math.min(96, Math.max(2, base + jitter));
        const dx = ((i * 53) % 57) - 28;
        const dur = 4.2 + (i % 7) * 0.35;
        const delay = (i % 9) * 0.22 + (i % 3) * 0.07;
        const startY = -8 - (i % 6) * 5;
        return (
          <span
            key={i}
            style={
              {
                left: `${left}%`,
                top: `${startY}px`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
                "--dx": `${dx}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
