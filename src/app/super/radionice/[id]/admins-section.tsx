"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hr } from "@/messages/hr";
import { createStoreAdminAction, listStoreAdminsAction, type StoreAdminSummary } from "../../actions";

export function AdminsSection({ storeId }: { storeId: string }) {
  const [admins, setAdmins] = useState<StoreAdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await listStoreAdminsAction(storeId);
      if (cancelled) return;
      if (result.ok) setAdmins(result.data);
      setLoading(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setTempPassword(null);

    const result = await createStoreAdminAction(storeId, email);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTempPassword(result.data.tempPassword);
    setEmail("");
    const refreshed = await listStoreAdminsAction(storeId);
    if (refreshed.ok) setAdmins(refreshed.data);
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{hr.super.admins.title}</h2>

      {!loading && (
        <div className="mt-3 space-y-1">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">{hr.super.admins.empty}</p>
          ) : (
            admins.map((admin) => (
              <div key={admin.id} className="text-sm">
                {admin.email}
              </div>
            ))
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-admin-email">{hr.super.admins.email}</Label>
          <Input
            id="new-admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-64"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? hr.super.admins.adding : hr.super.admins.add}
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {tempPassword && (
        <div className="mt-3 rounded-md border bg-muted p-3 text-sm">
          {hr.super.admins.tempPasswordNotice}
          <div className="mt-1 font-mono text-base font-bold">{tempPassword}</div>
        </div>
      )}
    </Card>
  );
}
