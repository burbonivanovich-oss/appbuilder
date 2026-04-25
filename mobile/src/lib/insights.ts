import { addDays, isSameDay, pluralRu, startOfDay } from './date';
import {
  SYMPTOM_LABEL,
  type JournalEntry,
  type Mood,
  type SymptomTag,
} from '@/src/store/journal';

const FUSSY_MOODS: ReadonlySet<Mood> = new Set<Mood>(['fussy', 'sad']);
const FUSSY_SYMPTOMS: ReadonlySet<SymptomTag> = new Set<SymptomTag>([
  'crying',
  'bad-sleep',
  'needs-contact',
]);

const WINDOW_DAYS = 7;

export type WeeklyInsights = {
  totalEntries: number;
  daysCovered: number;
  fussyDays: number;
  topSymptom: { symptom: SymptomTag; count: number } | null;
};

/**
 * Compute simple, non-judgemental insights over the last 7 days of journal
 * entries (rolling window ending at `now`). Returns null if there are no
 * entries in the window so the UI can hide the widget entirely.
 */
export function computeWeeklyInsights(
  entries: readonly JournalEntry[],
  now: Date = new Date(),
): WeeklyInsights | null {
  const today = startOfDay(now);
  const windowStart = addDays(today, -(WINDOW_DAYS - 1));

  const recent = entries.filter((e) => {
    const d = startOfDay(e.date);
    return d >= windowStart && d <= today;
  });

  if (recent.length === 0) return null;

  const dayKeys = new Set<string>();
  const fussyDayKeys = new Set<string>();
  const symptomCounts = new Map<SymptomTag, number>();

  for (const entry of recent) {
    const key = isoDay(entry.date);
    dayKeys.add(key);

    const isFussy =
      FUSSY_MOODS.has(entry.mood) ||
      entry.symptoms.some((s) => FUSSY_SYMPTOMS.has(s));
    if (isFussy) fussyDayKeys.add(key);

    for (const s of entry.symptoms) {
      symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
    }
  }

  let topSymptom: WeeklyInsights['topSymptom'] = null;
  for (const [symptom, count] of symptomCounts) {
    if (count >= 2 && (topSymptom === null || count > topSymptom.count)) {
      topSymptom = { symptom, count };
    }
  }

  return {
    totalEntries: recent.length,
    daysCovered: dayKeys.size,
    fussyDays: fussyDayKeys.size,
    topSymptom,
  };
}

function isoDay(d: Date): string {
  const day = startOfDay(d);
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

// Re-export for callers that want to gate UI on a 7-day check.
export function isWithinLastDays(date: Date, days: number, now: Date = new Date()): boolean {
  const today = startOfDay(now);
  const start = addDays(today, -(days - 1));
  const d = startOfDay(date);
  return d >= start && (isSameDay(d, today) || d <= today);
}

export type InsightsText = {
  entriesLine: string;
  fussyLine: string;
  topSymptomLine: string | null;
};

/**
 * Formats compute output into the three lines shown by InsightsCard.
 * Extracted as pure text so tone-of-voice can be unit-tested.
 */
export function formatInsightsText(insights: WeeklyInsights): InsightsText {
  const entriesLine = `${insights.totalEntries} ${pluralRu(insights.totalEntries, [
    'запись',
    'записи',
    'записей',
  ])} за ${insights.daysCovered} ${pluralRu(insights.daysCovered, [
    'день',
    'дня',
    'дней',
  ])}`;

  const fussyLine =
    insights.fussyDays > 0
      ? `Из них ${insights.fussyDays} ${pluralRu(insights.fussyDays, [
          'беспокойный день',
          'беспокойных дня',
          'беспокойных дней',
        ])} — это нормально, малыши не машины.`
      : 'Спокойная неделя — здорово.';

  const topSymptomLine = insights.topSymptom
    ? `Чаще всего: ${SYMPTOM_LABEL[insights.topSymptom.symptom].toLowerCase()} (${insights.topSymptom.count})`
    : null;

  return { entriesLine, fussyLine, topSymptomLine };
}
