"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { hr } from "@/messages/hr";
import { loginAction } from "./actions";

const DEMO_ACCOUNTS = [
  { label: hr.auth.login.demoAdmin, email: "admin@vulkanizer.hr", password: "admin123" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(loginEmail: string, loginPassword: string) {
    setSubmitting(true);
    setError(null);

    const result = await loginAction(loginEmail, loginPassword);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(result.role === "super_admin" ? "/super" : "/admin");
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit(email, password);
  }

  function fillAndSubmit(acc: { email: string; password: string }) {
    setEmail(acc.email);
    setPassword(acc.password);
    void submit(acc.email, acc.password);
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{hr.auth.login.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{hr.auth.login.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? hr.auth.login.submitting : hr.auth.login.submit}
        </Button>
        {submitting && (
          <p className="text-center text-sm font-medium text-muted-foreground" aria-live="polite">
            {hr.auth.login.submittingNotice}
          </p>
        )}
      </form>

      <div className="mt-6 rounded-lg border border-dashed border-border/60 p-3">
        <div className="text-xs font-semibold text-muted-foreground">{hr.auth.login.demoTitle}</div>
        <div className="mt-2 space-y-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <div key={acc.email} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{acc.label}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {acc.email} / {acc.password}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={submitting}
                onClick={() => fillAndSubmit(acc)}
              >
                {hr.auth.login.demoFill}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
