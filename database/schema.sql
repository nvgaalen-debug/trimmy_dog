-- Trimmy · databaseschema voor Aiven for MySQL (MySQL 8)
-- Elke soort gegevens staat in een eigen tabel.
-- Voer dit één keer uit in de database (bijvoorbeeld 'defaultdb' of een eigen database 'trimmy').
--
-- Vaste kolommen in elke synchronisatietabel:
--   id          : sleutel zoals de app hem aanmaakt
--   data        : het volledige record als JSON (zo gaat er bij nieuwe velden niets verloren)
--   updated_ms  : volgnummer van de laatste wijziging (gebruikt voor synchronisatie)
--   deleted     : 1 = verwijderd in de app (de rij blijft bewaard)
--   kassa       : welk apparaat de laatste wijziging stuurde
-- De overige kolommen zijn leesbare kopieën uit 'data', zodat je in SQL kunt zoeken en rapporteren.

CREATE TABLE IF NOT EXISTS klanten (
  id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  naam         VARCHAR(200) NOT NULL DEFAULT '',
  straat       VARCHAR(200) NULL,
  postcode     VARCHAR(12)  NULL,
  plaats       VARCHAR(120) NULL,
  telefoon     VARCHAR(40)  NULL,
  email        VARCHAR(200) NULL,
  notitie      TEXT         NULL,
  data         JSON         NOT NULL,
  updated_ms   BIGINT       NOT NULL,
  deleted      TINYINT(1)   NOT NULL DEFAULT 0,
  kassa        VARCHAR(10)  NULL,
  KEY ix_klanten_sync (updated_ms),
  KEY ix_klanten_naam (naam)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS honden (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  klant_id      VARCHAR(40)  NULL,
  naam          VARCHAR(120) NOT NULL DEFAULT '',
  ras           VARCHAR(120) NULL,
  geboortedatum DATE         NULL,
  geslacht      VARCHAR(10)  NULL,
  gecastreerd   TINYINT(1)   NULL,
  gewicht_kg    DECIMAL(5,2) NULL,
  vachttype     VARCHAR(40)  NULL,
  kleur         VARCHAR(80)  NULL,
  chipnummer    VARCHAR(20)  NULL,
  gedrag        TEXT         NULL,
  medisch       TEXT         NULL,
  notitie       TEXT         NULL,
  actief        TINYINT(1)   NOT NULL DEFAULT 1,
  data          JSON         NOT NULL,          -- bevat ook de (kleine) foto als data-URL
  updated_ms    BIGINT       NOT NULL,
  deleted       TINYINT(1)   NOT NULL DEFAULT 0,
  kassa         VARCHAR(10)  NULL,
  KEY ix_honden_sync (updated_ms),
  KEY ix_honden_klant (klant_id),
  KEY ix_honden_chip (chipnummer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS artikelen (
  id            VARCHAR(40)   NOT NULL PRIMARY KEY,
  naam          VARCHAR(200)  NOT NULL DEFAULT '',
  categorie     VARCHAR(80)   NULL,
  soort         VARCHAR(10)   NOT NULL DEFAULT 'dienst',   -- 'dienst' of 'product'
  prijs_incl    DECIMAL(10,2) NOT NULL DEFAULT 0,
  btw_pct       DECIMAL(4,1)  NOT NULL DEFAULT 21,
  duur_min      INT           NULL,
  voorraad      INT           NULL,
  artikelnummer VARCHAR(60)   NULL,
  actief        TINYINT(1)    NOT NULL DEFAULT 1,
  data          JSON          NOT NULL,
  updated_ms    BIGINT        NOT NULL,
  deleted       TINYINT(1)    NOT NULL DEFAULT 0,
  kassa         VARCHAR(10)   NULL,
  KEY ix_artikelen_sync (updated_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS medewerkers (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,
  naam        VARCHAR(120) NOT NULL DEFAULT '',
  kleur       VARCHAR(9)   NULL,
  data        JSON         NOT NULL,
  updated_ms  BIGINT       NOT NULL,
  deleted     TINYINT(1)   NOT NULL DEFAULT 0,
  kassa       VARCHAR(10)  NULL,
  KEY ix_medewerkers_sync (updated_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS afspraken (
  id             VARCHAR(40)  NOT NULL PRIMARY KEY,
  datum          DATE         NULL,
  starttijd      TIME         NULL,
  duur_min       INT          NULL,
  klant_id       VARCHAR(40)  NULL,
  hond_id        VARCHAR(40)  NULL,
  medewerker_id  VARCHAR(40)  NULL,
  behandelingen  TEXT         NULL,            -- artikel-id's, komma-gescheiden
  status         VARCHAR(20)  NULL,            -- gepland, bevestigd, binnen, klaar, afgerekend, noshow, geannuleerd
  notitie        TEXT         NULL,
  factuur_id     VARCHAR(40)  NULL,
  data           JSON         NOT NULL,
  updated_ms     BIGINT       NOT NULL,
  deleted        TINYINT(1)   NOT NULL DEFAULT 0,
  kassa          VARCHAR(10)  NULL,
  KEY ix_afspraken_sync (updated_ms),
  KEY ix_afspraken_datum (datum, starttijd),
  KEY ix_afspraken_hond (hond_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS facturen (
  id            VARCHAR(40)   NOT NULL PRIMARY KEY,
  nummer        VARCHAR(30)   NOT NULL,
  datum         DATETIME      NULL,
  klant_id      VARCHAR(40)   NULL,
  hond_id       VARCHAR(40)   NULL,
  afspraak_id   VARCHAR(40)   NULL,
  subtotaal     DECIMAL(10,2) NULL,
  korting_pct   DECIMAL(5,2)  NULL,
  totaal        DECIMAL(10,2) NULL,
  btw_bedrag    DECIMAL(10,2) NULL,
  betaald       DECIMAL(10,2) NULL,
  openstaand    DECIMAL(10,2) NULL,
  vervaldatum   DATE          NULL,
  medewerker    VARCHAR(120)  NULL,
  data          JSON          NOT NULL,
  updated_ms    BIGINT        NOT NULL,
  deleted       TINYINT(1)    NOT NULL DEFAULT 0,
  kassa         VARCHAR(10)   NULL,
  UNIQUE KEY ux_facturen_nummer (nummer),
  KEY ix_facturen_sync (updated_ms),
  KEY ix_facturen_klant (klant_id),
  KEY ix_facturen_datum (datum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Afgeleid uit facturen: wordt bij elke wijziging van een factuur opnieuw gevuld.
CREATE TABLE IF NOT EXISTS factuurregels (
  id            BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  factuur_id    VARCHAR(40)   NOT NULL,
  regelnr       INT           NOT NULL,
  artikel_id    VARCHAR(40)   NULL,
  omschrijving  VARCHAR(200)  NULL,
  soort         VARCHAR(10)   NULL,
  aantal        DECIMAL(10,2) NULL,
  prijs_incl    DECIMAL(10,2) NULL,
  btw_pct       DECIMAL(4,1)  NULL,
  totaal_incl   DECIMAL(10,2) NULL,
  KEY ix_regels_factuur (factuur_id),
  KEY ix_regels_artikel (artikel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Afgeleid uit facturen: elke (deel)betaling als eigen rij.
CREATE TABLE IF NOT EXISTS betalingen (
  id          BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  factuur_id  VARCHAR(40)   NOT NULL,
  tijdstip    DATETIME      NULL,
  methode     VARCHAR(20)   NULL,        -- PIN, Contant, Overboeking
  bedrag      DECIMAL(10,2) NULL,
  KEY ix_betalingen_factuur (factuur_id),
  KEY ix_betalingen_tijd (tijdstip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS behandelingen (
  id             VARCHAR(40)  NOT NULL PRIMARY KEY,
  datum          DATE         NULL,
  hond_id        VARCHAR(40)  NULL,
  klant_id       VARCHAR(40)  NULL,
  afspraak_id    VARCHAR(40)  NULL,
  factuur_id     VARCHAR(40)  NULL,
  medewerker     VARCHAR(120) NULL,
  behandelingen  TEXT         NULL,
  mesje_techniek VARCHAR(200) NULL,
  vachtconditie  VARCHAR(40)  NULL,
  gedrag         VARCHAR(40)  NULL,
  notitie        TEXT         NULL,
  data           JSON         NOT NULL,
  updated_ms     BIGINT       NOT NULL,
  deleted        TINYINT(1)   NOT NULL DEFAULT 0,
  kassa          VARCHAR(10)  NULL,
  KEY ix_behandelingen_sync (updated_ms),
  KEY ix_behandelingen_hond (hond_id, datum)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS bedrijf (
  id          VARCHAR(40)  NOT NULL PRIMARY KEY,   -- altijd 'bedrijf'
  naam        VARCHAR(200) NULL,
  kvk         VARCHAR(20)  NULL,
  btw_nummer  VARCHAR(30)  NULL,
  iban        VARCHAR(40)  NULL,
  data        JSON         NOT NULL,
  updated_ms  BIGINT       NOT NULL,
  deleted     TINYINT(1)   NOT NULL DEFAULT 0,
  kassa       VARCHAR(10)  NULL,
  KEY ix_bedrijf_sync (updated_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Handige weergaven voor rapportages
CREATE OR REPLACE VIEW v_omzet_per_dag AS
  SELECT DATE(b.tijdstip) AS dag, b.methode, SUM(b.bedrag) AS ontvangen, COUNT(*) AS aantal
  FROM betalingen b JOIN facturen f ON f.id = b.factuur_id AND f.deleted = 0
  GROUP BY DATE(b.tijdstip), b.methode;

CREATE OR REPLACE VIEW v_hond_historie AS
  SELECT h.naam AS hond, h.ras, k.naam AS klant, bh.datum, bh.behandelingen, bh.mesje_techniek,
         bh.vachtconditie, bh.gedrag, bh.medewerker, bh.notitie
  FROM behandelingen bh
  JOIN honden h  ON h.id = bh.hond_id
  LEFT JOIN klanten k ON k.id = h.klant_id
  WHERE bh.deleted = 0;

CREATE OR REPLACE VIEW v_openstaande_facturen AS
  SELECT f.nummer, f.datum, f.vervaldatum, k.naam AS klant, k.email, f.totaal, f.openstaand
  FROM facturen f LEFT JOIN klanten k ON k.id = f.klant_id
  WHERE f.deleted = 0 AND f.openstaand > 0;
