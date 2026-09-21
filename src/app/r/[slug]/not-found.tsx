import { hr } from "@/messages/hr";

export default function StoreNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{hr.booking.storeNotFound.title}</h1>
      <p className="mt-2 text-muted-foreground">{hr.booking.storeNotFound.description}</p>
    </div>
  );
}
