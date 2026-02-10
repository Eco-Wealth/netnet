"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui";

type ShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const NAV = [
  { href: "/proof", label: "Proof" },
  { href: "/retire", label: "Retire" },
  { href: "/execute", label: "Execute" },
  { href: "/identity", label: "Identity" },
  { href: "/governance", label: "Governance" },
];

export default function Shell({ title, subtitle, children }: ShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-semibold">{title}</div>
            {subtitle ? <div className="mt-1 text-sm opacity-75">{subtitle}</div> : null}
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "rounded-full border px-3 py-1 text-sm transition",
                    active ? "border-black" : "opacity-75 hover:opacity-100",
                  ].join(" ")}
                  title={item.label}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mt-6">
          <Card>{children}</Card>
        </main>
      </div>
    </div>
  );
}
