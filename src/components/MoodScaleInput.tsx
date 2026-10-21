import { MOOD_LEVELS } from '@/lib/colors';
import { cn } from '@/lib/utils';

/** 1–5 = Antwort, `null` = „weiß nicht / keine Angabe“ */
export type MoodValue = 1 | 2 | 3 | 4 | 5 | null;

interface MoodScaleInputProps {
  /** `undefined` = noch nicht beantwortet */
  value?: MoodValue;
  onChange: (value: MoodValue) => void;
  /** Für die Zugänglichkeit: die Frage, auf die geantwortet wird */
  label: string;
  className?: string;
}

const ANSWER_LABELS = ['richtig mies', 'eher schlecht', 'geht so', 'eher gut', 'richtig gut'] as const;

/** 5er-Antwortskala aus docs/SURVEY_TOPICS.md §1 – große Touch-Ziele für die Daumenzone. */
export function MoodScaleInput({ value, onChange, label, className }: MoodScaleInputProps) {
  return (
    <div className={cn('w-full', className)}>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
        {MOOD_LEVELS.map((l, i) => {
          const v = l.level;
          const checked = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={ANSWER_LABELS[i]}
              onClick={() => onChange(v)}
              className={cn(
                'flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl text-3xl ring-2 transition-transform active:scale-95',
                checked ? 'scale-105 ring-slate-900' : 'ring-transparent',
              )}
              style={{ backgroundColor: l.color }}
            >
              <span aria-hidden>{l.face}</span>
              <span
                className="text-[10px] leading-tight font-semibold"
                style={{ color: l.textColor }}
                aria-hidden
              >
                {ANSWER_LABELS[i]}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={cn(
          'mt-3 min-h-11 w-full rounded-2xl text-sm font-medium ring-1',
          value === null
            ? 'bg-slate-900 text-white ring-slate-900'
            : 'bg-white text-slate-600 ring-slate-200',
        )}
      >
        🤷 weiß nicht / keine Angabe
      </button>
    </div>
  );
}
