"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
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
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold">{hr.common.appName}</span>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-10 items-center rounded-md px-3 text-sm font-medium",
                  pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
