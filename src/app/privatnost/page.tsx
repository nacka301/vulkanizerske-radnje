export const metadata = {
  title: "Pravila privatnosti",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Pravila privatnosti</h1>

      <div className="prose prose-sm mt-6 max-w-none space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          Ova stranica omogucuje rezervaciju termina za zamjenu guma u odabranoj vulkanizerskoj
          radionici. Kod rezervacije prikupljamo ime i prezime, broj mobitela i registarsku
          oznaku vozila, iskljucivo u svrhu organizacije termina i slanja SMS obavijesti
          (potvrda, podsjetnik, obavijest o otkazivanju/pomicanju termina).
        </p>

        <h2 className="text-lg font-semibold">Voditelj obrade i izvrsitelj obrade</h2>
        <p>
          Voditelj obrade osobnih podataka je vulkanizerska radionica kod koje rezervirate
          termin. Platforma preko koje se rezervacija provodi djeluje kao izvrsitelj obrade u
          njezino ime, u skladu s Opcom uredbom o zastiti podataka (GDPR).
        </p>

        <h2 className="text-lg font-semibold">Koje podatke prikupljamo</h2>
        <ul className="list-disc pl-5">
          <li>Ime i prezime</li>
          <li>Broj mobitela (za SMS obavijesti)</li>
          <li>Registarska oznaka vozila</li>
          <li>Vrijeme i vrsta odabrane usluge</li>
        </ul>

        <h2 className="text-lg font-semibold">Rok cuvanja podataka</h2>
        <p>
          Osobni podaci (ime i broj mobitela) cuvaju se najdulje 12 mjeseci od trenutka
          rezervacije, nakon cega se automatski anonimiziraju. Zapis o samom terminu
          (registarska oznaka, vrijeme, status) moze se zadrzati dulje u statisticke i
          poslovne svrhe radionice, bez osobnih podataka.
        </p>

        <h2 className="text-lg font-semibold">Vasa prava</h2>
        <p>
          U svakom trenutku mozete otkazati rezervaciju putem poveznice poslane SMS-om. Za
          zahtjeve u vezi s pristupom, ispravkom ili brisanjem osobnih podataka obratite se
          izravno radionici kod koje ste rezervirali termin.
        </p>

        <h2 className="text-lg font-semibold">Kolacici</h2>
        <p>
          Ova stranica ne koristi marketinske kolacice niti alate za pracenje. Jedini kolacic
          koji se moze postaviti je onaj potreban za prijavu administratora radionice.
        </p>
      </div>
    </main>
  );
}
