# Beamer-Live-Ansicht (#116)

`/demo/live` zeigt ausschließlich den isolierten Teststandort: große Teilnahmezahl, Gesamtstimmung,
die drei niedrigsten Themenwerte, Karte, Teilnahme-QR und bis zu drei moderierte Cluster mit je
höchstens zwei bereinigten Beispielen. Der QR verwendet den konfigurierten Code aus dem Backend.
Die Route lädt die Karte erst bei Bedarf und hat eine eigene Ansicht ohne Hauptnavigation.

## Vorführen

1. Auf `/demo` den Abschnitt **Pitch-Live-Test** öffnen. Der QR in diesem Abschnitt gehört zur
   Pitch-Runde; der darunter stehende normale Demo-Schul-QR bleibt ein separater Einstieg.
2. **Beamer-Ansicht öffnen**, Browser bei 1920×1080 im Vollbild anzeigen. Mit dem Theme-Schalter
   hell/dunkel wählen. Die Standortangaben müssen vorher mit den Menschen geklärt sein (#118).
3. QR scannen → Mood-Check → abgeben. Nur der Beamer pollt Pitch-Aggregat und Cluster alle
   **2,5 Sekunden**. Lokale Änderungen lösen zusätzlich ein Refetch aus.
4. Vor K_MIN bleibt die Stimmung verdeckt: „Noch X Stimmen bis zur ersten Auswertung“.
   Maßgeblich sind **gewertete** Teilnahmen (`scoredN`); der Zähler enthält auch reine
   „Weiß nicht“-/Choice-Abgaben. Einzelne Themen/Cluster bleiben unter ihrer Mindestanzahl verborgen.
5. **Pitch-Test zurücksetzen** auf `/demo` oder unter dem Beamer → Admin-PIN eingeben →
   **Pitch-Runde endgültig löschen**. Nur die Test-Runde wird gelöscht, NRW-Daten bleiben bestehen.
   Danach werden beide Auswertungen neu geladen; dieselben Geräte können erneut abstimmen.

Live über verschiedene Handys braucht Supabase und die Edge-Deployments/Secrets aus #118.
Der Mock ist auf der Seite ausdrücklich als **lokale Demo** gekennzeichnet: Daten werden nur
zwischen Tabs desselben Browserprofils geteilt, Cluster bleiben leer, Reset ohne echte PIN-Auth.
So lässt sich der Zähler ohne Backend proben, ohne geräteübergreifendes Live zu behaupten.

Bei Abrufproblemen erscheint ein Fehlerhinweis. Bereits geladene Werte sind als letzter
erfolgreicher Stand erkennbar; es gibt keinen stillen Wechsel von Live auf Demo-Werte.
Fehlt der Teilnahme-Code, wird kein erfundener QR angezeigt. Ohne Basiskarte bleibt die
Auswertung nutzbar, die Karte kennzeichnet den fehlenden Hintergrund.

## Abnahme

Funktionale UI-Tests prüfen 9/10 gewertete Stimmen, Polling, konfigurierte QR-Links, Clustergrenze,
Textdarstellung der Beispiele sowie erfolgreichen/abgewiesenen Reset und PIN-Minimierung.
Die Karte ist im jsdom-Test ersetzt; diese Tests belegen keine WebGL-/Darstellungsprüfung.

Vor Merge visuell prüfen: **375 px und 1920×1080**, hell/dunkel, 0/9/10/200 Teilnahmen,
lange Cluster-Namen, QR scannbar, unterbrochene Verbindung, Karten-Fallback und PIN-Formular.
Screenshots im PR ablegen. Der tatsächliche 200-Personen-Lauf und die flüssige Beamer-Darstellung
unter Last bleiben eine eigene Abnahme: [PITCH_LOADTEST.md](PITCH_LOADTEST.md), #117.
