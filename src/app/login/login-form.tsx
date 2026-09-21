"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { hr } from "@/messages/hr";
import { loginAction } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await loginAction(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(result.role === "super_admin" ? "/super" : "/admin");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-xl font-bold">{hr.auth.login.title}</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
      </form>
    </Card>
  );
}
