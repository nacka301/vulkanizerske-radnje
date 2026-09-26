-- Stvarna produkcijska domena je duga podijeljena *.vercel.app domena (jos
-- nema kupljene domene), ne kratka domena kao u testovima. S izvornim
-- 32-bajtnim (43-znakovnim) manage_token i punim tekstom predloska,
-- CONFIRMATION SMS je izasao na 193 znaka -> 2 GSM-7 segmenta kod Infobipa
-- umjesto 1 (dvostruki trosak po poruci, potvrdjeno u Infobip logovima:
-- "Number of messages: 2"). Ne diramo sigurnost tokena vise nego treba:
-- 12 nasumicnih bajtova (96 bitova entropije) i dalje je daleko iznad onog
-- sto je potrebno protiv pogadjanja (token se ne provjerava brute-forceom,
-- nema enumeracije puta, vidi rate-limit.ts), a base64url duljina pada s
-- 43 na 16 znakova.
alter table bookings
  alter column manage_token set default translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_');

-- Krace formulacije istog sadrzaja (bez gubitka znacenja) da preostala
-- razlika ("Otkazivanje:" -> "Otkazi:", "Vasa ... je potvrdjena" -> "...
-- potvrdjena", "Vas termin ... je pomaknut" -> "Termin ... pomaknut")
-- pokrije i dulja imena radionica bez prelaska na 2 segmenta. TS verzija
-- (src/lib/sms/templates.ts) mora ostati doslovno identicna ovoj.
create or replace function build_sms_body(
  p_kind sms_kind,
  p_plate text,
  p_store_name text,
  p_start timestamptz,
  p_tz text,
  p_url text
) returns text
language plpgsql
stable
as $$
declare
  v_store_name text := hr_strip_diacritics(p_store_name);
  v_date text := to_char(p_start at time zone p_tz, 'DD.MM.');
  v_time text := to_char(p_start at time zone p_tz, 'HH24:MI');
begin
  return case p_kind
    when 'CONFIRMATION' then
      case when p_plate is not null then
        format(
          'Rezervacija %s u %s potvrdjena %s u %s. Otkazi: %s',
          p_plate, v_store_name, v_date, v_time, p_url
        )
      else
        format(
          'Rezervacija u %s potvrdjena %s u %s. Otkazi: %s',
          v_store_name, v_date, v_time, p_url
        )
      end
    when 'REMINDER' then format(
      'Podsjetnik: sutra u %s termin za zamjenu guma (%s). Otkazi: %s',
      v_time, v_store_name, p_url
    )
    when 'CANCELLATION' then format(
      'Vas termin %s u %s (%s) je otkazan.',
      v_date, v_time, v_store_name
    )
    when 'RESCHEDULE' then format(
      'Termin u %s pomaknut na %s u %s. Otkazi: %s',
      v_store_name, v_date, v_time, p_url
    )
  end;
end;
$$;
