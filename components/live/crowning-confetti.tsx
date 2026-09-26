import type { CSSProperties } from "react";

/** Gold confetti burst — parent should be `position: relative` with overflow clipped. */
export function CrowningConfetti({ count = 22 }: { count?: number }) {
  return (
    <div className="crowning-confetti" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={
            {
              left: `${4 + ((i * 17) % 92)}%`,
              animationDelay: `${(i % 10) * 0.12}s`,
              "--dx": `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 7) * 4)}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
