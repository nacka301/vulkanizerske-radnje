"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { BrandMark } from "@/components/brand-mark";
import { hr } from "@/messages/hr";
import { cn } from "@/lib/utils";
import { AdminStoreProvider, type AdminStore } from "./admin-store-context";

export function AdminShell({ store, children }: { store: AdminStore; children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: hr.admin.nav.schedule },
    { href: "/admin/postavke", label: hr.admin.nav.settings },
  ];

  return (
    <AdminStoreProvider store={store}>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-border/60 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandMark className="size-8 shrink-0" iconClassName="size-4.5" />
              <span className="truncate text-lg font-bold">{store.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <nav className="hidden gap-1 sm:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-12 items-center rounded-lg px-4 text-base font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <LogoutButton />
            </div>
          </div>
          <nav className="flex gap-1 border-t border-border/60 px-2 py-1.5 sm:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-4">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </AdminStoreProvider>
  );
}
