# Agent: codex-yanic-mac

## Profil
- **Agent-ID:** `codex-yanic-mac`
- **Modell:** Codex (GPT-6)
- **Tool/Harness:** Codex
- **Gerät / betreuender Mensch:** Mac / Yanic (GitHub: Yanic207)
- **Primärrolle:** `data` – Backend & Daten
- **Sekundärrollen:** `qa`, ausführbare Reviews, `map`
- **Fähigkeiten im Setup:** kann Bilder ansehen ☑ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** TypeScript, Datenlogik, SQL, Tests, ausführbare Reviews, kleine zuverlässige Umsetzungsschritte
- **Schwächen / meide:** Produkt-/Architekturentscheidungen ohne Abstimmung; keine parallele Arbeit an fremden Claims
- **Bevorzugte Labels:** `fit:data`, `fit:reasoning`, `fit:fast`, `fit:ui`

## Aktueller Stand
- **Arbeite an:** #35 – Darkmode, auf ausdrücklichen Wunsch von Yanic (Branch `codex-yanic-mac/35-dark-mode`).
- **Status:** Header-Schalter, System-Voreinstellung, lokale Persistenz/Tab-Synchronisierung und dunkle Tokens/MapLibre-Basiskarte implementiert. Vollständige Checks laufen vor dem PR.
- **Nächster Schritt:** Lead-Rebase/Review mit Mobile-/Desktop-Sichtprüfung, da Browserzugriff hier automatisch abgelehnt wurde.
- **Blockiert durch / brauche:** Rebase auf neues main kollidiert mit #18 in MoodMap (Import und Props-Destrukturierung); gemäß AGENTS übernimmt Lead den Konflikt. Header muss ThemeToggle und bereits gemergten RoleSwitcher behalten, MapPage/TopicFilter semantisch einfärben.
- **Zuletzt aktualisiert:** 2026-10-21 11:59

## Journal
- **2026-10-21 11:59** – #9/PR #95 ist gemerged. #19 wegen neuer Lead-Zuteilung an Henrik ohne Code zurückgegeben; NRW-Aggregationslücke im Issue dokumentiert. #68 zunächst geclaimt, auf Yanics Wunsch zugunsten #35 ohne Code wieder freigegeben (Henrik übernimmt nun #68). #106 auf Reset-Präfixfehler hingewiesen. #35 implementiert, erste 10 relevante Tests grün, vollständige Checks vor PR. Darkmode-Sichtprüfung beim Lead angefragt.
- **2026-10-21 11:42** – PR #95 fertig zur Review, alle 189 Tests und Mock-Build grün; auch CI und Vercel erfolgreich. Lead um Review inkl. count-null-Vertrag gebeten, #9 und #30 mit Integrationshinweisen aktualisiert. PR #99 (Darkmode-Feedback FB-004) gemerged. UI-Tickets bleiben offen; keine vollständige Demo-Prüfung behauptet.
- **2026-10-21 11:39** – #9 vollständig gegen Seed aus #88 integriert: keine seed.json-Auslieferung, Geräte-Token aus Seed verworfen, Hash/Datum minimiert persistiert. Tests prüfen Grenzwerte, direkte Aggregation, Reload, Einmaligkeit, Fehler/Skips, Tab-Events sowie Radar/Policy-Methoden. SSO #83 ist gemerged. Yanics Feedback „Darkmode“ wörtlich als FB-004 in PR #99 ergänzt und #35 informiert; keine eigenmächtige Priorisierung. Echte Stammdaten aus #100 erfordern spätere konsistente Seed-/Demo-ID-Integration, #9 bleibt beim vereinbarten synthetischen Datensatz.
- **2026-10-21 11:25** – #9 auf Lead-Auftrag übernommen, parallel zu #8 gegen Fixtures. Aggregationen zählen unterschiedliche Teilnahmen, filtern vor K_MIN und berechnen direkt über Antworten statt Schul-Mittelwerte. Blockierenden Wellen-Datumsfehler in #88 gemeldet; vom Lead behoben. Benutzer-SSO als Plan (#83) gemerged, keine Runtime-Auth eingeführt.
- **2026-10-21 11:11** – Neue Menschen-Anforderung als #74 aufgenommen: vorhandenes Schüler-SSO einplanen. Anbieter im Chat erfragt, VIDIS nur als Kandidat behandelt. Entwurf mit OIDC/SAML-Anschluss, serverseitiger Schul-/Rollenprüfung, Einmalberechtigung, Wiederaufnahme, Logs/Deployments und Abnahmetests; Anonymitätsgrenze ausdrücklich dokumentiert. #22 zum Anschluss informiert. #69 ausführbar reviewed (73 Tests, Generator reproduzierbar), inzwischen gemerged. #70 mit visuellem Lead-LGTM gemerged; #17 mit Henrik abgestimmt.
- **2026-10-21 11:02** – #61 über PR #64 integriert: K_MIN zählt distinct responseId, Gewichtung unverändert, Regressionen und SQL-Parität dokumentiert. Lead löste Formatierungskonflikt; CI grün. #60 nachgeprüft (Checks grün). #16 nutzt gemeinsame Komponenten aus #10, noch temporäre demoScores bis #9. DeepSeek zu Seed/Mock-Übernahme kontaktiert.
- **2026-10-21 11:00** – Registriert. Bestehende Rollen/Claims respektiert: Lead baut Karte (#13/#14), Borys plant Schulen (#7), DeepSeek Score/Seed/Mock. Datenschutz-Folgefehler #61 ist frei. Mock-Modus und Umfrage → Karte bleiben Priorität.
