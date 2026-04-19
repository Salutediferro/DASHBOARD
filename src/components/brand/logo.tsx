import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "mark" | "full";

export type LogoProps = {
  size?: LogoSize;
  variant?: LogoVariant;
  /** Override the default text lockup with a raster/SVG asset in /public. */
  src?: string;
  className?: string;
};

const fullPixelSize: Record<LogoSize, { h: number; text: string }> = {
  sm: { h: 20, text: "text-xs" },
  md: { h: 28, text: "text-sm" },
  lg: { h: 40, text: "text-lg" },
};

const markPixelSize: Record<LogoSize, { box: number; text: string }> = {
  sm: { box: 28, text: "text-xs" },
  md: { box: 36, text: "text-sm" },
  lg: { box: 48, text: "text-base" },
};

export default function Logo({
  size = "md",
  variant = "full",
  src,
  className,
}: LogoProps) {
  if (src) {
    const displayHeight =
      variant === "mark" ? markPixelSize[size].box : fullPixelSize[size].h;
    return (
      // Plain <img>: preserves intrinsic aspect ratio without next/image
      // constraints (asset is tiny and static-served by the CDN).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Salute di Ferro"
        style={{ height: displayHeight, width: "auto" }}
        className={cn("select-none", className)}
      />
    );
  }

  if (variant === "mark") {
    const s = markPixelSize[size];
    return (
      <span
        aria-label="Salute di Ferro"
        className={cn(
          "inline-flex items-center justify-center rounded-md font-heading font-bold leading-none tracking-tight",
          "bg-[linear-gradient(135deg,#e8e8e8_0%,#c0c0c0_40%,#8a8a8a_100%)] text-[#0a0a0a]",
          "ring-1 ring-inset ring-black/20",
          s.text,
          className,
        )}
        style={{ width: s.box, height: s.box }}
      >
        <span className="inline-flex items-baseline">
          S<span className="text-primary-500">d</span>F
        </span>
      </span>
    );
  }

  const f = fullPixelSize[size];
  return (
    <span
      aria-label="Salute di Ferro"
      className={cn(
        "inline-flex items-baseline gap-[0.4em] font-heading font-extrabold uppercase",
        "tracking-[0.14em] leading-none whitespace-nowrap",
        f.text,
        className,
      )}
    >
      <span className="text-accent-500">SALUTE</span>
      <span className="text-primary-500">DI FERRO</span>
    </span>
  );
}
