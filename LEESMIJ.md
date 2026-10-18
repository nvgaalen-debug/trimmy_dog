# Trimmy installeren met Aiven

Trimmy is één webpagina (`public/index.html`) plus een kleine koppelservice (`netlify/functions/db.mjs`). Die koppelservice bewaart de gegevens in je Aiven PostgreSQL-database. Trimmy gebruikt daar een eigen schema `trimmy` met een eigen gebruiker `trimmy_app`, dus het kan dezelfde database delen met Restpartijbeurs zonder bij die gegevens te kunnen. Elke soort gegevens heeft een eigen tabel.

| Tabel | Inhoud |
|---|---|
| `klanten` | naam, adres, telefoon, e-mail, notitie |
| `honden` | per klant: ras, geboortedatum, geslacht, gewicht, vachttype, chip, gedrag, medisch, foto |
| `artikelen` | behandelingen (met duur) en producten (met voorraad), prijs incl. btw, btw-tarief |
| `medewerkers` | naam en agendakleur |
| `afspraken` | datum, tijd, duur, hond, medewerker, behandelingen, status |
| `facturen` | kop van elke bon/factuur, totaal, btw, betaald, openstaand |
| `factuurregels` | elke regel van een factuur (automatisch gevuld) |
| `betalingen` | elke (deel)betaling met methode (automatisch gevuld) |
| `behandelingen` | historie per hond: mesje/techniek, vachtconditie, gedrag, notitie |
| `bedrijf` | salongegevens voor de factuur |

Plus drie weergaven voor rapportage: `v_omzet_per_dag`, `v_hond_historie`, `v_openstaande_facturen`.

## 1. Database voorbereiden in Aiven (eenmalig, ±5 minuten)

Je gebruikt je bestaande **Aiven for PostgreSQL**-service, dezelfde als Restpartijbeurs.

1. Open de service in console.aiven.io en ga naar **Users**. Klik op **Add service user** en noem hem `trimmy_app`. Kopieer het wachtwoord dat Aiven toont.
2. Ga naar **Query editor** (je bent dan `avnadmin`), kies database `defaultdb` en voer uit:
   ```sql
   CREATE SCHEMA trimmy AUTHORIZATION trimmy_app;
   REVOKE ALL ON SCHEMA trimmy FROM PUBLIC;
   ```
   De tabellen hoef je niet zelf te maken: de koppelservice doet dat bij de eerste verbinding. `database/schema.sql` staat erbij ter naslag.
3. Op het tabblad **Overview**: noteer de **Service URI** en kopieer het **CA certificate** (*Show* > kopiëren).

## 2. Op Netlify zetten

1. Zet deze map in een GitHub-repository en koppel die in Netlify (*Add new site > Import an existing project > GitHub*). Gebruik geen Netlify Drop: dan installeert Netlify het pakket `pg` niet.
2. Stel bij *Site configuration > Environment variables* in (markeer wachtwoorden als *secret*):

| Variabele | Waarde |
|---|---|
| `DATABASE_URL` | de Service URI, maar met **`trimmy_app` en zijn wachtwoord** in plaats van `avnadmin`: `postgres://trimmy_app:WACHTWOORD@….aivencloud.com:12345/defaultdb?sslmode=require` |
| `AIVEN_CA_CERT` | de volledige inhoud van het CA-certificaat (inclusief de BEGIN/END-regels). Aanbevolen; zonder dit is de verbinding wel versleuteld, maar wordt de server niet gecontroleerd |
| `TRIMMY_CODE` | een lange, zelfgekozen geheime code (letters en cijfers, geen punt aan het eind) |
| `TRIMMY_ORIGIN` | optioneel: het adres van je site, bijvoorbeeld `https://trimmydog.netlify.app` |
| `DB_SCHEMA` | optioneel, standaard `trimmy` |

Gebruik **niet** de `avnadmin`-URI van Restpartijbeurs: met de eigen gebruiker kan Trimmy alleen in zijn eigen schema.

3. Deploy opnieuw (*Deploys > Trigger deploy*) zodat de variabelen actief worden.
4. Test in je browser: `https://jouw-trimmy.netlify.app/api/db/status?code=JOUW_TRIMMY_CODE`. Je ziet dan `"ok":true` met `"gebruiker":"trimmy_app"` en de lijst met tabellen.

## 3. Trimmy koppelen

1. Open Trimmy op je eigen Netlify-adres. Daar werkt ook printen en pdf maken van kassabon en factuur.
2. Ga naar **Instellingen > Bedrijfsgegevens** en geef elk apparaat een eigen **Kassa-ID** (K1, K2, …). Zo krijgen facturen nooit hetzelfde nummer.
3. Ga naar **Instellingen > Koppelingen** en vul in: `https://jouw-trimmy.netlify.app/api/db?code=JOUW_TRIMMY_CODE`. Klik op **Verbinding testen**.
4. Vink *Gegevens bewaren in de Aiven-database* aan. Het bolletje rechtsboven wordt groen zodra de eerste synchronisatie klaar is.

Wis eerst de voorbeeldgegevens (knop bovenaan) voordat je de database aanzet, anders komen de verzonnen klanten ook in Aiven.

## Foutmeldingen bij de database

| Melding | Oplossing |
|---|---|
| wachtwoord klopt niet | controleer gebruiker en wachtwoord in `DATABASE_URL` |
| geen rechten op schema 'trimmy' | voer stap 1.2 uit als `avnadmin` |
| database bestaat niet | het deel na de laatste `/` in `DATABASE_URL` moet `defaultdb` zijn |
| certificaat | plak het CA-certificaat opnieuw in `AIVEN_CA_CERT`, inclusief BEGIN/END-regels |
| niet bereikbaar | staat de Aiven-service aan (gratis services pauzeren na een tijd zonder gebruik)? |

## Trimmy als app en zonder internet

Trimmy is te installeren als app (*Instellingen > Gegevens en apparaat > Trimmy als app*, of via het installatie-icoon in de adresbalk; op iPad/iPhone via *Deel > Zet op beginscherm*). De app wordt op het apparaat bewaard en start ook zonder internet. Is er verbinding, dan haalt hij altijd eerst de nieuwste versie op.

Het bolletje rechtsboven:

| Kleur | Betekenis |
|---|---|
| Groen | Gesynchroniseerd met Aiven (met tijd) |
| Oranje | Offline: je werkt door op dit apparaat, wijzigingen gaan mee zodra er weer internet is |
| Rood | Echte fout, bijvoorbeeld een verkeerd wachtwoord of code; zie Instellingen > Koppelingen |
| Grijs | Database staat uit, alleen dit apparaat |

## Een extra apparaat toevoegen (iPhone, iPad, tweede computer)

1. Open Trimmy op het nieuwe apparaat en installeer hem als app (zie hierboven). Je ziet eerst de voorbeeldgegevens; dat is goed.
2. *Instellingen > Gegevens en apparaat*: geef dit apparaat een eigen **Kassa-ID** (K2, K3, …) en klik op *Opslaan*. De Kassa-ID hoort bij het apparaat en wordt niet gedeeld.
3. *Instellingen > Koppelingen*: vul het adres van de koppelservice in, klik op *Verbinding testen* en vink de database aan.
4. Trimmy ziet dat er al gegevens in de database staan en vraagt of dit apparaat ze **overneemt**. Kies *Overnemen*: de voorbeeldgegevens verdwijnen en alle klanten, afspraken en salongegevens komen binnen. Daarna vraagt Trimmy om de inlogcode als die is ingesteld.

## Hoe de synchronisatie werkt

- Trimmy werkt altijd eerst op het apparaat zelf, ook als internet of de database even weg is.
- Elke wijziging gaat binnen een paar seconden naar Aiven.
- Wijzigingen van andere apparaten haalt Trimmy op in één aanroep voor alle tabellen: elke 30 seconden als de agenda of een venster open staat, anders elke 2 minuten, en na 10 minuten zonder gebruik elke 5 minuten. Ook direct als je Trimmy weer naar voren haalt.
- Bij het opslaan van een afspraak haalt Trimmy eerst de nieuwste agenda op. Heeft een collega dat tijdstip net geboekt, dan zie je dat meteen. Ben je offline, dan krijg je een seintje om het later te controleren.
- Netlify Free heeft 125.000 functie-aanroepen per maand. Met twee apparaten de hele dag open blijft Trimmy daar ruim onder (ongeveer 60.000).
- Facturen worden in de database nooit verwijderd. Andere records krijgen bij verwijderen `deleted = true`.
- De kolom `data` bevat steeds het volledige record als JSON; de andere kolommen zijn leesbare kopieën om in SQL mee te werken.

## Voorbeeldquery's

```sql
SET search_path TO trimmy;

-- Wanneer was Bobbie voor het laatst en met welk mesje?
SELECT datum, behandelingen, mesje_techniek, notitie FROM v_hond_historie WHERE hond = 'Bobbie' ORDER BY datum DESC;

-- Omzet per maand per btw-tarief
SELECT to_char(f.datum,'YYYY-MM') maand, r.btw_pct, SUM(r.totaal_incl) omzet_incl
FROM factuurregels r JOIN facturen f ON f.id = r.factuur_id
GROUP BY maand, r.btw_pct ORDER BY maand;

-- Honden die al 8 weken niet geweest zijn
SELECT h.naam, k.naam klant, k.telefoon, MAX(b.datum) laatst
FROM honden h JOIN klanten k ON k.id = h.klant_id LEFT JOIN behandelingen b ON b.hond_id = h.id AND NOT b.deleted
WHERE NOT h.deleted AND h.actief
GROUP BY h.id, h.naam, k.naam, k.telefoon HAVING MAX(b.datum) IS NULL OR MAX(b.datum) < CURRENT_DATE - INTERVAL '8 weeks';
```

## Opbouw van de bestanden

| Onderdeel | Waar | Wat het doet |
|---|---|---|
| Schermen | `public/index.html` | Alleen de opbouw van de schermen; geen logica |
| Opmaak | `public/app.css` | Kleuren, lettertypen, indeling |
| Logica | `public/js/*.js` | Per onderdeel een bestand, geladen in de volgorde van `index.html` |
| App en offline | `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` | Installeerbaar als app; bewaart de app op het apparaat zodat hij ook zonder internet start |
| Beveiligingsregels | `public/_headers` | Scripts alleen uit eigen bestanden, geen frames, gegevens alleen naar de eigen site |
| Koppelservice | `netlify/functions/*.mjs` | Database (`db.mjs`), e-mail (`mail.mjs`), herinneringen inplannen (`plan.mjs`) en versturen (`herinneringen.mjs`) |
| Database | `database/schema.sql` | Tabellen voor Aiven PostgreSQL (ter naslag; worden automatisch aangemaakt) |
| Hulpscripts | `tools/` | `build-preview.py` maakt één voorbeeldbestand voor gebruik binnen Claude; niet nodig op Netlify |

Logica in `public/js/`:

| Bestand | Inhoud |
|---|---|
| `hulp.js` | Kleine hulpfuncties: datums, bedragen, opslag, dialogen |
| `berichten.js` | Meldingen, bestanden opslaan, WhatsApp en e-mail, opgemaakte mail, dubbele boekingen |
| `gegevens.js` | Gegevensopslag, standaardinstellingen, voorbeeldgegevens |
| `navigatie.js` | Hoofdmenu en wisselen tussen schermen |
| `agenda.js` | Agenda, afspraken, slepen en duur aanpassen |
| `dialogen.js` | Klant- en hondvensters |
| `kassa.js` | Kassa, bon, afrekenen, kassabon |
| `factuur.js` | A4-factuur en restant afrekenen |
| `facturen.js` | Facturenoverzicht |
| `excel.js` | Excel-bestand maken (zonder externe bibliotheek) |
| `export.js` | Export voor de accountant |
| `klanten.js` | Klantenlijst en klantkaart |
| `beurt.js` | Weer aan de beurt: welke honden weer moeten komen |
| `artikelen.js` | Artikelen en prijzen |
| `historie.js` | Historie en behandelingen vastleggen |
| `instellingen.js` | Instellingen, logo, medewerkers, back-up |
| `sync.js` | Synchronisatie met de Aiven-database |
| `herinneringen.js` | Automatische herinneringen inplannen |
| `toegang.js` | Rollen, rechten, inloggen en vergrendelen |
| `start.js` | Start de app |

De `_headers` staan alleen verbindingen naar de eigen site toe (`connect-src 'self'`). Draait de koppelservice op een ander adres dan de app, pas dan `connect-src` aan.

## Bijwerken

Vervang in GitHub alleen de bestanden die zijn veranderd, op dezelfde plek (*Add file > Upload files*, daarna *Commit changes*). Meestal is dat één bestand in `public/js/`. Netlify zet het automatisch online; alle gegevens blijven bewaard.

## Klantberichten

WhatsApp-berichten gaan via een `wa.me`-link: WhatsApp (app of web) opent met het bericht klaar, en je verstuurt het zelf. Telefoonnummers als `06 12345678` worden automatisch omgezet naar `31612345678`. E-mail opent je eigen mailprogramma. Er is geen betaalde berichtendienst nodig.

## Opgemaakte e-mail

Zonder extra instellingen kopieert Trimmy de opgemaakte e-mail; je plakt hem in een nieuwe mail in Outlook of Gmail.

Direct versturen vanuit Trimmy gaat via `netlify/functions/mail.mjs` en een gewone SMTP-mailbox. Stel op Netlify deze variabelen in en deploy opnieuw:

| Variabele | Voorbeeld |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` · `smtp-relay.brevo.com` · de SMTP-server van je hostingpartij |
| `SMTP_PORT` | `465` (SSL) of `587` (STARTTLS) |
| `SMTP_USER` | gebruikersnaam van de mailbox |
| `SMTP_PASS` | wachtwoord; bij Gmail een *app-wachtwoord* (Google-account > Beveiliging > App-wachtwoorden, vereist 2-staps-verificatie) |
| `MAIL_FROM` | `Trimsalon Vachtwerk <info@jouwdomein.nl>` (moet bij de mailbox horen) |
| `MAIL_REPLY_TO` | optioneel antwoordadres |

Zet daarna in Trimmy bij *Instellingen > Berichten aan klanten* het vinkje *E-mail direct vanuit Trimmy versturen* aan en klik op *Testmail naar salonadres*.

Let op: bij Microsoft 365 staat SMTP-inloggen vaak standaard uit. Een mailbox van je hostingpartij of Brevo (gratis tot 300 mails per dag) werkt dan meestal makkelijker. Bij een eigen domein helpen SPF- en DKIM-records om niet in de spam te belanden.

## Weer aan de beurt

Bij *Klanten > Weer aan de beurt* staan de honden die volgens hun ritme weer moeten komen en nog geen afspraak hebben. Het menu Klanten toont hoeveel het er zijn.

- **Ritme:** een vast interval per hond (*Hond wijzigen > Trim-interval*). Is dat er niet en is de hond al minstens drie keer geweest, dan rekent Trimmy het eigen ritme van de hond uit. Anders geldt de salonstandaard (*Instellingen > Berichten aan klanten*, standaard 8 weken). Kies *Geen herinnering* voor honden die niet vast komen.
- **Per hond:** een bericht sturen via WhatsApp of e-mail (tekst instelbaar, met `{weken}` en `{laatst}`), direct inplannen, of *2 weken later* als de klant al heeft laten weten later te komen.
- Na een bericht onthoudt Trimmy dat, en de hond zakt naar onderen in de lijst. Bij een nieuwe afspraak verdwijnt de hond vanzelf van de lijst.

## Automatische herinneringen

Trimmy plant herinneringsmails in op je Netlify-server. Een geplande taak (`netlify/functions/herinneringen.mjs`) kijkt elke 10 minuten welke mails aan de beurt zijn en verstuurt ze, ook als Trimmy niet openstaat. De planning staat in Netlify Blobs, de opslag die standaard bij Netlify zit; Aiven is niet nodig.

Bestanden: `netlify/functions/plan.mjs` (inplannen), `netlify/functions/herinneringen.mjs` (versturen) en `package.json` (met `@netlify/blobs`). Gebruikt dezelfde SMTP-variabelen en `TRIMMY_CODE` als de gewone mail.

Aanzetten: *Instellingen > Berichten aan klanten > Automatische herinnering*. Kies hoe lang vooraf (2 uur tot 3 dagen) en of er 's nachts niets verstuurd mag worden. Netlify voert geplande taken alleen uit op de gepubliceerde site; in *Logs > Functions > herinneringen* zie je per run hoeveel mails zijn verstuurd.
