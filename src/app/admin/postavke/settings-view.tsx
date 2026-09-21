"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { hr } from "@/messages/hr";
import {
  updateHoursAction,
  updateBaysAction,
  updateServiceAction,
  addBlockAction,
  deleteBlockAction,
  type HourInput,
} from "./actions";

const WEEKDAY_LABELS = [
  hr.admin.settings.weekday1,
  hr.admin.settings.weekday2,
  hr.admin.settings.weekday3,
  hr.admin.settings.weekday4,
  hr.admin.settings.weekday5,
  hr.admin.settings.weekday6,
  hr.admin.settings.weekday7,
];

type HourRow = { weekday: number; open_time: string; close_time: string; is_closed: boolean };
type BlockRow = { id: string; starts_at: string; ends_at: string; reason: string | null };
type ServiceRow = { id: string; name: string; slots: number; enabled: boolean };

export function SettingsView({
  bays,
  hours,
  blocks,
  services,
}: {
  bays: number;
  hours: HourRow[];
  blocks: BlockRow[];
  services: ServiceRow[];
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{hr.admin.settings.title}</h1>
      <BaysCard initialBays={bays} />
      <HoursCard initialHours={hours} />
      <ServicesCard initialServices={services} />
      <BlocksCard initialBlocks={blocks} />
    </div>
  );
}

function SaveStatus({ status }: { status: "idle" | "saved" | "error" }) {
  if (status === "saved") return <span className="text-sm text-green-600">{hr.admin.settings.saved}</span>;
  if (status === "error") return <span className="text-sm text-destructive">{hr.admin.settings.saveError}</span>;
  return null;
}

function BaysCard({ initialBays }: { initialBays: number }) {
  const [bays, setBays] = useState(initialBays);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateBaysAction(bays);
    setSaving(false);
    setStatus(result.ok ? "saved" : "error");
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{hr.admin.settings.baysTitle}</h2>
      <div className="mt-3 flex items-center gap-3">
        <Input
          type="number"
          min={1}
          value={bays}
          onChange={(e) => setBays(Number(e.target.value))}
          className="h-12 w-24 text-base"
        />
        <Button className="h-12" disabled={saving} onClick={handleSave}>
          {hr.common.save}
        </Button>
        <SaveStatus status={status} />
      </div>
    </Card>
  );
}

function HoursCard({ initialHours }: { initialHours: HourRow[] }) {
  const initial: HourInput[] = Array.from({ length: 7 }, (_, i) => {
    const weekday = i + 1;
    const existing = initialHours.find((h) => h.weekday === weekday);
    return {
      weekday,
      openTime: existing?.open_time?.slice(0, 5) ?? "08:00",
      closeTime: existing?.close_time?.slice(0, 5) ?? "16:00",
      isClosed: existing?.is_closed ?? weekday === 7,
    };
  });

  const [rows, setRows] = useState<HourInput[]>(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saving, setSaving] = useState(false);

  function updateRow(weekday: number, patch: Partial<HourInput>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateHoursAction(rows);
    setSaving(false);
    setStatus(result.ok ? "saved" : "error");
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{hr.admin.settings.hoursTitle}</h2>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.weekday} className="flex flex-wrap items-center gap-3">
            <span className="w-28 text-sm font-medium">{WEEKDAY_LABELS[row.weekday - 1]}</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={!row.isClosed}
                onCheckedChange={(checked) => updateRow(row.weekday, { isClosed: !checked })}
              />
              <span className="text-sm text-muted-foreground">{row.isClosed ? hr.admin.settings.closed : hr.admin.settings.open}</span>
            </div>
            {!row.isClosed && (
              <>
                <Input
                  type="time"
                  step={1800}
                  value={row.openTime}
                  onChange={(e) => updateRow(row.weekday, { openTime: e.target.value })}
                  className="h-10 w-28"
                />
                <span className="text-muted-foreground">&ndash;</span>
                <Input
                  type="time"
                  step={1800}
                  value={row.closeTime}
                  onChange={(e) => updateRow(row.weekday, { closeTime: e.target.value })}
                  className="h-10 w-28"
                />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button className="h-12" disabled={saving} onClick={handleSave}>
          {hr.common.save}
        </Button>
        <SaveStatus status={status} />
      </div>
    </Card>
  );
}

function ServicesCard({ initialServices }: { initialServices: ServiceRow[] }) {
  const [services, setServices] = useState(initialServices);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function saveService(id: string, patch: Partial<ServiceRow>) {
    const next = services.map((s) => (s.id === id ? { ...s, ...patch } : s));
    setServices(next);
    setSavingId(id);
    const target = next.find((s) => s.id === id)!;
    const result = await updateServiceAction(id, { enabled: target.enabled, slots: target.slots });
    setSavingId(null);
    setStatus(result.ok ? "saved" : "error");
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{hr.admin.settings.servicesTitle}</h2>
      <div className="mt-3 space-y-3">
        {services.map((service) => (
          <div key={service.id} className="flex flex-wrap items-center gap-4">
            <span className="w-40 font-medium">{service.name}</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={service.enabled}
                onCheckedChange={(checked) => void saveService(service.id, { enabled: checked })}
              />
              <span className="text-sm text-muted-foreground">{hr.admin.settings.serviceEnabled}</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">{hr.admin.settings.serviceSlots}</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={service.slots}
                onChange={(e) => setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, slots: Number(e.target.value) } : s)))}
                onBlur={() => void saveService(service.id, {})}
                className="h-10 w-20"
                disabled={savingId === service.id}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <SaveStatus status={status} />
      </div>
    </Card>
  );
}

function BlocksCard({ initialBlocks }: { initialBlocks: BlockRow[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!from || !to) return;
    setSaving(true);
    setError(null);
    const result = await addBlockAction({
      startsAt: new Date(from).toISOString(),
      endsAt: new Date(to).toISOString(),
      reason,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBlocks((prev) => [...prev, { id: crypto.randomUUID(), starts_at: from, ends_at: to, reason: reason || null }]);
    setFrom("");
    setTo("");
    setReason("");
  }

  async function handleDelete(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await deleteBlockAction(id);
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{hr.admin.settings.blocksTitle}</h2>

      <div className="mt-3 space-y-2">
        {blocks.map((block) => (
          <div key={block.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
            <div>
              <div className="font-medium">
                {new Date(block.starts_at).toLocaleString("hr-HR")} &ndash; {new Date(block.ends_at).toLocaleString("hr-HR")}
              </div>
              {block.reason && <div className="text-muted-foreground">{block.reason}</div>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => void handleDelete(block.id)}>
              {hr.admin.settings.blockDelete}
            </Button>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">{hr.admin.settings.blockFrom}</Label>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">{hr.admin.settings.blockTo}</Label>
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">{hr.admin.settings.blockReason}</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-10" />
        </div>
        <Button className="h-10" disabled={saving || !from || !to} onClick={handleAdd}>
          {hr.admin.settings.blocksAdd}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Card>
  );
}
