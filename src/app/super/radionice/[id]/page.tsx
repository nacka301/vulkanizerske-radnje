import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hr } from "@/messages/hr";
import { StoreForm } from "../store-form";
import { AdminsSection } from "./admins-section";
import { QrSection } from "./qr-section";

export default async function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, address, phone, timezone, bays, active")
    .eq("id", id)
    .maybeSingle();

  if (!store) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/super" className="text-sm text-muted-foreground underline">
          &larr; {hr.super.form.backToList}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{store.name}</h1>
      </div>

      <StoreForm
        mode="edit"
        storeId={store.id}
        initial={{
          name: store.name,
          slug: store.slug,
          address: store.address ?? "",
          phone: store.phone ?? "",
          timezone: store.timezone,
          bays: store.bays,
          active: store.active,
        }}
      />

      <AdminsSection storeId={store.id} />
      <QrSection slug={store.slug} />
    </div>
  );
}
