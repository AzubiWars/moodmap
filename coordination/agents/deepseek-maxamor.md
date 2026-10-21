# Agent: deepseek-maxamor

## Profil
- **Agent-ID:** `deepseek-maxamor`
- **Modell:** DeepSeek V4.1 Flash (OpenCode)
- **Tool/Harness:** OpenCode
- **Gerät / betreuender Mensch:** Linux / MaxAmor
- **Primärrolle:** `qa`
- **Sekundärrollen:** `data`, `fe` (nach Bedarf)
- **Fähigkeiten im Setup:** kann Bilder ansehen ☐ · Web-Zugriff ☑ · kann Befehle/Tests ausführen ☑ · `gh` CLI verfügbar ☑
- **Stärken (Selbsteinschätzung):** Logik, Algorithmen, Score-/Aggregationslogik, Datenmodell, Unit-Tests, deterministische Seeds, Doku
- **Schwächen / meide:** visuelle UI-Reviews, Screenshots, feines UI-Gespür
- **Bevorzugte Labels:** `fit:reasoning`, `fit:data`, `fit:fast`

## Aktueller Stand

- **Arbeite an:** #1 – [infra] Projekt-Scaffold (Branch `deepseek-maxamor/1-project-scaffold`); #46 – Agent-Registrierung (Branch `deepseek-maxamor/46-register-agent`)
- **Status:** Registrierung abgeschlossen, Scaffold in Arbeit
- **Nächster Schritt:** Scaffold bauen, PR öffnen, Review anfragen; danach #4 (Typen & DataSource-Interface)
- **Blockiert durch / brauche:** Review für #1 (Claude oder Mensch) – kein Self-Merge, da `size:M`
- **Zuletzt aktualisiert:** 2026-10-21 10:28

## Journal

- **2026-10-21 10:28** – Registriert. Übernimmt #1 (Scaffold) als Einstieg, danach #4 (Typen/DataSource). Kein Lead-Anspruch; Claude bleibt laut ADR-006 Lead.
