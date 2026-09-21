import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Poglavlje 8: "dodaj lint pravilo ili test koji pada ako se kljuc
 * importira u klijentsku komponentu". `src/lib/supabase/admin.ts` vec ima
 * `import "server-only"` (baca gresku na buildu ako se ubaci u klijentski
 * bundle), ovaj test je dodatna, brza provjera na razini izvornog koda: ni
 * jedna "use client" datoteka ne smije referencirati service-role kljuc ili
 * uvoziti admin klijent.
 */
const SRC_DIR = join(__dirname, "..");

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  let files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("service_role key never reaches client code", () => {
  const files = walk(SRC_DIR);
  const clientFiles = files.filter((f) => readFileSync(f, "utf8").startsWith('"use client"'));

  it("found at least one client component to check (sanity check)", () => {
    expect(clientFiles.length).toBeGreaterThan(0);
  });

  it.each(clientFiles)("%s does not reference SUPABASE_SERVICE_ROLE_KEY or the admin client", (file) => {
    const content = readFileSync(file, "utf8");
    expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(content).not.toMatch(/supabase\/admin/);
  });

  it("admin.ts server client guards itself with server-only", () => {
    const adminFile = join(SRC_DIR, "lib/supabase/admin.ts");
    const content = readFileSync(adminFile, "utf8");
    expect(content).toMatch(/^import "server-only";/m);
  });
});
