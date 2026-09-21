"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { BrandMark } from "@/components/brand-mark";
import { hr } from "@/messages/hr";
import { cn } from "@/lib/utils";

export function SuperShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/super", label: hr.super.nav.stores },
    { href: "/super/statistika", label: hr.super.nav.stats },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-8" iconClassName="size-4.5" />
            <span className="text-lg font-bold">{hr.common.appName}</span>
          </div>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="flex-1 p-6">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
