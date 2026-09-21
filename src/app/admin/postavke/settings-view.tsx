"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { hr } from "@/messages/hr";
import { useAdminStore } from "../admin-store-context";
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

type HourRow = {
  weekday: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  break_start: string | null;
  break_end: string | null;
};
type BlockRow = { id: string; starts_at: string; ends_at: string; reason: string | null };
type ServiceRow = { id: string; name: string; slots: number; enabled: boolean };

export function SettingsView({
  bays,
  slotMinutes,
  hours,
  blocks,
  services,
}: {
  bays: number;
  slotMinutes: number;
  hours: HourRow[];
  blocks: BlockRow[];
  services: ServiceRow[];
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{hr.admin.settings.title}</h1>
      <BookingLinkCard />
      <BaysCard initialBays={bays} />
      <HoursCard initialHours={hours} />
      <ServicesCard initialServices={services} slotMinutes={slotMinutes} />
      <BlocksCard initialBlocks={blocks} />
    </div>
  );
}

function BookingLinkCard() {
  const store = useAdminStore();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/r/${store.slug}`);
  }, [store.slug]);

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API moze biti nedostupna (http, dozvole) — tiho ignoriraj.
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{hr.admin.settings.bookingLinkTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hr.admin.settings.bookingLinkSubtitle}</p>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
        <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{url || "…"}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()} disabled={!url}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? hr.admin.settings.linkCopied : hr.admin.settings.linkCopy}
        </Button>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        disabled={!url}
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      >
        <ExternalLink className="size-4" />
        {hr.admin.settings.viewAsClient}
      </Button>
    </Card>
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
      breakStart: existing?.break_start?.slice(0, 5) ?? null,
      breakEnd: existing?.break_end?.slice(0, 5) ?? null,
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
          <div key={row.weekday} className="rounded-lg border border-border/60 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-28 text-sm font-medium">{WEEKDAY_LABELS[row.weekday - 1]}</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!row.isClosed}
                  onCheckedChange={(checked) =>
                    updateRow(row.weekday, checked ? { isClosed: false } : { isClosed: true, breakStart: null, breakEnd: null })
                  }
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

            {!row.isClosed && (
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
                <div className="flex w-28 items-center gap-2">
                  <Switch
                    checked={row.breakStart !== null}
                    onCheckedChange={(checked) =>
                      updateRow(row.weekday, checked ? { breakStart: "12:00", breakEnd: "12:30" } : { breakStart: null, breakEnd: null })
                    }
                  />
                  <span className="text-sm text-muted-foreground">{hr.admin.settings.breakLabel}</span>
                </div>
                {row.breakStart !== null && (
                  <>
                    <Input
                      type="time"
                      step={1800}
                      value={row.breakStart}
                      onChange={(e) => updateRow(row.weekday, { breakStart: e.target.value })}
                      className="h-10 w-28"
                    />
                    <span className="text-muted-foreground">&ndash;</span>
                    <Input
                      type="time"
                      step={1800}
                      value={row.breakEnd ?? ""}
                      onChange={(e) => updateRow(row.weekday, { breakEnd: e.target.value })}
                      className="h-10 w-28"
                    />
                  </>
                )}
              </div>
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

function ServicesCard({ initialServices, slotMinutes }: { initialServices: ServiceRow[]; slotMinutes: number }) {
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
      <div className="mt-4 space-y-3">
        {services.map((service) => (
          <div key={service.id} className="rounded-lg border border-border/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-medium">{service.name}</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={service.enabled}
                  onCheckedChange={(checked) => void saveService(service.id, { enabled: checked })}
                />
                <span className="text-sm text-muted-foreground">{hr.admin.settings.serviceEnabled}</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">{hr.admin.settings.serviceSlots}</Label>
                <DurationMinutesInput
                  minutes={service.slots * slotMinutes}
                  slotMinutes={slotMinutes}
                  disabled={savingId === service.id}
                  onCommit={(minutes) => void saveService(service.id, { slots: minutes / slotMinutes })}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{hr.admin.settings.serviceSlotsHint}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <SaveStatus status={status} />
      </div>
    </Card>
  );
}

function DurationMinutesInput({
  minutes,
  slotMinutes,
  disabled,
  onCommit,
}: {
  minutes: number;
  slotMinutes: number;
  disabled?: boolean;
  onCommit: (minutes: number) => void;
}) {
  const [value, setValue] = useState(String(minutes));

  useEffect(() => setValue(String(minutes)), [minutes]);

  function commit() {
    const raw = Number(value);
    const maxMinutes = slotMinutes * 8;
    if (!Number.isFinite(raw) || raw <= 0) {
      setValue(String(minutes));
      return;
    }
    const snapped = Math.min(maxMinutes, Math.max(slotMinutes, Math.round(raw / slotMinutes) * slotMinutes));
    setValue(String(snapped));
    if (snapped !== minutes) onCommit(snapped);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={slotMinutes}
        max={slotMinutes * 8}
        step={slotMinutes}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        disabled={disabled}
        className="h-10 w-20"
      />
      <span className="text-sm text-muted-foreground">{hr.common.minutesShort}</span>
    </div>
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
