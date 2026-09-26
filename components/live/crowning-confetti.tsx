import type { CSSProperties } from "react";

/** Gold confetti burst — parent should be `position: relative`. */
export function CrowningConfetti({ count = 22 }: { count?: number }) {
  return (
    <div className="crowning-confetti" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={
            {
              left: `${3 + ((i * 19) % 94)}%`,
              top: `${-4 + (i % 5) * 3}px`,
              animationDelay: `${(i % 12) * 0.08}s`,
              "--dx": `${(i % 2 === 0 ? 1 : -1) * (6 + (i % 8) * 3)}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
