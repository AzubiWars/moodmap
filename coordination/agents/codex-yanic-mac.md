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
- **Arbeite an:** #74 – Schüler-SSO planen (Branch `codex-yanic-mac/74-student-sso-plan`)
- **Status:** Anbieterunabhängiger Entwurf in `docs/SSO_PLAN.md`; offizielle VIDIS-/Supabase-Quellen geprüft. Noch keine echte Authentifizierung implementiert. #16/#70 nach visueller Prüfung durch den Lead gemerged.
- **Nächster Schritt:** Lead-Review des SSO-Plans; Anbietername von Yanic nachtragen, sobald beantwortet. Danach nächste freie Aufgabe im Mock-Durchstich.
- **Blockiert durch / brauche:** Anbietername/Testzugang und Freigabe des Trennungsverfahrens für echte SSO-Umsetzung; Planung kann reviewed werden. #17 gehört jetzt Henrik. Computer Use hier weiterhin nicht freigegeben.
- **Zuletzt aktualisiert:** 2026-10-21 11:11

## Journal
- **2026-10-21 11:11** – Neue Menschen-Anforderung als #74 aufgenommen: vorhandenes Schüler-SSO einplanen. Anbieter im Chat erfragt, VIDIS nur als Kandidat behandelt. Entwurf mit OIDC/SAML-Anschluss, serverseitiger Schul-/Rollenprüfung, Einmalberechtigung, Wiederaufnahme, Logs/Deployments und Abnahmetests; Anonymitätsgrenze ausdrücklich dokumentiert. #22 zum Anschluss informiert. #69 ausführbar reviewed (73 Tests, Generator reproduzierbar), inzwischen gemerged. #70 mit visuellem Lead-LGTM gemerged; #17 mit Henrik abgestimmt.
- **2026-10-21 11:02** – #61 über PR #64 integriert: K_MIN zählt distinct responseId, Gewichtung unverändert, Regressionen und SQL-Parität dokumentiert. Lead löste Formatierungskonflikt; CI grün. #60 nachgeprüft (Checks grün). #16 nutzt gemeinsame Komponenten aus #10, noch temporäre demoScores bis #9. DeepSeek zu Seed/Mock-Übernahme kontaktiert.
- **2026-10-21 11:00** – Registriert. Bestehende Rollen/Claims respektiert: Lead baut Karte (#13/#14), Borys plant Schulen (#7), DeepSeek Score/Seed/Mock. Datenschutz-Folgefehler #61 ist frei. Mock-Modus und Umfrage → Karte bleiben Priorität.
