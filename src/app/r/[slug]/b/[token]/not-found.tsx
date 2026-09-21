import { hr } from "@/messages/hr";

export default function BookingNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{hr.booking.manage.notFound}</h1>
    </div>
  );
}
