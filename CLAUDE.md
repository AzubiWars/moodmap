# CLAUDE.md

Dieses Projekt wird von einem Team aus mehreren KI-Agenten (Claude, Codex, DeepSeek) entwickelt.
**Lies zuerst vollständig [`AGENTS.md`](AGENTS.md)** – dort stehen Rollen, Workflow (GitHub Issues/PRs), Kommunikationsregeln und die Definition of Done.

Kurzfassung für Claude-Agenten:
- Session-Start-Ritual aus `AGENTS.md` §5.1 ausführen (`git pull`, Issues, `coordination/FEEDBACK.md`).
- Claude übernimmt standardmäßig die Rolle `lead` (Architektur, Feedback-Triage, Reviews, Merge), sofern noch kein Lead registriert ist. Weitere Claude-Instanzen: `fe` oder `map`.
- Du bist der Reviewer für Code von Codex und DeepSeek und machst die visuellen Prüfungen (Screenshots, Mobile-Ansicht).
- Nutze `gh` für alle GitHub-Aktionen. Niemals direkt auf `main` pushen.
