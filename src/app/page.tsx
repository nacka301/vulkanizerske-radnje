import Link from "next/link";
import { hr } from "@/messages/hr";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">{hr.common.appName}</h1>
      <p className="max-w-md text-muted-foreground">
        Ova stranica je multi-tenant platforma za online rezervaciju termina u vulkanizerskim
        radionicama. Svaka radionica ima vlastiti link (npr. <code>/r/naziv-radionice</code>).
      </p>
      <Link href="/login" className="text-sm underline">
        Prijava za radionice
      </Link>
    </main>
  );
}
