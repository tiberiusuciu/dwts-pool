import type { CSSProperties } from "react";

/** Gold confetti burst — parent should be `position: relative`. */
export function CrowningConfetti({ count = 18 }: { count?: number }) {
  return (
    <div className="crowning-confetti" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const base = ((i + 0.5) / count) * 100;
        const jitter = ((i * 37) % 11) - 5;
        const left = Math.min(96, Math.max(2, base + jitter));
        const dx = ((i * 53) % 57) - 28;
        const dur = 2.4 + (i % 5) * 0.25;
        // Tiny stagger only — pieces should start dropping immediately
        const delay = (i % 6) * 0.03;
        const startY = -6 - (i % 4) * 3;
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
