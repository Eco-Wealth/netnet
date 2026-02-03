"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type Tab = { href: string; label: string };

const tabs: Tab[] = [
  { href: "/proof", label: "Proof" },
  { href: "/execute", label: "Execute" },
  { href: "/retire", label: "Retire" },
];

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-xl no-underline text-sm",
        active ? "bg-neutral-800 text-white" : "text-neutral-300 hover:bg-neutral-900",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const active = (href: string) => pathname === href;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="hidden sm:flex items-center justify-between px-4 py-3 border-b border-neutral-900">
        <div className="font-semibold">netnet cockpit</div>
        <nav className="flex gap-2">
          {tabs.map((t) => (
            <TabLink key={t.href} href={t.href} label={t.label} active={active(t.href)} />
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-6 sm:py-10 max-w-3xl w-full mx-auto">
        {children}
      </main>

      <nav className="sm:hidden sticky bottom-0 bg-neutral-950 border-t border-neutral-900 px-2 py-2">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((t) => (
            <TabLink key={t.href} href={t.href} label={t.label} active={active(t.href)} />
          ))}
        </div>
      </nav>
    </div>
  );
}
