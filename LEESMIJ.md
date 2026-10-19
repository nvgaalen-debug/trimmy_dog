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
3. Ga naar **Instellingen > Koppelingen** en vul in: `https://jouw-trimmy.netlify.app/api/db?code=JOUW_TRIMMY_CODE`. Klik op **Verbinding testen**. Trimmy bewaart dit adres alleen op het apparaat zelf. Bij elke opvraging haalt de app de code uit het adres en stuurt hem mee als header `X-Trimmy-Code`, zodat hij niet in serverlogs of de browsergeschiedenis terechtkomt. Het adres met `?code=` werkt nog als terugval, bijvoorbeeld voor de test in stap 4.
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
| Koppelservice | `netlify/functions/*.mjs` | Database (`db.mjs`), e-mail (`mail.mjs`), herinneringen inplannen (`plan.mjs`) en versturen (`herinneringen.mjs`), klantportaal (`portaal.mjs`) |
| Klantportaal | `public/portaal.html`, `portaal.js`, `portaal.css` | Losse pagina voor klanten op `/portaal` |
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
| `platform.js` | Inloggen met een account, apparaten, eigen logins voor medewerkers, abonnement |
| `sjabloon.js` | Sjablonen per branche: woorden, velden, standaardteksten, app-naam |
| `thuis.js` | Startscherm: tegels per onderdeel met de belangrijkste cijfers, en de afspraken van vandaag |
| `avg.js` | Gegevens van één klant exporteren en oude klantgegevens opruimen (AVG) |
| `berichtenbox.js` | Berichten uit het klantportaal lezen en beantwoorden |
| `dashboard.js` | KPI-dashboard met interactieve grafieken (Beheer) |
| `rooster.js` | Werktijden per medewerker |
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

## Dashboard

*Beheer > Dashboard* laat zien hoe de salon draait. Alleen voor de beheerder, of voor medewerkers met het recht *Dashboard, omzetcijfers en export*.

- **Tegels**: omzet, afspraken en nieuwe klanten deze maand (vergeleken met dezelfde dagen vorige maand), bezetting, hoeveel bezoeken binnen het eigen ritme van de hond vallen, en hoeveel honden opgevolgd moeten worden. Klik op een tegel voor de bijbehorende grafiek.
- **Grafieken**: omzet per maand (met het jaar ervoor als stippellijn zodra daar genoeg gegevens voor zijn), afspraken per maand, nieuwe en terugkerende klanten, populairste behandelingen (omzet of aantal), drukte per weekdag en omzet per medewerker.
- **Interactief**: beweeg over een grafiek voor de precieze waarden; klik op een maand voor de details van die maand (met knoppen naar de agenda en facturen); klik op een behandeling of medewerker om het hele dashboard daarop te filteren. Filters staan als knopjes bovenaan en gaan weg met het kruisje. Periode: deze of vorige week (per dag), deze of vorige maand (per dag), laatste 12 maanden, dit jaar of vorig jaar (per maand). De tegels volgen de gekozen periode en vergelijken met dezelfde dagen van de periode ervoor.
- Elke grafiek heeft een knop *Tabel* met de cijfers.
- **Agenda-bezetting** = geboekte uren gedeeld door beschikbare uren (de werktijden van de medewerkers; wie geen werktijden heeft, telt mee met alle openingsuren). De tegel toont ook de uren ("20 van 540 beschikbare uren geboekt") en de **uitgevoerde** bezetting: alleen afgerekende afspraken tot en met vandaag.
- Alles wordt berekend uit de gegevens die al op het apparaat staan; er gaat niets extra's over internet.

## Werktijden per medewerker

*Instellingen > Medewerkers en toegang > Werktijden*: kies per dag of iemand werkt en van hoe laat tot hoe laat (bijvoorbeeld ma–do 9:00–17:00). Zonder werktijden werkt iemand alle openingsuren.

- De agenda toont de tijden waarop iemand niet werkt gearceerd (dagweergave, of weekweergave met één medewerker gekozen).
- Plan je iemand in buiten zijn werktijden, dan waarschuwt het afspraakvenster ("Joris werkt niet op vrijdag").
- Het dashboard rekent de beschikbare uren met deze werktijden, zodat de bezetting klopt.

## Automatisch vergrendelen

Bij *Instellingen > Medewerkers en toegang > Automatisch vergrendelen* kies je na hoeveel minuten zonder activiteit Trimmy vergrendelt (standaard: nooit). Tikken, klikken, typen, scrollen en de muis bewegen tellen als activiteit, ook in een ander venster van Trimmy op hetzelfde apparaat. Een minuut van tevoren verschijnt de melding *Trimmy vergrendelt over een minuut* met de knop *Ingelogd blijven*. Was de app een tijd weg (iPhone op slot, ander programma), dan vergrendelt hij bij terugkomst direct als de tijd verstreken is.

## Klantportaal

Klanten kunnen op `https://jouw-trimmy.netlify.app/portaal` inloggen en zien daar **alleen hun eigen** gegevens: honden, komende afspraken, historie, facturen (bekijken, printen of als pdf opslaan) en openstaande bedragen. Ze kunnen hun telefoon en adres aanpassen en de salon een bericht sturen.

**Aanzetten**
1. Database aan (Aiven) en *E-mail direct vanuit Trimmy versturen* aan: de inlogcodes gaan per mail.
2. *Instellingen > Berichten aan klanten > Klantportaal aanzetten* en opslaan.
3. Netlify: de site moet openbaar zijn (bij *Private* moeten klanten eerst bij Netlify inloggen). Zet bij voorkeur ook een eigen geheime sleutel: `PORTAAL_SECRET` = een lange willekeurige tekst (secret), en deploy opnieuw.
4. Nodig klanten uit vanaf de klantkaart met de knop *Klantportaal* (WhatsApp of e-mail). Bij de klant moet het e-mailadres ingevuld zijn.

**Berichten**: nieuwe berichten verschijnen in Trimmy bij *Berichten* (met teller en een seintje); je krijgt ook een mailtje. Antwoord je, dan ziet de klant dat in het portaal en krijgt hij een mailtje. Wijzigt een klant zijn telefoon of adres, dan zie je dat als bericht en staat het direct op de klantkaart.

Het berichtenoverzicht zet gesprekken met nieuwe berichten bovenaan onder **Nieuw** (vet, met een rood bolletje en het aantal). Filter met *Alle*, *Nieuw* of *Te beantwoorden* (de klant heeft als laatste iets gestuurd). Een gesprek telt pas als gelezen als je het zelf aanklikt; in het gesprek staat een streep *Nieuw* boven de nieuwe berichten. Met *Markeer als ongelezen* zet je een gesprek terug om het later af te handelen, met *Alles gelezen* wis je alle tellers in één keer. Bij elk antwoord staat wie het stuurde: de ingelogde medewerker, of (zonder inloggen) wie je kiest bij *Beantwoord door*. De klant ziet in het portaal bijvoorbeeld *Joris, Trimsalon Joris*. Oudere antwoorden zonder naam tonen *Salon*.

**Wat de klant wel en niet ziet**
- Wel: naam, adres, telefoon, e-mail; per hond naam, ras, leeftijd, geslacht, gewicht, vacht, kleur, chip, foto; afspraken (datum, tijd, behandeling); historie (datum, behandeling, mesje/techniek, vachtconditie en de *notitie voor de klant*); facturen en betalingen.
- Nooit: interne notities, gedrag en medische notities, notities bij afspraken, andere klanten, medewerkers, omzet of instellingen.
- Bij een behandeling (Historie > Behandeling vastleggen) staan nu twee velden: *Interne notitie* (alleen salon) en *Notitie voor de klant* (zichtbaar in het portaal).

**Beveiliging**
- Inloggen met een eenmalige code van 6 cijfers per e-mail, 10 minuten geldig, maximaal 5 pogingen; maximaal 3 codes per e-mailadres per kwartier en 10 per internetadres per uur.
- Het portaal verraadt niet of een e-mailadres bekend is.
- Codes en sessies staan alleen versleuteld (gehasht) in de database. De sessie is een beveiligde cookie (HttpOnly, Secure, SameSite=Strict) die 60 dagen geldig blijft, tot de klant uitlogt.
- De server filtert elke opvraging op het e-mailadres van de ingelogde klant. Horen meerdere klanten bij hetzelfde e-mailadres (bijvoorbeeld een gezin), dan kiest de klant bovenaan welke klant hij bekijkt; gegevens, honden, afspraken, facturen en berichten gaan dan alleen over die klant. Trimmy waarschuwt als je een e-mailadres invult dat al bij een andere klant staat. Een klant kan zijn e-mailadres niet zelf wijzigen; dat doe jij in Trimmy (daarmee vervalt ook de toegang via het oude adres).
- Het portaal heeft geen toegang tot de koppelservice van de app; de `TRIMMY_CODE` staat nergens in het portaal.

## Privacyverklaring

Het klantportaal heeft een privacyverklaring op `/portaal#privacy`. Klanten zien de link bij het inloggen en onderaan elke pagina, ook zonder in te loggen. De tekst is in gewone taal geschreven en volgt de AVG: wie verantwoordelijk is, welke gegevens, waarvoor, hoe lang, wie ze ziet, beveiliging, cookies, rechten en klachten.

Trimmy vult de naam, het adres, KvK, telefoon en e-mail van de salon zelf in. Per salon stel je bij *Instellingen > Berichten aan klanten > Privacyverklaring* in:
- het e-mailadres voor privacyvragen (leeg = salonadres);
- hoe lang klantgegevens na het laatste bezoek bewaard blijven (facturen altijd 7 jaar);
- welke dienstverleners gegevens verwerken (standaard Netlify, Aiven en de e-mailprovider);
- eventueel een aanvullende tekst, bijvoorbeeld over foto's op social media.

De datum *bijgewerkt op* zet Trimmy zelf zodra je hier iets wijzigt. Let op: wat er staat moet ook kloppen. Sluit verwerkersovereenkomsten af met Netlify, Aiven en je e-mailprovider, en verwijder oude klanten echt na de ingestelde termijn.

## AVG: inzage en opruimen

**Inzageverzoek.** Vraagt een klant welke gegevens je van hem hebt, open dan de klant en kies *Gegevens exporteren*. Je krijgt één html-bestand met alles over de klant en zijn honden: gegevens, afspraken, behandelingen en notities, facturen en berichten. Het opent in elke browser, is te printen, en bevat onderaan dezelfde gegevens als JSON (om over te zetten naar een andere salon). Stuur het naar de klant, liefst via een beveiligde weg.

**Opruimen.** Bij *Instellingen > Gegevens en apparaat > Privacy (AVG)* zie je hoeveel klanten langer dan de bewaartermijn niet zijn geweest. *Oude klantgegevens opruimen* toont de lijst:
- klanten zonder facturen worden helemaal verwijderd, met honden, afspraken, behandelingen en berichten;
- bij klanten met facturen blijven alleen naam en adres (die staan op de factuur, en facturen moeten 7 jaar blijven). Honden blijven alleen met naam en ras, alles daarnaast gaat weg. Zulke klanten staan niet meer in de klantenlijst, maar zijn nog te vinden met zoeken.

"Laatste contact" is de jongste afspraak, behandeling, factuur of bericht. Doe dit bijvoorbeeld elk kwartaal.

**Verwijderen is echt verwijderen.** Verwijder je iets in Trimmy, dan wist de database de inhoud (de JSON en de leesbare kolommen). Alleen een lege regel met het id en `deleted = true` blijft over, zodat andere apparaten het verwijderen overnemen. Records die al eerder waren verwijderd, worden bij de volgende start van de koppelservice ook leeggemaakt. Facturen worden nooit verwijderd.

## Platform: meerdere salons vanuit één omgeving

Eén Netlify-site en één database voor alle salons. Elke salon heeft een **eigen schema** in de database (strikt gescheiden), eigen accounts, eigen apparaten, een eigen klantportaal en een eigen abonnement. Jij beheert alles via **/beheer**.

### Eenmalig instellen
1. **Aiven** (als avnadmin): `GRANT CREATE ON DATABASE defaultdb TO trimmy_app;` Hiermee mag de app per salon een schema en het platform-schema aanmaken.
2. **Netlify > Environment variables** (naast de bestaande):

| Variabele | Waarde |
|---|---|
| `BEHEER_CODE` | lange geheime code voor /beheer (alleen voor jou) |
| `PLATFORM_SECRET` | lange willekeurige tekst (ondertekent de beheer-sessie) |
| `MOLLIE_API_KEY` | `test_…` om te testen, later `live_…` (Mollie-dashboard > Developers > API-keys) |
| `ABONNEMENT_PRIJS` | standaardprijs per maand, bv. `19.95` (per salon aan te passen in /beheer) |
| `PLATFORM_NAAM` | naam in mails en op afschriften, bv. `Trimmy` |
| `APP_URL` | pas nodig met een eigen domein, bv. `https://app.jouwdomein.nl` |

3. Deploy opnieuw en open `/beheer`.

### Een salon aanmelden
In /beheer: **Nieuwe salon**. Kies naam, branche, eigenaar en e-mail, status (proef of actief), einddatum van de proef en prijs. De eigenaar krijgt een mail met een activatielink (7 dagen geldig); lukt mailen niet, dan toont /beheer de link om zelf door te geven. Bij de eerste keer inloggen zet de app de eigenaar als medewerker en de standaardbehandelingen van de branche klaar.

### Inloggen
- De **eigenaar** logt in met e-mail en wachtwoord. Elk apparaat wordt gekoppeld (een jaar, intrekbaar bij *Instellingen > Koppelingen*). Afmelden wist de salongegevens van dat apparaat.
- **Medewerkers** krijgen een eigen login: *Instellingen > Medewerkers en toegang > Eigen login* (e-mailadres). Ze loggen zelf in op telefoon of computer; de app weet dan wie er werkt. De server weigert dat een medewerker medewerkers, rollen of pincodes wijzigt. Intrekken kan op dezelfde plek, ook op al hun apparaten tegelijk.
- **Wachtwoord vergeten** staat op het inlogscherm (link 2 uur geldig).
- Een **nieuw wachtwoord** meldt alle oude apparaten van dat account af.

### Abonnement via Mollie
- De eigenaar ziet bij *Instellingen > Koppelingen > Abonnement* de status en kan het **starten**: de eerste maand via iDEAL of creditcard, daarmee ook de machtiging. Daarna maakt de app automatisch een maandelijkse incasso aan.
- Mollie meldt elke betaling bij `/api/mollie`; de app vraagt de status altijd zelf bij Mollie op (een vervalste melding doet niets).
- **Proef verlopen** of **abonnement beëindigd**: de salon kan niet meer inloggen of synchroniseren, maar de eigenaar kan het abonnement starten. **Mislukte incasso**: twee weken respijt, daarna geblokkeerd tot de betaling rond is.
- **Opzeggen** kan altijd; toegang loopt door tot de betaalde datum.
- In /beheer zie je per salon de status, betaling, het gebruik, en zet je een salon handmatig op actief, proef of geblokkeerd.

### Support: meekijken in een salon
In /beheer staat bij elke salon de knop **Support**. Kies **Meekijken** (alleen lezen: de server weigert elke wijziging) of **Volledige toegang** (wijzigingen worden opgeslagen) en geef een reden op. De app van die salon opent dan in een nieuw tabblad, 2 uur lang, met bovenin een balk *Supportmodus* en de knop *Support stoppen*.
- Support kan nooit het abonnement, de accounts of de apparaten van de salon beheren.
- Support werkt ook bij een geblokkeerde salon, zodat je kunt helpen.
- De eigenaar ziet bij *Instellingen > Koppelingen > Supporttoegang* elke sessie (soort, reden, van–tot) en kan supporttoegang uitzetten; een lopende sessie stopt dan meteen.
- De supportsessie vervangt een eigen salonlogin in dezelfde browser. Gebruik voor support daarom een apart browserprofiel.
- Vastleggen in je verwerkersovereenkomst/voorwaarden dat support op verzoek van de salon kan meekijken.

### Klantportaal per salon
Het portaal staat op `/portaal?s=<korte-naam>`. De app gebruikt die link zelf in berichten, en /beheer toont hem bij **Portaallink**.

### Je eigen Trimmy overzetten
1. /beheer > Nieuwe salon, vul bij **Bestaand schema** `trimmy` in (het schema dat je nu gebruikt). Er wordt niets gekopieerd of gewist.
2. Activeer je account via de mail.
3. Op elk apparaat verschijnt bij *Instellingen > Koppelingen* de knop om over te stappen op inloggen. Daarna is de code niet meer nodig. Zodra alle apparaten over zijn, kun je `TRIMMY_CODE` verwijderen; de oude manier blijft tot dan gewoon werken.

### Eigen domein
Koppel het domein in Netlify (*Domain management*) en zet `APP_URL` op het nieuwe adres (en eventueel `TRIMMY_ORIGIN`). Links in mails en de Mollie-meldingen gebruiken dan het nieuwe adres. Apparaten moeten op het nieuwe adres één keer opnieuw inloggen, omdat de koppeling bij het webadres hoort. Laat het oude Netlify-adres doorverwijzen naar het nieuwe.

### Beveiliging in het kort
Wachtwoorden met scrypt; inlogtokens en uitnodigingslinks alleen gehasht in de database; cookies HttpOnly, Secure en SameSite=Strict; maximaal 5 inlogpogingen per e-mailadres per kwartier en 30 per IP per uur; gelijke antwoorden bij onbekende e-mailadressen; elke salon in een eigen schema; een nieuw salonschema mag nog niet bestaan (geen per ongeluk gekoppelde oude gegevens).

## Sjablonen per branche (trimsalon, nagelstudio, …)

Eén app, meerdere branches. Het sjabloon staat in `public/js/sjabloon.js` en bepaalt:
- de **woorden** (hond, trimbeurt, Weer aan de beurt, Hond is binnen …) en de **app-naam** (Trimmy, Nailly);
- of er een **apart onderwerp** is (een hond per klant) of dat de **klant zelf** het onderwerp is. Zonder onderwerp maakt de app per klant één onzichtbaar record (`s_<klant-id>`) aan, zodat agenda, kassa, historie en "aan de beurt" ongewijzigd werken;
- de **dossiervelden** op de klantkaart (nagelstudio: natuurlijke nagels, vorm, lengte, opvulritme, vaste kleuren, allergie);
- de **velden bij een behandeling**, bij afrekenen en in de historie (trimsalon: mesje, vacht, gedrag; nagelstudio: techniek, vorm, kleur, nail art);
- de **standaardteksten** voor berichten, de factuurvoet, het standaardritme (8 of 3 weken) en de **voorbeeldgegevens**.

Kiezen: *Instellingen > Salon > Branche*. De keuze hoort bij de salon en gaat mee naar alle apparaten. Teksten die je zelf hebt aangepast, blijven staan. **Per Netlify-site vastleggen:** zet bij de site in Netlify de omgevingsvariabele `TRIMMY_SJABLOON` (bijvoorbeeld `nagelstudio`) en publiceer opnieuw. Bij het publiceren maakt `tools/site.mjs` dan `public/js/site.js` aan, zodat de app vanaf de allereerste start in die branche opent (ook offline), en krijgt de installeerbare app de juiste naam en kleur. Het klantportaal gebruikt dezelfde instelling. Een keuze die de salon zelf maakt bij Instellingen gaat voor. Zonder `TRIMMY_SJABLOON` is het gewoon Trimmy.

**Eén algemene naam voor alle salons:** zet in Netlify `PLATFORM_NAAM` (bijvoorbeeld `Salonplanner`) en publiceer opnieuw. Die naam vervangt dan Trimmy en Nailly overal: inlogscherm, kop van de app, naam en icoon op het beginscherm (een neutraal kalendericoon), tabbladtitel, uitnodigingsmails en de omschrijving bij Mollie. De branche blijft per salon bepalen welke woorden en velden de app gebruikt. Apparaten die de app al geïnstalleerd hadden, houden het oude icoon tot ze de app opnieuw toevoegen aan het beginscherm.

Een demo bekijken kan met `?sjabloon=nagelstudio` achter het adres (alleen zolang je voorbeeldgegevens gebruikt).

Het klantportaal volgt het sjabloon ook: bij een nagelstudio geen hondentegel, en de privacyverklaring spreekt over voorkeuren en een eventuele allergie in plaats van over een hond. De allergie is een gezondheidsgegeven en gaat nooit naar het portaal.

Een nieuw sjabloon toevoegen = een blok in `SJABLONEN` (woorden, velden, teksten), eventueel een functie voor voorbeeldgegevens in `gegevens.js`, en vervangingen voor vaste paginateksten in `SJ_VERVANG`.

## Lettertypen

Trimmy en het portaal laden geen lettertypen meer van Google (dat stuurt het IP-adres van elke bezoeker naar Google). Zet de lettertypen zelf in `public/fonts/`:
1. Download *Figtree* en *Gabarito* op fonts.google.com (knop *Get font*, dan *Download all*).
2. Pak de zips uit en kopieer `Figtree-VariableFont_wght.ttf` en `Gabarito-VariableFont_wght.ttf` naar `public/fonts/`.
Zonder deze bestanden werkt alles gewoon, met het systeemlettertype.

## Automatische herinneringen

Trimmy plant herinneringsmails in op je Netlify-server. Een geplande taak (`netlify/functions/herinneringen.mjs`) kijkt elke 10 minuten welke mails aan de beurt zijn en verstuurt ze, ook als Trimmy niet openstaat. De planning staat in Netlify Blobs, de opslag die standaard bij Netlify zit; Aiven is niet nodig.

Bestanden: `netlify/functions/plan.mjs` (inplannen), `netlify/functions/herinneringen.mjs` (versturen) en `package.json` (met `@netlify/blobs`). Gebruikt dezelfde SMTP-variabelen en `TRIMMY_CODE` als de gewone mail.

Aanzetten: *Instellingen > Berichten aan klanten > Automatische herinnering*. Kies hoe lang vooraf (2 uur tot 3 dagen) en of er 's nachts niets verstuurd mag worden. Netlify voert geplande taken alleen uit op de gepubliceerde site; in *Logs > Functions > herinneringen* zie je per run hoeveel mails zijn verstuurd.
