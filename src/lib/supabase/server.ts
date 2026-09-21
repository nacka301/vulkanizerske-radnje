import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

/**
 * SSR klijent (Server Component/Server Action) koji cita sesiju iz
 * kolacica — koristi anon/publishable kljuc, RLS i dalje vrijedi (nije
 * service-role). Za Server Actione koji pisu, kolacici se ne mogu mijenjati
 * (Next.js ogranicenje izvan middlewarea/route handlera), pa se `setAll`
 * greske ignoriraju — sesija se svejedno obnavlja u middlewareu.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component ne moze pisati kolacice — u redu je,
            // middleware.ts osvjezava sesiju na svakom zahtjevu.
          }
        },
      },
    },
  );
}
