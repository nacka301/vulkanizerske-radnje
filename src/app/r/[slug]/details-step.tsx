"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { useCountdown } from "@/lib/use-countdown";
import { hr } from "@/messages/hr";

export type DetailsFormValues = {
  name: string;
  phone: string;
  plate: string;
  consent: boolean;
  turnstileToken: string;
};

export function DetailsStep({
  holdExpiresAt,
  onExpired,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  holdExpiresAt: string;
  onExpired: () => void;
  onBack: () => void;
  onSubmit: (values: DetailsFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { secondsLeft, expired } = useCountdown(holdExpiresAt);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  if (expired) {
    onExpired();
    return null;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, phone, plate, consent, turnstileToken });
  }

  return (
    <div>
      <Button type="button" variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
        &larr; {hr.common.back}
      </Button>
      <h1 className="text-2xl font-bold">{hr.booking.detailsStep.title}</h1>

      <div
        className={
          secondsLeft <= 30
            ? "mt-3 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
            : "mt-3 rounded-md border bg-muted px-3 py-2 text-sm"
        }
      >
        {hr.booking.hold.countdownLabel}: {minutes}:{seconds.toString().padStart(2, "0")}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{hr.booking.detailsStep.name}</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={hr.booking.detailsStep.namePlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">{hr.booking.detailsStep.phone}</Label>
          <Input
            id="phone"
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={hr.booking.detailsStep.phonePlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plate">{hr.booking.detailsStep.plate}</Label>
          <Input
            id="plate"
            required
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder={hr.booking.detailsStep.platePlaceholder}
          />
        </div>

        <TurnstileWidget onVerify={setTurnstileToken} />

        <div className="flex items-start gap-2">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
          />
          <Label htmlFor="consent" className="font-normal">
            {hr.booking.detailsStep.consentPrefix}
            <Link href={hr.booking.privacyPolicyLinkHref} target="_blank" className="underline">
              {hr.booking.detailsStep.consentLinkText}
            </Link>
            {hr.booking.detailsStep.consentSuffix}
          </Label>
        </div>

        <p className="text-xs text-muted-foreground">{hr.booking.detailsStep.smsNotice}</p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || !consent || !turnstileToken}
        >
          {submitting ? hr.booking.detailsStep.submitting : hr.booking.detailsStep.submit}
        </Button>
      </form>
    </div>
  );
}
