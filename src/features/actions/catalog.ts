import type { TopicSlug } from '@/types';

/**
 * Studienbasierter Maßnahmenkatalog für Schulen.
 *
 * Die Evidenzstufen sind bewusst vorsichtig:
 * A = systematische Reviews/Meta-Analysen mit konsistenten Effekten,
 * B = experimentelle/quasi-experimentelle Studien oder gemischte, aber robuste Befundlage,
 * C = Praxisstandard, Modell oder noch dünne/nicht eindeutige Studienlage.
 *
 * Quellen sind jeweils am Eintrag hinterlegt. Keine Maßnahme wirkt „automatisch“:
 * Umsetzungsqualität, Beteiligung der Schüler:innen und der lokale Kontext entscheiden mit.
 */

export type EvidenceLevel = 'A' | 'B' | 'C';
export type Effort = 'niedrig' | 'mittel' | 'hoch';
export type Audience = 'schulleitung' | 'lehrkraefte' | 'schueler:innen' | 'schultraeger';

export interface CatalogSource {
  citation: string;
  doi?: string;
  url?: string;
}

export interface ActionMeasure {
  id: string;
  title: string;
  summary: string;
  topics: TopicSlug[];
  audience: Audience[];
  effort: Effort;
  timeframe: string;
  evidence: EvidenceLevel;
  evidenceNote: string;
  steps: string[];
  indicators: string[];
  sources: CatalogSource[];
  caveat?: string;
}

export const EVIDENCE_INFO: Record<EvidenceLevel, { label: string; short: string; description: string }> = {
  A: {
    label: 'A · starke Evidenz',
    short: 'A',
    description:
      'Systematische Reviews oder Meta-Analysen zeigen über mehrere Studien hinweg positive Effekte. Die Umsetzung muss zur Schule passen.',
  },
  B: {
    label: 'B · mittlere Evidenz',
    short: 'B',
    description:
      'Experimentelle oder quasi-experimentelle Studien bzw. eine gemischte, aber insgesamt robuste Befundlage.',
  },
  C: {
    label: 'C · Praxis / Modell',
    short: 'C',
    description:
      'Praxisstandard, rechtlicher Rahmen oder ein vielversprechendes Modell. Die Wirkung ist noch nicht ausreichend untersucht oder kontextabhängig.',
  },
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  schulleitung: 'Schulleitung',
  lehrkraefte: 'Lehrkräfte',
  'schueler:innen': 'Schüler:innen / SV',
  schultraeger: 'Schulträger',
};

export const EFFORT_LABELS: Record<Effort, string> = {
  niedrig: 'niedriger Aufwand',
  mittel: 'mittlerer Aufwand',
  hoch: 'hoher Aufwand',
};

const HATTIE_FEEDBACK: CatalogSource = {
  citation:
    'Hattie, J., & Timperley, H. (2007). The power of feedback. Review of Educational Research, 77(1), 81–112.',
  doi: '10.3102/003465430298487',
};
const BLACK_WILIAM: CatalogSource = {
  citation:
    'Black, P., & Wiliam, D. (1998). Assessment and classroom learning. Assessment in Education, 5(1), 7–74.',
  doi: '10.1080/0969595980050102',
};
const DIGNATH: CatalogSource = {
  citation:
    'Dignath, C., & Büttner, G. (2008). Components of fostering self-regulated learning among students. Metacognition and Learning, 3, 231–264.',
  doi: '10.1007/s11409-008-9029-x',
};
const EEF_TOOLKIT: CatalogSource = {
  citation:
    'Education Endowment Foundation. Teaching and Learning Toolkit (laufend aktualisierte Übersicht).',
  url: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit',
};
const NICKOW: CatalogSource = {
  citation:
    'Nickow, A., Oreopoulos, P., & Quan, V. (2020). The impressive effects of tutoring on preK-12 learning. NBER Working Paper 27476.',
  doi: '10.3386/w27476',
};
const VON_DER_EMBSE: CatalogSource = {
  citation:
    'von der Embse, N., Jester, D., Roy, D., & Post, J. (2018). Test anxiety effects, predictors, and correlates: A 30-year meta-analytic review. Journal of Affective Disorders, 227, 483–493.',
  doi: '10.1016/j.jad.2017.11.048',
};
const DONNELLY: CatalogSource = {
  citation:
    'Donnelly, J. E., et al. (2016). Physical activity, fitness, cognitive function, and academic achievement in children: A systematic review. Medicine & Science in Sports & Exercise, 48(6), 1197–1222.',
  doi: '10.1249/MSS.0000000000000901',
};
const WHO_ACTIVITY: CatalogSource = {
  citation: 'World Health Organization (2020). WHO guidelines on physical activity and sedentary behaviour.',
  url: 'https://www.who.int/publications/i/item/9789240015128',
};
const DURLAK: CatalogSource = {
  citation:
    'Durlak, J. A., Weissberg, R. P., Dymnicki, A. B., Taylor, R. D., & Schellinger, K. B. (2011). The impact of enhancing students’ social and emotional learning: A meta-analysis of school-based universal interventions. Child Development, 82(1), 405–432.',
  doi: '10.1111/j.1467-8624.2010.01564.x',
};
const TAYLOR: CatalogSource = {
  citation:
    'Taylor, R. D., Oberle, E., Durlak, J. A., & Weissberg, R. P. (2017). Promoting positive youth development through school-based social and emotional learning interventions: A meta-analysis of follow-up effects. Child Development, 88(4), 1156–1171.',
  doi: '10.1111/cdev.12864',
};
const WHO_SCHOOLS: CatalogSource = {
  citation:
    'World Health Organization & UNESCO (2021). Making every school a health-promoting school: global standards and indicators.',
  url: 'https://www.who.int/initiatives/making-every-school-a-health-promoting-school',
};
const TTOFI: CatalogSource = {
  citation:
    'Ttofi, M. M., & Farrington, D. P. (2011). Effectiveness of school-based programs to reduce bullying: A systematic and meta-analytic review. Journal of Experimental Criminology, 7, 27–56.',
  doi: '10.1007/s11292-010-9109-1',
};
const GAFFNEY: CatalogSource = {
  citation:
    'Gaffney, H., Ttofi, M. M., & Farrington, D. P. (2021). Effectiveness of school-based programs to reduce bullying perpetration and victimization: An updated systematic review and meta-analysis. Campbell Systematic Reviews, 17(2), e1143.',
  doi: '10.1002/cl2.1143',
};
const UNESCO_BULLYING: CatalogSource = {
  citation: 'UNESCO (2017). School violence and bullying: Global status report.',
  url: 'https://unesdoc.unesco.org/ark:/48223/pf0000246970',
};
const ROORDA: CatalogSource = {
  citation:
    'Roorda, D. L., Koomen, H. M. Y., Spilt, J. L., & Oort, F. J. (2011). The influence of affective teacher–student relationships on students’ school engagement and achievement: A meta-analytic approach. Review of Educational Research, 81(4), 493–529.',
  doi: '10.3102/0034654311421793',
};
const HATTIE_BOOK: CatalogSource = {
  citation:
    'Hattie, J. (2009). Visible Learning: A Synthesis of Over 800 Meta-Analyses Relating to Achievement. Routledge.',
};
const KYNDT: CatalogSource = {
  citation:
    'Kyndt, E., Raes, E., Lismont, B., Timmers, F., Cascallar, E., & Dochy, F. (2013). A meta-analysis of the effects of face-to-face cooperative learning. Educational Research Review, 10, 133–149.',
  doi: '10.1016/j.edurev.2013.02.002',
};
const LUNDY: CatalogSource = {
  citation:
    'Lundy, L. (2007). “Voice is not enough”: Conceptualising Article 12 of the United Nations Convention on the Rights of the Child. British Educational Research Journal, 33(6), 927–942.',
  doi: '10.1080/01411920701657033',
};
const UN_CRC: CatalogSource = {
  citation:
    'Vereinte Nationen (1989). Übereinkommen über die Rechte des Kindes, Artikel 12 (Berücksichtigung des Kindeswillens).',
  url: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-rights-child',
};
const OECD_PISA: CatalogSource = {
  citation:
    'OECD (2019). PISA 2018 Results (Volume III): What School Life Means for Students’ Lives. OECD Publishing.',
  doi: '10.1787/acd78851-en',
};
const EEF_DIGITAL: CatalogSource = {
  citation: 'Education Endowment Foundation. Digital Technology (Teaching and Learning Toolkit).',
  url: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/digital-technology',
};
const KMK_DIGITAL: CatalogSource = {
  citation:
    'Kultusministerkonferenz (2021). Bildung in der digitalen Welt: Strategie der Kultusministerkonferenz.',
  url: 'https://www.kmk.org/themen/bildung-in-der-digitalen-welt/strategie-bildung-in-der-digitalen-welt.html',
};
const UNESCO_AI: CatalogSource = {
  citation: 'UNESCO (2023). Guidance for generative AI in education and research. Paris: UNESCO.',
  url: 'https://unesdoc.unesco.org/ark:/48223/pf0000386693',
};
const EC_AI: CatalogSource = {
  citation:
    'Europäische Kommission (2022). Ethical guidelines on the use of artificial intelligence and data in teaching and learning for educators.',
};
const UNICEF_WASH: CatalogSource = {
  citation:
    'UNICEF & WHO (2018). Drinking water, sanitation and hygiene in schools: Global baseline report 2018. JMP.',
  url: 'https://data.unicef.org/resources/wash-in-schools',
};
const WHO_SANITATION: CatalogSource = {
  citation: 'World Health Organization (2021). WHO guidelines on sanitation and health.',
  url: 'https://www.who.int/publications/i/item/9789241514705',
};
const HAVERINEN: CatalogSource = {
  citation:
    'Haverinen-Shaughnessy, U., Moschandreas, D. J., & Shaughnessy, R. J. (2011). Association between substandard classroom ventilation rates and students’ academic achievement. Indoor Air, 21(2), 121–131.',
  doi: '10.1111/j.1600-0668.2010.00686.x',
};
const SHIELD: CatalogSource = {
  citation:
    'Shield, B. M., & Dockrell, J. E. (2008). The effects of environmental and classroom noise on the academic attainments of primary school children. Journal of the Acoustical Society of America, 123(1), 133–144.',
  doi: '10.1121/1.2812596',
};
const WARGOCKI: CatalogSource = {
  citation:
    'Wargocki, P., & Wyon, D. P. (2007). The effects of moderately raised classroom temperatures and classroom ventilation rate on the performance of schoolwork by children. HVAC&R Research, 13(2), 193–220.',
};
const WHO_FOOD: CatalogSource = {
  citation:
    'World Health Organization (2021). Implementing school food and nutrition policies: A review of contextual factors.',
  url: 'https://www.who.int/publications/i/item/9789240035072',
};
const FAO_FOOD: CatalogSource = {
  citation: 'FAO (2019). School food and nutrition framework. Rome: FAO.',
  url: 'https://www.fao.org/3/caaf20en/caaf20en.pdf',
};
const BELAND: CatalogSource = {
  citation:
    'Beland, L.-P., & Murphy, R. (2016). Ill communication: Technology, distraction & student performance. Labour Economics, 41, 61–76.',
  doi: '10.1016/j.labeco.2016.06.004',
};
const OECD_CANCELLATION: CatalogSource = {
  citation:
    'OECD (2020). Education responses to COVID-19: Embracing digital learning and online collaboration.',
  url: 'https://www.oecd.org/coronavirus/policy-responses/education-responses-to-covid-19-embracing-digital-learning-and-online-collaboration-d75eb0e8/',
};

export const ACTION_MEASURES: readonly ActionMeasure[] = [
  {
    id: 'feedback',
    title: 'Feedback, das den nächsten Schritt zeigt',
    summary:
      'Nicht die Note allein, sondern die konkrete Rückmeldung zum Lernprozess hilft: Was ist gelungen, was ist der nächste Schritt, und wie können Schüler:innen ihn gehen?',
    topics: ['learning', 'overall'],
    audience: ['lehrkraefte', 'schulleitung'],
    effort: 'mittel',
    timeframe: '6–8 Wochen',
    evidence: 'A',
    evidenceNote:
      'Feedback gehört zu den am besten untersuchten Unterrichtsmerkmalen; die Wirkung hängt stark von der Qualität und vom Bezug zum Lernziel ab.',
    steps: [
      'Lernziele und Erfolgskriterien zu Beginn der Einheit sichtbar machen.',
      'Feedback an den nächsten Lernschritt koppeln, nicht an die Person oder die Note.',
      'Zeit für Überarbeitung und Peer-Feedback fest im Unterricht einplanen.',
      'Nach 4–6 Wochen prüfen: Können alle sagen, was ihr nächster Schritt ist?',
    ],
    indicators: [
      'Anteil der Schüler:innen, die ihr nächstes Lernziel benennen können',
      'Anzahl überarbeiteter Aufgaben bzw. Entwürfe',
      'Rückmeldungen zur Verständlichkeit des Feedbacks',
    ],
    sources: [HATTIE_FEEDBACK, BLACK_WILIAM],
  },
  {
    id: 'metacognition',
    title: 'Lernstrategien sichtbar machen',
    summary:
      'Schüler:innen lernen besser, wenn sie planen, ihren Lernweg überwachen und am Ende reflektieren – eingebettet in den Fachunterricht statt als zusätzliches Training.',
    topics: ['learning', 'stress'],
    audience: ['lehrkraefte'],
    effort: 'mittel',
    timeframe: '8 Wochen',
    evidence: 'A',
    evidenceNote:
      'Meta-Analysen zeigen positive Effekte besonders dann, wenn Strategien fachlich eingebettet und von Lehrkräften begleitet werden.',
    steps: [
      'Planen, Überwachen und Reflektieren im Fachunterricht vormachen.',
      'Lernjournale, Checklisten oder kurze Strategie-Routinen einführen.',
      'Schüler:innen ihre Strategie erklären lassen (lautes Denken, Partnerarbeit).',
      'Lehrkräfte gemeinsam fortbilden und Materialien teilen.',
    ],
    indicators: [
      'Sichtbare Strategie-Nutzung in Lernjournalen',
      'Selbsteinschätzung „Ich weiß, wie ich anfange“',
      'Anteil selbstständig bearbeiteter Aufgaben',
    ],
    sources: [DIGNATH, EEF_TOOLKIT],
  },
  {
    id: 'tutoring',
    title: 'Gezielte Lernzeit mit Tutoring',
    summary:
      'Kleine, strukturierte Fördergruppen mit geschulten Tutor:innen können Lernrückstände wirksam verkleinern – besonders bei regelmäßiger Teilnahme.',
    topics: ['learning', 'future'],
    audience: ['schulleitung', 'schultraeger'],
    effort: 'hoch',
    timeframe: '12 Wochen',
    evidence: 'A',
    evidenceNote:
      'Die Befundlage zu strukturiertem Tutoring ist insgesamt stark; entscheidend sind Dauer, Regelmäßigkeit und Qualität der Tutor:innen.',
    steps: [
      'Förderbedarf anhand von Daten bestimmen, nicht nach Bauchgefühl.',
      'Kleine Gruppen, feste Zeiten und strukturierte Materialien einplanen.',
      'Tutor:innen trainieren und regelmäßig supervidieren.',
      'Teilnahme freiwillig halten und Eltern sowie Schüler:innen transparent informieren.',
    ],
    indicators: [
      'Regelmäßige Teilnahmequote',
      'Lernfortschritt in den geförderten Kernfächern',
      'Zufriedenheit von Schüler:innen und Tutor:innen',
    ],
    sources: [NICKOW, EEF_TOOLKIT],
  },
  {
    id: 'exam-stress',
    title: 'Prüfungsdruck entzerren',
    summary:
      'Viele Prüfungen in kurzer Zeit erhöhen Stress. Eine planbare Taktung, transparente Kriterien und Unterstützung helfen mehr als Appelle an die Selbstorganisation.',
    topics: ['stress', 'wellbeing'],
    audience: ['schulleitung', 'lehrkraefte'],
    effort: 'mittel',
    timeframe: '8 Wochen',
    evidence: 'B',
    evidenceNote:
      'Testangst ist gut untersucht; Interventionen wirken, aber die Studienlage zu schulorganisatorischen Änderungen ist heterogener als bei Unterrichtsfeedback.',
    steps: [
      'Prüfungstermine über die Jahrgangsstufe entzerren und früh kommunizieren.',
      'Formative Aufgaben und Übungsphasen statt reiner Notenprüfungen ausbauen.',
      'Bewertungskriterien und Erwartungen vorab transparent machen.',
      'Schulsozialarbeit/Schulpsychologie einbinden; Schlaf, Pausen und Pufferzeiten mitdenken.',
    ],
    indicators: [
      'Anzahl großer Prüfungen pro Woche',
      'Stress-Score im Moodmap-Thema „Stress & Leistungsdruck“',
      'Inanspruchnahme von Beratungsangeboten',
    ],
    sources: [VON_DER_EMBSE],
    caveat:
      'Keine Prüfungen „abschaffen“, sondern Taktung und Transparenz verbessern. Leistungsanforderungen bleiben sichtbar.',
  },
  {
    id: 'movement',
    title: 'Bewegung in den Schultag bringen',
    summary:
      'Kurze Bewegungspausen, aktive Pausen und Bewegung im Fachunterricht unterstützen Konzentration und Wohlbefinden – ohne zusätzlichen Leistungsdruck.',
    topics: ['stress', 'wellbeing', 'learning'],
    audience: ['schulleitung', 'lehrkraefte'],
    effort: 'niedrig',
    timeframe: 'laufend',
    evidence: 'B',
    evidenceNote:
      'Systematische Reviews zeigen positive Zusammenhänge mit Kognition und Wohlbefinden; die Effekte hängen von Regelmäßigkeit und Alltagstauglichkeit ab.',
    steps: [
      'Bewegungspausen fest im Stundenplan verankern.',
      'Pausenhof mit Spiel- und Bewegungsangeboten ausstatten.',
      'Bewegungselemente in Fachunterricht einbauen (z. B. Stationen, Partnerwege).',
      'Pausen nicht als Strafe entziehen.',
    ],
    indicators: [
      'Anzahl umgesetzter Bewegungspausen pro Woche',
      'Nutzung der Pausenangebote',
      'Stress- und Wohlbefindens-Score',
    ],
    sources: [DONNELLY, WHO_ACTIVITY],
  },
  {
    id: 'sel',
    title: 'Sozial-emotionales Lernen als Schulentwicklung',
    summary:
      'Ein universelles SEL-Programm für alle Klassen stärkt Selbstwahrnehmung, Beziehungsfähigkeit und den Umgang mit Emotionen – wirksam wird es als ganze Schule, nicht als Einzelstunde.',
    topics: ['wellbeing', 'community'],
    audience: ['schulleitung', 'lehrkraefte'],
    effort: 'hoch',
    timeframe: '1 Schuljahr',
    evidence: 'A',
    evidenceNote:
      'Meta-Analysen über viele Schulprogramme zeigen positive Effekte auf soziale und emotionale Kompetenzen; Langzeiteffekte sind wahrscheinlicher, wenn die Schule das Programm dauerhaft verankert.',
    steps: [
      'Ein universelles SEL-Curriculum für alle Klassen auswählen.',
      'Lehrkräfte fortbilden und kollegiale Begleitung sicherstellen.',
      'SEL in Fachunterricht, Pausen und Schulkultur verankern.',
      'Familien einbeziehen und niemanden stigmatisieren.',
    ],
    indicators: [
      'Umgesetzte SEL-Einheiten pro Klasse',
      'Schüler:innen-Befragung zu Zugehörigkeit und Emotionsregulation',
      'Konflikte bzw. Beratungsanfragen',
    ],
    sources: [DURLAK, TAYLOR, WHO_SCHOOLS],
  },
  {
    id: 'anti-bullying',
    title: 'Anti-Mobbing mit klaren Verfahren',
    summary:
      'Ein wirksames Programm kombiniert klare Regeln, sichere Meldewege, Prävention im Unterricht und eine faire Aufarbeitung von Vorfällen – für alle sichtbar.',
    topics: ['safety', 'community', 'wellbeing'],
    audience: ['schulleitung', 'lehrkraefte'],
    effort: 'hoch',
    timeframe: '1 Schuljahr',
    evidence: 'A',
    evidenceNote:
      'Systematische Reviews finden im Durchschnitt moderate Rückgänge von Mobbing; Programme mit klaren Verfahren und Beteiligung der ganzen Schule schneiden besser ab.',
    steps: [
      'Mobbing definieren, Meldeweg und feste Ansprechpersonen benennen.',
      'Prävention im Unterricht und Zivilcourage-Training (Bystander) verankern.',
      'Vorfälle dokumentieren, Betroffene schützen und fair aufarbeiten.',
      'Nach 6–12 Monaten Prävalenz und Sicherheitsgefühl erneut messen.',
    ],
    indicators: [
      'Gemeldete und bearbeitete Vorfälle',
      'Sicherheitsgefühl im Moodmap-Thema „Sicherheit“',
      'Wiederholungsquote bzw. Eskalationen',
    ],
    sources: [TTOFI, GAFFNEY, UNESCO_BULLYING],
  },
  {
    id: 'relationships',
    title: 'Beziehungen im Schulalltag stärken',
    summary:
      'Gute Lehrkräfte-Schüler:innen-Beziehungen sind mit mehr Engagement und besserer Leistung verbunden. Kleine, verlässliche Interaktionen wirken – wenn sie alle erreichen.',
    topics: ['teachers', 'community'],
    audience: ['lehrkraefte', 'schulleitung'],
    effort: 'mittel',
    timeframe: 'laufend',
    evidence: 'A',
    evidenceNote:
      'Meta-Analysen zeigen mittlere Zusammenhänge zwischen affektiven Beziehungen und Engagement/Leistung; die Effekte sind nicht auf einzelne „Lieblingsschüler:innen“ beschränkt.',
    steps: [
      'Namen kennen, begrüßen und kleine, verlässliche Interaktionen pflegen.',
      'Feste Sprechzeiten und niedrigschwellige Ansprechbarkeit schaffen.',
      'Regelmäßig Feedback zur Beziehung einholen (anonym möglich).',
      'Lehrkräfte entlasten, damit Beziehungsarbeit keine Zusatzlast bleibt.',
    ],
    indicators: [
      'Beziehungsscore im Moodmap-Thema „Verhältnis zu Lehrkräften“',
      'Anwesenheit und Beteiligung',
      'Beschwerden bzw. Konfliktmeldungen',
    ],
    sources: [ROORDA, HATTIE_BOOK],
  },
  {
    id: 'cooperative',
    title: 'Kooperatives Lernen mit klaren Rollen',
    summary:
      'Strukturierte Gruppenarbeit mit Rollen, gemeinsamer Aufgabe und individueller Verantwortung fördert Lernen und Zugehörigkeit – anders als unstrukturierte „Gruppenarbeit“.',
    topics: ['community', 'learning'],
    audience: ['lehrkraefte'],
    effort: 'mittel',
    timeframe: '8–12 Wochen',
    evidence: 'A',
    evidenceNote:
      'Meta-Analysen zeigen positive Effekte kooperativen Lernens, wenn positive Interdependenz und individuelle Verantwortung gesichert sind.',
    steps: [
      'Aufgabe so gestalten, dass alle voneinander abhängig sind.',
      'Rollen und individuelle Verantwortung festlegen.',
      'Gruppenprozess regelmäßig reflektieren lassen.',
      'Lehrkräfte als Coach begleiten, nicht nur Ergebnisse bewerten.',
    ],
    indicators: [
      'Anteil kooperativer Unterrichtssequenzen',
      'Qualität der Gruppenergebnisse',
      'Zugehörigkeits-Score im Moodmap-Thema „Klassengemeinschaft“',
    ],
    sources: [KYNDT, EEF_TOOLKIT],
  },
  {
    id: 'class-council',
    title: 'Klassenrat mit echter Entscheidungsmacht',
    summary:
      'Ein regelmäßiger Klassenrat gibt allen eine Stimme – wirksam wird er, wenn Beschlüsse sichtbar umgesetzt werden und nicht nur Wünsche gesammelt werden.',
    topics: ['participation', 'voice', 'community'],
    audience: ['lehrkraefte', 'schueler:innen'],
    effort: 'niedrig',
    timeframe: 'laufend',
    evidence: 'C',
    evidenceNote:
      'Partizipation ist kinderrechtlich verankert und plausibel wirksam; die empirische Wirkung hängt stark von echter Entscheidungsmacht und Verlässlichkeit ab.',
    steps: [
      'Wöchentlichen festen Termin im Stundenplan verankern.',
      'Rotierende Rollen (Moderation, Protokoll, Zeit) einführen.',
      'Beschlüsse dokumentieren und nachverfolgen.',
      'Grenzen klar benennen: keine Personalfragen, Noten oder Einzelfälle.',
    ],
    indicators: [
      'Anzahl durchgeführter Sitzungen',
      'Umgesetzte Beschlüsse',
      'Beteiligung und Zufriedenheit im Moodmap-Thema „Mitbestimmung“',
    ],
    sources: [LUNDY, UN_CRC],
  },
  {
    id: 'feedback-loop',
    title: '„Ihr habt gesagt – wir haben getan“',
    summary:
      'Schulen machen sichtbar, was sie aus der Befragung aufnehmen: zwei konkrete Vorhaben, eine verantwortliche Person, ein Termin – und eine Rückmeldung, was daraus wurde.',
    topics: ['voice', 'participation'],
    audience: ['schulleitung', 'schueler:innen'],
    effort: 'niedrig',
    timeframe: '4–6 Wochen',
    evidence: 'C',
    evidenceNote:
      'Der Feedback-Loop ist ein Partizipations- und Transparenzmodell. Er verhindert, dass Befragungen folgenlos bleiben; die Wirkung auf den Voice-Score ist kontextabhängig.',
    steps: [
      'Die zwei wichtigsten Themen aus der Moodmap transparent machen.',
      'Je eine Maßnahme mit verantwortlicher Person und Datum festlegen.',
      'Status sichtbar aushängen („geplant“, „in Arbeit“, „erledigt“).',
      'Nach 6–8 Wochen zurückmelden, was passiert ist – auch bei Absagen.',
    ],
    indicators: [
      'Anzahl umgesetzter Maßnahmen',
      'Sichtbarkeit der Rückmeldung',
      'Voice-Score im Moodmap-Thema „Gehört werden“',
    ],
    sources: [LUNDY, OECD_PISA],
  },
  {
    id: 'digital',
    title: 'Digitale Ausstattung mit Support und Fortbildung',
    summary:
      'Geräte allein verändern keinen Unterricht. Entscheidend sind verlässlicher Support, didaktische Fortbildung und klare Regeln für Ausleihe und Datenschutz.',
    topics: ['digital', 'learning'],
    audience: ['schultraeger', 'schulleitung'],
    effort: 'hoch',
    timeframe: '12 Monate',
    evidence: 'B',
    evidenceNote:
      'Die Befundlage zu digitalen Medien ist gemischt; positive Effekte entstehen eher durch gute didaktische Einbettung und Support als durch reine Hardware.',
    steps: [
      'Bestandsaufnahme: Geräte, Netz, Supportzeiten, Ausfälle.',
      'Feste Ansprechperson und Service-Level für Reparaturen definieren.',
      'Lehrkräfte didaktisch fortbilden, nicht nur technisch schulen.',
      'Leihgeräte, Datenschutz und Nutzungsregeln transparent kommunizieren.',
    ],
    indicators: [
      'Ausfallzeiten und Reparaturdauer',
      'Nutzung digitaler Angebote im Unterricht',
      'Fortbildungsquote der Lehrkräfte',
    ],
    sources: [EEF_DIGITAL, KMK_DIGITAL],
  },
  {
    id: 'ai',
    title: 'KI-Regeln und KI-Kompetenz',
    summary:
      'Schulen brauchen klare Regeln für erlaubte Tools, Daten und Kennzeichnung – und Unterricht, der kritisches Denken über KI fördert, statt nur zu verbieten.',
    topics: ['ai', 'digital'],
    audience: ['schulleitung', 'lehrkraefte'],
    effort: 'mittel',
    timeframe: '6–12 Wochen',
    evidence: 'C',
    evidenceNote:
      'KI-Kompetenz ist ein junges Feld; es gibt internationale Leitlinien, aber noch keine belastbaren Langzeitstudien zu schulweiten KI-Regeln.',
    steps: [
      'Gemeinsame Regeln erarbeiten: erlaubte Tools, Daten, Kennzeichnung, Prüfungen.',
      'KI-Kompetenz in den Fachunterricht integrieren (Quellen, Bias, Urheberrecht).',
      'Lehrkräfte fortbilden und Unsicherheiten ansprechbar machen.',
      'Regeln jährlich evaluieren und an neue Tools anpassen.',
    ],
    indicators: [
      'Bekanntheit der KI-Regeln',
      'Umgesetzte Unterrichtseinheiten zu KI',
      'Vorfälle bzw. Rückfragen zu KI-Nutzung',
    ],
    sources: [UNESCO_AI, EC_AI, KMK_DIGITAL],
  },
  {
    id: 'toilets',
    title: 'Toiletten und Gebäude zuverlässig instand halten',
    summary:
      'Saubere, funktionierende Toiletten sind eine Grundvoraussetzung für Wohlbefinden und Teilhabe. Schulen brauchen einen schnellen, sichtbaren Reparatur- und Reinigungsprozess.',
    topics: ['building', 'wellbeing'],
    audience: ['schultraeger', 'schulleitung'],
    effort: 'mittel',
    timeframe: '8–12 Wochen',
    evidence: 'C',
    evidenceNote:
      'Es gibt internationale Standards für Wasser, Sanitär und Hygiene an Schulen, aber wenige kontrollierte Studien zu einzelnen Sanierungsmaßnahmen.',
    steps: [
      'Gemeinsame Begehung mit Schüler:innen und Hausmeister durchführen.',
      'Reinigungs- und Reparaturprozess mit Fristen und Ansprechpersonen festlegen.',
      'Seife, Papier, Abfallentsorgung, Beleuchtung und Schlösser sicherstellen.',
      'Barrierefreie Toiletten und geschlechtergerechte Angebote prüfen.',
    ],
    indicators: [
      'Durchschnittliche Reparaturdauer',
      'Sauberkeitsbewertung im Moodmap-Thema „Schulgebäude & Toiletten“',
      'Anzahl Beschwerden',
    ],
    sources: [UNICEF_WASH, WHO_SANITATION],
  },
  {
    id: 'air-noise',
    title: 'Raumluft, Licht und Lärm messen',
    summary:
      'Ventilation, Akustik und Beleuchtung beeinflussen Konzentration und Müdigkeit. Messen macht Probleme sichtbar und priorisierbar – oft reichen Lüftungspläne und kleine Reparaturen.',
    topics: ['building', 'learning', 'wellbeing'],
    audience: ['schultraeger', 'schulleitung'],
    effort: 'mittel',
    timeframe: '6 Monate',
    evidence: 'B',
    evidenceNote:
      'Studien zeigen Zusammenhänge zwischen schlechter Raumluft, Lärm und schlechteren Leistungen; die Effekte einzelner baulicher Maßnahmen sind kontextabhängig.',
    steps: [
      'CO₂-Ampeln in stark genutzten Räumen einsetzen.',
      'Lüftungsplan mit Stoßlüften und Pausen etablieren.',
      'Lärmquellen reduzieren und Akustikdecken/Stellwände prüfen.',
      'Beleuchtung und Temperatur messen und Mängel melden.',
    ],
    indicators: [
      'CO₂-Werte im Tagesverlauf',
      'Lärmpegel in Klassenräumen',
      'Müdigkeits- und Konzentrations-Score',
    ],
    sources: [HAVERINEN, SHIELD, WARGOCKI],
  },
  {
    id: 'food',
    title: 'Mensa und Pausen gesünder gestalten',
    summary:
      'Schulverpflegung kann Gesundheit und Teilhabe unterstützen. Wichtig sind bezahlbare, schmackhafte Optionen, Wasser, transparente Allergene und ruhige Essenszeiten.',
    topics: ['food', 'wellbeing'],
    audience: ['schultraeger', 'schulleitung'],
    effort: 'mittel',
    timeframe: '6 Monate',
    evidence: 'C',
    evidenceNote:
      'Internationale Leitlinien empfehlen eine gesunde Schulverpflegung; die Evidenz für einzelne Maßnahmen ist begrenzt und stark von Umsetzung und Kosten abhängig.',
    steps: [
      'Schüler:innen an einer Mensa-AG oder regelmäßigen Befragung beteiligen.',
      'Gesunde, bezahlbare Optionen und kostenloses Wasser anbieten.',
      'Allergene, Preise und Essenszeiten transparent machen.',
      'Pausenräume ruhiger und zugänglicher gestalten.',
    ],
    indicators: [
      'Teilnahme an der Mensa',
      'Zufriedenheit im Moodmap-Thema „Mensa & Pausen“',
      'Essensabfälle und Nachfrage nach gesunden Optionen',
    ],
    sources: [WHO_FOOD, FAO_FOOD],
  },
  {
    id: 'phones',
    title: 'Handy-Regeln, die alle verstehen',
    summary:
      'Klare, einheitliche Regeln nach Zonen und Zeiten reduzieren Ablenkung. Wirksamer als reine Verbote ist Medienkompetenz, die den Umgang mit Apps, Bildern und Daten reflektiert.',
    topics: ['phones', 'digital', 'wellbeing'],
    audience: ['schulleitung', 'lehrkraefte'],
    effort: 'mittel',
    timeframe: '8 Wochen',
    evidence: 'B',
    evidenceNote:
      'Studien zu Handyverboten zeigen gemischte, teils positive Effekte auf Leistung und Konzentration; entscheidend sind Konsistenz und pädagogische Begleitung.',
    steps: [
      'Regeln nach Zonen und Zeiten definieren (Unterricht, Pausen, Mensa).',
      'Regeln einheitlich und verhältnismäßig umsetzen.',
      'Medienkompetenz und digitale Selbstregulation im Unterricht stärken.',
      'Eltern und Schüler:innen bei der Weiterentwicklung einbeziehen.',
    ],
    indicators: [
      'Regelverstöße und Unterrichtsstörungen',
      'Medienkompetenz-Selbsteinschätzung',
      'Stress-/Wohlbefindens-Score',
    ],
    sources: [BELAND, KMK_DIGITAL],
  },
  {
    id: 'career',
    title: 'Berufsorientierung mit Mentoring',
    summary:
      'Berufsorientierung wirkt, wenn sie über mehrere Jahre geht, echte Erfahrungen ermöglicht und von Erwachsenen begleitet wird – nicht als einzelne Berufsmesse.',
    topics: ['future', 'learning'],
    audience: ['schulleitung', 'schultraeger'],
    effort: 'hoch',
    timeframe: '1 Schuljahr',
    evidence: 'C',
    evidenceNote:
      'Die Befundlage zu Berufsorientierung ist positiv, aber heterogen; Praktika und Mentoring sind vielversprechend, ihre Wirkung hängt von Qualität und Anschluss ab.',
    steps: [
      'Berufsorientierung spiralcurricular ab Klasse 8 aufbauen.',
      'Praktika, Berufsbörsen und Alumni-Netzwerke mit Unterricht verbinden.',
      'Mentoring und Einzelgespräche für unklare Anschlüsse anbieten.',
      'Reflexion und konkrete Anschlussplanung am Ende jedes Jahres.',
    ],
    indicators: [
      'Teilnahme an Praktika und Beratung',
      'Klarheit über den weiteren Bildungsweg',
      'Zufriedenheit im Moodmap-Thema „Zukunft & Berufsorientierung“',
    ],
    sources: [OECD_PISA],
  },
  {
    id: 'cancellation',
    title: 'Unterrichtsausfall transparent und planbar machen',
    summary:
      'Ausfall ist nicht immer vermeidbar, aber besser steuerbar: frühe Kommunikation, klare Prioritäten und digitale Auffangmaterialien halten Lernzeit verlässlich.',
    topics: ['cancellation', 'learning'],
    audience: ['schulleitung', 'schultraeger'],
    effort: 'mittel',
    timeframe: 'laufend',
    evidence: 'C',
    evidenceNote:
      'Für Vertretungsplanung gibt es kaum kontrollierte Studien. Die Maßnahme ist ein organisatorischer Praxisstandard, der Lernzeit und Planbarkeit sichern soll.',
    steps: [
      'Vertretungsplan früh und digital veröffentlichen.',
      'Kernfächer priorisieren und Ausfallmuster auswerten.',
      'Aufgaben und Materialien für Vertretungsstunden eindeutig hinterlegen.',
      'Ausfall transparent kommunizieren und regelmäßig auswerten.',
    ],
    indicators: [
      'Ausfallstunden und Vertretungsquote',
      'Anteil der Vertretungen mit klarer Aufgabe',
      'Lernfortschritt in Kernfächern',
    ],
    sources: [OECD_CANCELLATION],
  },
];

export interface CatalogFilters {
  topic?: string | null;
  audience?: Audience | null;
  evidence?: EvidenceLevel | null;
  query?: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ß', 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Filtert den Katalog nach Thema, Zielgruppe, Evidenz und Freitext. */
export function filterMeasures(measures: readonly ActionMeasure[], filters: CatalogFilters): ActionMeasure[] {
  const query = filters.query?.trim() ? normalize(filters.query.trim()) : '';
  return measures.filter((measure) => {
    if (filters.topic && filters.topic !== 'all' && !measure.topics.includes(filters.topic)) {
      return false;
    }
    if (filters.audience && !measure.audience.includes(filters.audience)) return false;
    if (filters.evidence && measure.evidence !== filters.evidence) return false;
    if (!query) return true;
    const haystack = normalize(
      [measure.title, measure.summary, ...measure.steps, ...measure.indicators, ...measure.topics].join(' '),
    );
    return query.split(/\s+/).every((word) => haystack.includes(word));
  });
}
