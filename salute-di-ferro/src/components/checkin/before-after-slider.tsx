"use client";

import * as React from "react";

type Props = {
  before: string | null;
  after: string | null;
  label: string;
};

export function BeforeAfterSlider({ before, after, label }: Props) {
  const [pos, setPos] = React.useState(50);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </p>
      <div className="border-border bg-muted relative aspect-[3/4] overflow-hidden rounded-md border">
        {before && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={before}
            alt="Prima"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {after && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={after}
            alt="Dopo"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-lg"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        />
        <div
          className="bg-primary text-primary-foreground pointer-events-none absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold shadow-lg"
          style={{ left: `${pos}%` }}
        >
          ⟷
        </div>
        <div className="text-muted-foreground absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px]">
          Prima
        </div>
        <div className="text-muted-foreground absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px]">
          Dopo
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="accent-primary h-2 w-full"
      />
    </div>
  );
}
