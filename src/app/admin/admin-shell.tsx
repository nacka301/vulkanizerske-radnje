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
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <BrandMark className="size-8" iconClassName="size-4.5" />
              <span className="text-lg font-bold">{store.name}</span>
            </div>
            <nav className="flex gap-1">
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
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 p-4">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </AdminStoreProvider>
  );
}
