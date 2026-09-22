import { notFound } from "next/navigation";
import { getPublicStore } from "./actions";
import { BookingFlow } from "./booking-flow";
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
      <BookingFlow store={store} />
    </main>
  );
}
