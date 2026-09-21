import { notFound } from "next/navigation";
import { getManagedBooking } from "./actions";
import { ManageBookingView } from "./manage-booking-view";

export const dynamic = "force-dynamic";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { token } = await params;
  const booking = await getManagedBooking(token);

  if (!booking) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <ManageBookingView token={token} booking={booking} />
    </main>
  );
}
