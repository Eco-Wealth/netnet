import * as React from "react";
import { defaultPrimaryInsightTitle, toInsightTitle } from "@/lib/insight";
import type { InsightFields } from "@/lib/insight";
import { Insight } from "@/components/Insight";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cx("nn-page", className)}>{children}</main>;
}

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("nn-page-header", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="nn-page-title">{title}</h1>
          {subtitle ? <div className="nn-page-subtitle mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
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
  insight?: InsightFields;
};

export function Button({ variant = "solid", size = "md", className, insight, title, ...rest }: ButtonProps) {
  const derivedTitle = insight
    ? toInsightTitle(insight)
    : variant === "solid"
    ? defaultPrimaryInsightTitle()
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
export function Input({ size = "md", className, type, ...rest }: InputProps) {
  const isChoice = type === "checkbox" || type === "radio";
  return (
    <input
      type={type}
      {...rest}
      className={cx(
        isChoice
          ? "h-4 w-4 accent-[hsl(var(--accent))]"
          : "nn-input nn-focus w-full text-[14px]",
        !isChoice && size === "sm" && "nn-input--sm text-[13px]",
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
        "nn-focus w-full rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-[14px] leading-snug",
        className
      )}
    />
  );
}

// Back-compat alias for existing imports.
export const Textarea = TextArea;

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx("text-[12px] font-semibold tracking-wide text-[color:var(--muted)]", className)}>
      {children}
    </label>
  );
}

export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code
      className={cx(
        "rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface-2)] px-1.5 py-0.5 font-mono text-[12px]",
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
      : "border-[color:var(--border)] text-[color:var(--muted)]";

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
    <label className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
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

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("grid gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {hint ? <span className="text-[11px] text-[color:var(--muted)]">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function ActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("nn-action-row", className)}>{children}</div>;
}

/** Hover insight wrapper (basic; Unit H will upgrade) */
export function HoverInfo({
  label,
  what,
  when,
  requires,
  output,
}: {
  label: React.ReactNode;
  what: string;
  when?: string;
  requires?: string;
  output?: string;
}) {
  return (
    <Insight insight={{ what, when, requires, output }}>
      <span>{label}</span>
    </Insight>
  );
}
