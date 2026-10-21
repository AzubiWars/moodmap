const SECTIONS = [
  {
    title: 'Was wir speichern',
    intro: 'Das brauchen wir, damit die Auswertung funktioniert:',
    items: [
      'Deine Schule, bei der du mitmachst.',
      'Deine grobe Stufe, zum Beispiel 8–10 oder Oberstufe.',
      'Deine Antworten auf die Fragen.',
      'Den Tag, an dem du mitgemacht hast. Nicht die genaue Uhrzeit.',
      'Ein zufälliges Gerätekennzeichen. Was das ist, steht weiter unten.',
    ],
  },
  {
    title: 'Was wir nie speichern',
    intro: 'Diese Dinge fragen wir nicht ab und speichern wir nicht:',
    items: [
      'Deinen Namen.',
      'Deine E-Mail-Adresse.',
      'Deine IP-Adresse. Sie zeigt, von welchem Netz aus du kommst.',
      'Deine genaue Klasse, zum Beispiel 9b.',
      'Deine genaue Uhrzeit.',
      'Deinen Standort.',
      'Freie Texte, die du schreibst. Den Originaltext speichern wir nie.',
      'Tracking-Cookies oder Werbe-Tracker. Wir verfolgen dich nicht.',
    ],
  },
  {
    title: 'Warum dich niemand erkennen kann',
    intro: 'Wir zeigen nie deine Antwort, sondern nur Zusammenfassungen.',
    items: [
      'Ein Ergebnis gibt es erst, wenn mindestens 10 Schüler:innen mitgemacht haben.',
      'Vorher steht dort „zu wenige Daten“. Dann siehst du keine Zahl.',
      'Auch mit Filtern lässt sich so nicht herausfinden, wer was geantwortet hat.',
      'Auch im Ministerium sieht niemand deine einzelne Antwort.',
    ],
  },
  {
    title: 'Was das Gerätekennzeichen ist',
    intro: 'Das Gerätekennzeichen sorgt dafür, dass ein Gerät nur einmal pro Mood-Check mitmacht.',
    items: [
      'Dein Browser bekommt beim ersten Mal eine zufällige Nummer. Sie ist nur auf deinem Gerät gespeichert.',
      'Die Nummer hat keinen Bezug zu deinem Namen und sagt nichts über dich.',
      'Auf dem Server speichern wir nur eine verschlüsselte Form davon („Hash“), nicht die Nummer selbst.',
      'Wenn du die Daten deines Browsers löschst, gilt dein Gerät für Moodmap als neues Gerät.',
    ],
  },
  {
    title: 'Frühwarn-Radar: wofür es da ist und wofür nicht',
    intro: 'Das Frühwarn-Radar zeigt, wo sich Themen wie Stress oder Unzufriedenheit häufen.',
    items: [
      'Wofür es da ist: Schulen und Politik sollen ins Gespräch kommen und Unterstützung anbieten, zum Beispiel Schulsozialarbeit.',
      'Wofür es nicht da ist: Es überwacht keine Schüler:innen und zeigt keine einzelnen Personen.',
      'Keine Weitergabe an Polizei oder Ordnungsbehörden.',
      'Keine Strafen oder Nachteile für Schulen.',
      'Keine Ranglisten wie „schlechteste Schule“.',
    ],
  },
  {
    title: 'Das ist ein Prototyp',
    intro: 'Moodmap ist im Moment eine Testversion.',
    items: [
      'Die Zahlen in der App sind Demo-Daten. Sie stammen nicht von echten Schüler:innen.',
      'Vor einem echten Einsatz müssen Datenschutzbeauftragte alles prüfen.',
    ],
  },
] as const;

export function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Datenschutz</h1>
      <p className="mt-3 text-lg text-muted">
        Hier steht in einfachen Worten, was Moodmap mit deinen Antworten macht. Tippe auf eine Überschrift, um
        mehr zu lesen.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {SECTIONS.map((section) => (
          <details key={section.title} className="group card rounded-2xl p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <h2 className="text-lg font-bold">{section.title}</h2>
              <span
                aria-hidden
                className="text-2xl leading-none transition group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <div className="mt-2 text-muted">
              <p>{section.intro}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-fg">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>

      <aside className="card mt-8 rounded-2xl p-4">
        <h2 className="font-bold">Du brauchst Hilfe?</h2>
        <p className="mt-1 text-muted">
          Moodmap kann dir nicht persönlich antworten. Wenn es dir gerade nicht gut geht, sprich mit jemandem:
          Die Nummer gegen Kummer erreichst du unter{' '}
          <strong className="whitespace-nowrap text-fg">116 111</strong>, kostenlos und anonym.
        </p>
      </aside>
    </article>
  );
}
