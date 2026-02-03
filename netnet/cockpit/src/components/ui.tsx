"use client";

import React from "react";

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-900 bg-neutral-950/60 shadow-sm">
      {title ? (
        <div className="px-4 py-3 border-b border-neutral-900 font-medium">{title}</div>
      ) : null}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={[
        "rounded-xl px-4 py-2 text-sm font-medium",
        "bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        "w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm",
        "placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-700",
        className,
      ].join(" ")}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={[
        "w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-neutral-700",
        className,
      ].join(" ")}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={[
        "w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm",
        "placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-700",
        className,
      ].join(" ")}
    />
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-neutral-400">{children}</div>;
}
