import * as React from "react";
import type { InsightSpec } from "@/lib/insight";
import { insightTitle } from "@/lib/insight";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  title,
  subtitle,
  children,
}: {
  className?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-[14px] border border-white/15 bg-white/[0.03]",
        "backdrop-blur-sm shadow-[0_8px_22px_rgba(2,6,23,0.28)]",
        className
      )}
    >
      {title ? (
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold text-white">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/65">{subtitle}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cx("p-4 md:p-5", className)}>{children}</div>;
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cx("px-4 pb-4", className)}>{children}</div>;
}

export function Label({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("text-xs font-medium tracking-wide text-white/70", className)}>
      {children}
    </div>
  );
}

export function Muted({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cx("text-sm text-white/65", className)}>{children}</div>;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost" | "subtle" | "danger";
  size?: "sm" | "md" | "lg";
  insight?: InsightSpec;
};

export function Button({
  className,
  variant = "solid",
  size = "md",
  insight,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === "ghost"
      ? "bg-transparent text-white border border-white/15 hover:bg-white/[0.08] active:bg-white/[0.11]"
      : variant === "subtle"
      ? "bg-white/[0.07] text-white hover:bg-white/[0.11] active:bg-white/[0.14] border border-white/14"
      : variant === "danger"
      ? "bg-red-500/90 text-white hover:bg-red-500 active:bg-red-600 border border-red-400/40"
      : "bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 border border-white/20";

  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-xs"
      : size === "lg"
      ? "px-5 py-2.5 text-sm"
      : "px-4 py-2 text-sm";

  const title = rest.title || (insight ? insightTitle(insight) : undefined);

  return (
    <button
      {...rest}
      title={title}
      aria-label={rest["aria-label"] || title}
      className={cx(
        "rounded-[11px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
        "focus:outline-none focus:ring-2 focus:ring-white/20",
        variantClass,
        sizeClass,
        className
      )}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cx(
        "w-full rounded-[11px] border border-white/14 bg-white/[0.05] px-3 py-2 text-sm text-white",
        "placeholder:text-white/40",
        "focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-sky-300/35",
        className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={cx(
        "w-full rounded-[11px] border border-white/14 bg-white/[0.05] px-3 py-2 text-sm text-white",
        "placeholder:text-white/40",
        "focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-sky-300/35",
        className
      )}
    />
  );
}

// Backward-compatible alias retained for pages importing the old component name.
export const TextArea = Textarea;

export function Code(props: React.HTMLAttributes<HTMLElement>) {
  const { className, ...rest } = props;
  return (
    <pre
      {...rest}
      className={cx(
        "max-h-[420px] overflow-auto rounded-[11px] border border-white/14 bg-black/30 p-3 text-xs text-white/90",
        "font-mono whitespace-pre-wrap break-words",
        className
      )}
    />
  );
}

/** Used by GovernancePolicyEditor */
export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white/80">
      {children}
    </span>
  );
}

/** Used by GovernancePolicyEditor */
export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-sm font-semibold text-white">{title}</div>
      {subtitle ? <div className="text-xs text-white/60">{subtitle}</div> : null}
    </div>
  );
}

/** Used by GovernancePolicyEditor */
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
      <span className="text-white/80">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-white"
      />
    </label>
  );
}
