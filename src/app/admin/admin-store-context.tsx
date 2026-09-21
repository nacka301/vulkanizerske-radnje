"use client";

import { createContext, useContext } from "react";

export type AdminStore = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

const AdminStoreContext = createContext<AdminStore | null>(null);

export function AdminStoreProvider({ store, children }: { store: AdminStore; children: React.ReactNode }) {
  return <AdminStoreContext.Provider value={store}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore(): AdminStore {
  const store = useContext(AdminStoreContext);
  if (!store) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return store;
}
