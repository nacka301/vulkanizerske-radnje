import { notFound } from "next/navigation";
import { getPublicStore } from "./actions";
import { BookingFlow } from "./booking-flow";
import { BrandMark } from "@/components/brand-mark";
import { hr } from "@/messages/hr";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getPublicStore(slug);

  if (!store) {
    notFound();
  }

  if (store.services.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">{hr.booking.storeNotFound.title}</h1>
        <p className="mt-2 text-muted-foreground">{hr.booking.storeNotFound.description}</p>
      </div>
    );
  }

  return (
    <main className="min-h-full">
      <header className="border-b border-border/60 bg-card/80 px-4 py-5 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3">
          <BrandMark />
          <div className="min-w-0">
            <div className="truncate font-semibold">{store.name}</div>
            {store.address && <div className="truncate text-sm text-muted-foreground">{store.address}</div>}
          </div>
        </div>
      </header>
      <BookingFlow store={store} />
    </main>
  );
}
