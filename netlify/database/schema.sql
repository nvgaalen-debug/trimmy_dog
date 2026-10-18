-- Trimmy · PostgreSQL-schema (Aiven for PostgreSQL)
--
-- Je hoeft dit NIET zelf uit te voeren: de koppelservice (netlify/functions/db.mjs)
-- maakt alle tabellen bij de eerste verbinding zelf aan in schema "trimmy".
-- Dit bestand is ter naslag.
--
-- Eenmalig nodig, als avnadmin in de Aiven Query editor (zie LEESMIJ):
--   1. Maak in de Aiven-console bij Users een gebruiker "trimmy_app" aan.
--   2. Voer uit:
--        CREATE SCHEMA trimmy AUTHORIZATION trimmy_app;
--        REVOKE ALL ON SCHEMA trimmy FROM PUBLIC;
--   Zo kan Trimmy alleen in zijn eigen schema werken en niet bij de
--   gegevens van Restpartijbeurs of andere apps in dezelfde database.

CREATE SEQUENCE IF NOT EXISTS "trimmy"."sync_versie";

CREATE TABLE IF NOT EXISTS "trimmy"."klanten" (id VARCHAR(40) PRIMARY KEY, "naam" VARCHAR(200) NOT NULL DEFAULT '', "straat" VARCHAR(200), "postcode" VARCHAR(12), "plaats" VARCHAR(120), "telefoon" VARCHAR(40), "email" VARCHAR(200), "notitie" TEXT, data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS "klanten_versie" ON "trimmy"."klanten" (versie);

CREATE INDEX IF NOT EXISTS "klanten_naam" ON "trimmy"."klanten" ("naam");

CREATE TABLE IF NOT EXISTS "trimmy"."honden" (id VARCHAR(40) PRIMARY KEY, "klant_id" VARCHAR(40), "naam" VARCHAR(120) NOT NULL DEFAULT '', "ras" VARCHAR(120), "geboortedatum" DATE, "geslacht" VARCHAR(10), "gecastreerd" BOOLEAN, "gewicht_kg" NUMERIC(6,2), "vachttype" VARCHAR(40), "kleur" VARCHAR(80), "chipnummer" VARCHAR(20), "gedrag" TEXT, "medisch" TEXT, "notitie" TEXT, "actief" BOOLEAN NOT NULL DEFAULT true, data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS "honden_versie" ON "trimmy"."honden" (versie);

CREATE INDEX IF NOT EXISTS "honden_klant_id" ON "trimmy"."honden" ("klant_id");

CREATE INDEX IF NOT EXISTS "honden_chipnummer" ON "trimmy"."honden" ("chipnummer");

CREATE TABLE IF NOT EXISTS "trimmy"."artikelen" (id VARCHAR(40) PRIMARY KEY, "naam" VARCHAR(200) NOT NULL DEFAULT '', "categorie" VARCHAR(80), "soort" VARCHAR(10) NOT NULL DEFAULT 'dienst', "prijs_incl" NUMERIC(10,2) NOT NULL DEFAULT 0, "btw_pct" NUMERIC(4,1) NOT NULL DEFAULT 21, "duur_min" INTEGER, "voorraad" INTEGER, "artikelnummer" VARCHAR(60), "actief" BOOLEAN NOT NULL DEFAULT true, data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS "artikelen_versie" ON "trimmy"."artikelen" (versie);

CREATE TABLE IF NOT EXISTS "trimmy"."medewerkers" (id VARCHAR(40) PRIMARY KEY, "naam" VARCHAR(120) NOT NULL DEFAULT '', "kleur" VARCHAR(9), "rol" VARCHAR(20), data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS "medewerkers_versie" ON "trimmy"."medewerkers" (versie);

CREATE TABLE IF NOT EXISTS "trimmy"."afspraken" (id VARCHAR(40) PRIMARY KEY, "datum" DATE, "starttijd" TIME, "duur_min" INTEGER, "klant_id" VARCHAR(40), "hond_id" VARCHAR(40), "medewerker_id" VARCHAR(40), "behandelingen" TEXT, "status" VARCHAR(20), "notitie" TEXT, "factuur_id" VARCHAR(40), data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS "afspraken_versie" ON "trimmy"."afspraken" (versie);

CREATE INDEX IF NOT EXISTS "afspraken_datum" ON "trimmy"."afspraken" ("datum");

CREATE INDEX IF NOT EXISTS "afspraken_hond_id" ON "trimmy"."afspraken" ("hond_id");

CREATE TABLE IF NOT EXISTS "trimmy"."facturen" (id VARCHAR(40) PRIMARY KEY, "nummer" VARCHAR(30) NOT NULL, "datum" TIMESTAMPTZ, "klant_id" VARCHAR(40), "hond_id" VARCHAR(40), "afspraak_id" VARCHAR(40), "subtotaal" NUMERIC(10,2), "korting_pct" NUMERIC(5,2), "totaal" NUMERIC(10,2), "btw_bedrag" NUMERIC(10,2), "betaald" NUMERIC(10,2), "openstaand" NUMERIC(10,2), "vervaldatum" DATE, "medewerker" VARCHAR(120), data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS "facturen_versie" ON "trimmy"."facturen" (versie);

CREATE INDEX IF NOT EXISTS "facturen_klant_id" ON "trimmy"."facturen" ("klant_id");

CREATE INDEX IF NOT EXISTS "facturen_datum" ON "trimmy"."facturen" ("datum");

CREATE UNIQUE INDEX IF NOT EXISTS "facturen_nummer_uniek" ON "trimmy"."facturen" ("nummer");

CREATE TABLE IF NOT EXISTS "trimmy"."behandelingen" (id VARCHAR(40) PRIMARY KEY, "datum" DATE, "hond_id" VARCHAR(40), "klant_id" VARCHAR(40), "afspraak_id" VARCHAR(40), "factuur_id" VARCHAR(40), "medewerker" VARCHAR(120), "behandelingen" TEXT, "mesje_techniek" VARCHAR(200), "vachtconditie" VARCHAR(40), "gedrag" VARCHAR(40), "notitie" TEXT, data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS "behandelingen_versie" ON "trimmy"."behandelingen" (versie);

CREATE INDEX IF NOT EXISTS "behandelingen_hond_id" ON "trimmy"."behandelingen" ("hond_id");

CREATE TABLE IF NOT EXISTS "trimmy"."bedrijf" (id VARCHAR(40) PRIMARY KEY, "naam" VARCHAR(200), "kvk" VARCHAR(20), "btw_nummer" VARCHAR(30), "iban" VARCHAR(40), data JSONB NOT NULL, versie BIGINT NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false, kassa VARCHAR(10), bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS "bedrijf_versie" ON "trimmy"."bedrijf" (versie);

CREATE TABLE IF NOT EXISTS "trimmy"."factuurregels" (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, factuur_id VARCHAR(40) NOT NULL, regelnr INTEGER NOT NULL, artikel_id VARCHAR(40), omschrijving VARCHAR(200), soort VARCHAR(10), vrij BOOLEAN NOT NULL DEFAULT false, aantal NUMERIC(10,2), prijs_incl NUMERIC(10,2), btw_pct NUMERIC(4,1), totaal_incl NUMERIC(10,2));

CREATE INDEX IF NOT EXISTS "factuurregels_factuur" ON "trimmy"."factuurregels" (factuur_id);

CREATE TABLE IF NOT EXISTS "trimmy"."betalingen" (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, factuur_id VARCHAR(40) NOT NULL, tijdstip TIMESTAMPTZ, methode VARCHAR(20), bedrag NUMERIC(10,2));

CREATE INDEX IF NOT EXISTS "betalingen_factuur" ON "trimmy"."betalingen" (factuur_id);

CREATE OR REPLACE VIEW "trimmy"."v_omzet_per_dag" AS SELECT (b.tijdstip AT TIME ZONE 'Europe/Amsterdam')::date AS dag, b.methode, SUM(b.bedrag) AS ontvangen, COUNT(*) AS aantal FROM "trimmy"."betalingen" b JOIN "trimmy"."facturen" f ON f.id = b.factuur_id AND NOT f.deleted GROUP BY 1, 2;

CREATE OR REPLACE VIEW "trimmy"."v_hond_historie" AS SELECT h.naam AS hond, h.ras, k.naam AS klant, bh.datum, bh.behandelingen, bh.mesje_techniek, bh.vachtconditie, bh.gedrag, bh.medewerker, bh.notitie FROM "trimmy"."behandelingen" bh JOIN "trimmy"."honden" h ON h.id = bh.hond_id LEFT JOIN "trimmy"."klanten" k ON k.id = h.klant_id WHERE NOT bh.deleted;

CREATE OR REPLACE VIEW "trimmy"."v_openstaande_facturen" AS SELECT f.nummer, f.datum, f.vervaldatum, k.naam AS klant, k.email, f.totaal, f.openstaand FROM "trimmy"."facturen" f LEFT JOIN "trimmy"."klanten" k ON k.id = f.klant_id WHERE NOT f.deleted AND f.openstaand > 0;
