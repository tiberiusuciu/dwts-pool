export function LivePulse() {
  return (
    <span className="live-pulse" aria-hidden>
      <span className="live-pulse-ring" />
      <span className="live-pulse-ring live-pulse-ring-delay" />
      <span className="live-pulse-dot" />
    </span>
  );
}
