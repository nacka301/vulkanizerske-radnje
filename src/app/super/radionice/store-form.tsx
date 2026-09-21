"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { hr } from "@/messages/hr";
import { checkSlugAvailability, createStoreAction, updateStoreAction } from "../actions";

type StoreFormValues = {
  name: string;
  slug: string;
  address: string;
  phone: string;
  timezone: string;
  bays: number;
  active: boolean;
};

const DEFAULTS: StoreFormValues = {
  name: "",
  slug: "",
  address: "",
  phone: "",
  timezone: "Europe/Zagreb",
  bays: 1,
  active: true,
};

export function StoreForm({
  mode,
  storeId,
  initial,
}: {
  mode: "create" | "edit";
  storeId?: string;
  initial?: StoreFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<StoreFormValues>(initial ?? DEFAULTS);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function run() {
      if (mode !== "create") return;
      if (!values.slug) {
        setSlugStatus("idle");
        return;
      }
      setSlugStatus("checking");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void checkSlugAvailability(values.slug).then((result) => {
          setSlugStatus(result.available ? "available" : "taken");
        });
      }, 400);
    }

    run();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [values.slug, mode]);

  function update<K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (mode === "create") {
      const result = await createStoreAction(values);
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/super/radionice/${result.data.storeId}`);
    } else if (storeId) {
      const result = await updateStoreAction(storeId, values);
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    }
  }

  const slugValid = /^[a-z0-9-]{3,40}$/.test(values.slug);

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{hr.super.form.name}</Label>
          <Input id="name" required value={values.name} onChange={(e) => update("name", e.target.value)} />
        </div>

        {mode === "create" && (
          <div className="space-y-1.5">
            <Label htmlFor="slug">{hr.super.form.slug}</Label>
            <Input
              id="slug"
              required
              value={values.slug}
              onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            />
            <p className="text-xs text-muted-foreground">{hr.super.form.slugHelp}</p>
            {slugStatus === "checking" && <p className="text-xs text-muted-foreground">{hr.super.form.slugChecking}</p>}
            {slugStatus === "available" && slugValid && (
              <p className="text-xs text-green-600">{hr.super.form.slugAvailable}</p>
            )}
            {(slugStatus === "taken" || (values.slug.length > 0 && !slugValid)) && (
              <p className="text-xs text-destructive">{hr.super.form.slugTaken}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="address">{hr.super.form.address}</Label>
          <Input id="address" value={values.address} onChange={(e) => update("address", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">{hr.super.form.phone}</Label>
          <Input id="phone" value={values.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="timezone">{hr.super.form.timezone}</Label>
            <Input id="timezone" value={values.timezone} onChange={(e) => update("timezone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bays">{hr.super.form.bays}</Label>
            <Input
              id="bays"
              type="number"
              min={1}
              value={values.bays}
              onChange={(e) => update("bays", Number(e.target.value))}
            />
          </div>
        </div>

        {mode === "edit" && (
          <div className="flex items-center gap-2">
            <Switch checked={values.active} onCheckedChange={(checked) => update("active", checked)} />
            <Label className="font-normal">{hr.super.form.active}</Label>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting || (mode === "create" && (!slugValid || slugStatus !== "available"))}>
          {submitting ? hr.super.form.submitting : hr.super.form.submit}
        </Button>
      </form>
    </Card>
  );
}
