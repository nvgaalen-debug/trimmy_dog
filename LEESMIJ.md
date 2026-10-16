# Trimmy installeren met Aiven

Trimmy is één webpagina (`public/index.html`) plus een kleine koppelservice (`netlify/functions/db.mjs`) die de gegevens in je Aiven MySQL-database bewaart. Elke soort gegevens heeft een eigen tabel.

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

## 1. Database aanmaken in Aiven

1. Maak in console.aiven.io een **Aiven for MySQL**-service aan (het gratis plan is genoeg om te beginnen; kies regio Europa).
2. Open de service en noteer op het tabblad *Overview* de **Service URI** en download het **CA certificate** (`ca.pem`).
3. Open *Query editor* (of verbind met een MySQL-client) en voer de inhoud van `database/schema.sql` uit.

## 2. Op Netlify zetten

1. Zet deze map in een GitHub-repository en koppel die in Netlify als nieuwe site (of sleep de map naar Netlify Drop en voeg daarna de functie toe via de CLI: `netlify deploy --prod`).
2. Stel bij *Site configuration > Environment variables* in:
   - `AIVEN_MYSQL_URI` = de Service URI uit stap 1
   - `AIVEN_CA_CERT` = de volledige inhoud van `ca.pem` (inclusief de BEGIN/END-regels)
   - `TRIMMY_CODE` = een lange, zelfgekozen geheime code
   - `TRIMMY_ORIGIN` (optioneel) = het adres van je site, bijvoorbeeld `https://jouw-trimmy.netlify.app`
3. Deploy opnieuw zodat de variabelen actief worden.

## 3. Trimmy koppelen

1. Open Trimmy op je eigen Netlify-adres. Daar werkt ook printen en pdf maken van kassabon en factuur.
2. Ga naar **Instellingen > Bedrijfsgegevens** en geef elk apparaat een eigen **Kassa-ID** (K1, K2, …). Zo krijgen facturen nooit hetzelfde nummer.
3. Ga naar **Instellingen > Database (Aiven)** en vul in: `https://jouw-trimmy.netlify.app/api/db?code=JOUW_TRIMMY_CODE`
4. Vink *Gegevens bewaren in de Aiven-database* aan. Het bolletje rechtsboven wordt groen zodra de eerste synchronisatie klaar is.

Wis eerst de voorbeeldgegevens (knop bovenaan) voordat je de database aanzet, anders komen de verzonnen klanten ook in Aiven.

## Hoe de synchronisatie werkt

- Trimmy werkt altijd eerst op het apparaat zelf, ook als internet of de database even weg is.
- Elke wijziging gaat binnen een paar seconden naar Aiven, en elke minuut haalt Trimmy wijzigingen van andere apparaten op.
- Facturen worden in de database nooit verwijderd. Andere records krijgen bij verwijderen `deleted = 1`.
- De kolom `data` bevat steeds het volledige record als JSON; de andere kolommen zijn leesbare kopieën om in SQL mee te werken.

## Voorbeeldquery's

```sql
-- Wanneer was Bobbie voor het laatst en met welk mesje?
SELECT datum, behandelingen, mesje_techniek, notitie FROM v_hond_historie WHERE hond = 'Bobbie' ORDER BY datum DESC;

-- Omzet per maand per btw-tarief
SELECT DATE_FORMAT(f.datum,'%Y-%m') maand, r.btw_pct, SUM(r.totaal_incl) omzet_incl
FROM factuurregels r JOIN facturen f ON f.id = r.factuur_id
GROUP BY maand, r.btw_pct ORDER BY maand;

-- Honden die al 8 weken niet geweest zijn
SELECT h.naam, k.naam klant, k.telefoon, MAX(b.datum) laatst
FROM honden h JOIN klanten k ON k.id = h.klant_id LEFT JOIN behandelingen b ON b.hond_id = h.id AND b.deleted = 0
WHERE h.deleted = 0 AND h.actief = 1
GROUP BY h.id HAVING laatst IS NULL OR laatst < CURDATE() - INTERVAL 8 WEEK;
```
