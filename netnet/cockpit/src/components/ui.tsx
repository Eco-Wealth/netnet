import * as React from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm",
        "backdrop-blur-sm",
        className
      )}
    >
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
  return <div className={cx("px-4 pb-4 md:px-5 md:pb-5", className)}>{children}</div>;
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
  return <div className={cx("text-sm text-white/60", className)}>{children}</div>;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost" | "subtle" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "solid",
  size = "md",
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === "ghost"
      ? "bg-transparent text-white border border-white/15 hover:bg-white/10"
      : variant === "subtle"
      ? "bg-white/10 text-white hover:bg-white/15 border border-white/10"
      : variant === "danger"
      ? "bg-red-500/90 text-white hover:bg-red-500 border border-red-400/40"
      : "bg-white text-black hover:bg-neutral-200 border border-white/10";

  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-xs"
      : size === "lg"
      ? "px-5 py-3 text-sm"
      : "px-4 py-2 text-sm";

  return (
    <button
      {...rest}
      className={cx(
        "rounded-xl font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
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
        "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white",
        "placeholder:text-white/35",
        "focus:outline-none focus:ring-2 focus:ring-white/15",
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
        "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white",
        "placeholder:text-white/35",
        "focus:outline-none focus:ring-2 focus:ring-white/15",
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
