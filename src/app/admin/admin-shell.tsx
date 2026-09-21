"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
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
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold">{store.name}</span>
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-12 items-center rounded-md px-4 text-base font-medium",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
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
        <main className="flex-1 p-4">{children}</main>
      </div>
    </AdminStoreProvider>
  );
}
