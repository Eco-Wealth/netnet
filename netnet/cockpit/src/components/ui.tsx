import * as React from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("nn-panel", "p-[var(--pad-2)]", className)}>
      {(title || subtitle || right) ? (
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <div className="text-[15px] font-semibold leading-tight">{title}</div> : null}
            {subtitle ? <div className="nn-muted mt-1 text-[13px] leading-snug">{subtitle}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </header>
      ) : null}
      <div className={cx(title || subtitle || right ? "mt-[var(--gap-2)]" : "", "grid gap-[var(--gap-2)]")}>
        {children}
      </div>
    </section>
  );
}

export function Row({
  left,
  right,
  children,
  className,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  if (children) {
    return <div className={cx("flex items-center justify-between gap-3", className)}>{children}</div>;
  }
  return (
    <div className={cx("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">{left}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost";
  size?: "sm" | "md";
  insight?: {
    what: string;
    when?: string;
    costs?: string;
    requires?: string;
    output?: string;
  };
};

export function Button({ variant = "solid", size = "md", className, insight, title, ...rest }: ButtonProps) {
  const derivedTitle =
    insight
      ? [
          `What: ${insight.what}`,
          insight.when ? `When: ${insight.when}` : null,
          insight.costs ? `Costs: ${insight.costs}` : null,
          insight.requires ? `Requires: ${insight.requires}` : null,
          insight.output ? `Output: ${insight.output}` : null,
        ]
          .filter(Boolean)
          .join(" | ")
      : variant === "solid"
      ? "What: Primary action | When: Use after reviewing context | Costs: May consume API/compute resources | Requires: Policy and operator approval if spend-adjacent | Output: Action result and/or proof artifact"
      : undefined;

  return (
    <button
      {...rest}
      title={typeof title === "string" ? title : derivedTitle}
      className={cx(
        "nn-btn",
        size === "sm" && "nn-btn--sm",
        variant === "solid" ? "nn-btn--solid" : "nn-btn--ghost",
        "nn-focus disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: "sm" | "md";
};
export function Input({ size = "md", className, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      className={cx(
        "nn-input nn-focus w-full text-[14px]",
        size === "sm" && "nn-input--sm text-[13px]",
        className
      )}
    />
  );
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export function TextArea({ className, ...rest }: TextAreaProps) {
  return (
    <textarea
      {...rest}
      className={cx(
        "nn-focus w-full rounded-[var(--r-md)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] p-3 text-[14px] leading-snug",
        className
      )}
    />
  );
}

// Back-compat alias for existing imports.
export const Textarea = TextArea;

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx("text-[12px] font-semibold tracking-wide text-[hsl(var(--muted))]", className)}>
      {children}
    </label>
  );
}

export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code
      className={cx(
        "rounded-[8px] border border-[hsl(var(--border))] bg-[hsl(var(--panel2))] px-1.5 py-0.5 font-mono text-[12px]",
        className
      )}
    >
      {children}
    </code>
  );
}

export function StatusChip({
  children,
  tone: toneVariant,
  status,
  className,
}: {
  children?: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
  status?: string;
  className?: string;
}) {
  const text = children ?? status ?? "";
  const normalized = String(status ?? children ?? "").toUpperCase();
  const toneClass =
    toneVariant === "success" || normalized === "DONE" || normalized === "PASS"
      ? "border-emerald-500/40 text-emerald-300"
      : toneVariant === "danger" || normalized === "BLOCKED" || normalized === "ERROR" || normalized === "FAILED"
      ? "border-rose-500/40 text-rose-300"
      : toneVariant === "warn" || normalized === "IN_PROGRESS" || normalized === "RUNNING"
      ? "border-amber-500/40 text-amber-300"
      : "border-[hsl(var(--border))] text-[hsl(var(--muted))]";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", toneClass, className)}>
      {text}
    </span>
  );
}

export function Muted({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("nn-muted text-[13px]", className)}>{children}</div>;
}

export function Pill({ children }: { children: React.ReactNode }) {
  return <span className="nn-chip">{children}</span>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="grid gap-1">
      <div className="text-[15px] font-semibold leading-tight">{title}</div>
      {subtitle ? <div className="nn-muted text-[13px] leading-snug">{subtitle}</div> : null}
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[hsl(var(--border))] bg-[hsl(var(--panel))] px-3 py-2">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold leading-tight">{label}</div>
        {hint ? <div className="nn-muted mt-1 text-[12px] leading-snug">{hint}</div> : null}
      </div>
      <input
        className="h-4 w-4 accent-[hsl(var(--accent))]"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

/** Hover insight wrapper (basic; Unit H will upgrade) */
export function HoverInfo({
  label,
  what,
  impact,
  requires,
  output,
}: {
  label: React.ReactNode;
  what: string;
  impact?: string;
  requires?: string;
  output?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <span
      className="nn-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {label}
      {open ? (
        <span role="tooltip" className="nn-tip__bubble">
          <div className="font-semibold">What</div>
          <div className="nn-muted mt-0.5">{what}</div>
          {impact ? (
            <>
              <div className="mt-2 font-semibold">Impact</div>
              <div className="nn-muted mt-0.5">{impact}</div>
            </>
          ) : null}
          {requires ? (
            <>
              <div className="mt-2 font-semibold">Requires</div>
              <div className="nn-muted mt-0.5">{requires}</div>
            </>
          ) : null}
          {output ? (
            <>
              <div className="mt-2 font-semibold">Output</div>
              <div className="nn-muted mt-0.5">{output}</div>
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
