"use client";

import { useState } from "react";

type Size = "sm" | "md";

const SIZE: Record<Size, { box: string; face: string; text: string; overlap: string }> = {
  sm: {
    box: "h-9 w-[2.65rem]",
    face: "size-7",
    text: "text-[9px]",
    overlap: "-ml-2.5",
  },
  md: {
    box: "h-11 w-[3.25rem]",
    face: "size-9",
    text: "text-[10px]",
    overlap: "-ml-3",
  },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function Face({
  name,
  src,
  size,
  className,
  ring,
  tone = "accent",
}: {
  name: string;
  src: string | null | undefined;
  size: Size;
  className?: string;
  ring: string;
  tone?: "accent" | "muted";
}) {
  const [failed, setFailed] = useState(false);
  const dim = SIZE[size];
  const showImg = Boolean(src) && !failed;
  const fallback =
    tone === "muted"
      ? "bg-background text-muted"
      : "bg-accent-soft text-accent";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${dim.face} ${ring} ${className ?? ""}`}
      title={name}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          className="size-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={`flex size-full items-center justify-center font-semibold tracking-wide ${fallback} ${dim.text}`}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/** Compact overlapping star + pro portraits (initials fallback). */
export function CoupleAvatar({
  celebrityName,
  proName,
  imageUrl,
  proImageUrl,
  size = "sm",
}: {
  celebrityName: string;
  proName: string;
  imageUrl?: string | null;
  proImageUrl?: string | null;
  size?: Size;
}) {
  const dim = SIZE[size];

  return (
    <span
      className={`relative inline-flex shrink-0 items-center ${dim.box}`}
      aria-hidden
    >
      <Face
        name={proName}
        src={proImageUrl}
        size={size}
        tone="muted"
        ring="ring-2 ring-surface"
        className="z-0 bg-surface"
      />
      <Face
        name={celebrityName}
        src={imageUrl}
        size={size}
        tone="accent"
        ring="ring-2 ring-surface"
        className={`relative z-10 ${dim.overlap} bg-surface`}
      />
    </span>
  );
}
