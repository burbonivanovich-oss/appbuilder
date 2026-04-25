import { diffDays, pluralRu } from './date';

export function ageInDays(dob: Date, now: Date = new Date()): number {
  return diffDays(now, dob);
}

export function ageInWeeks(dob: Date, now: Date = new Date()): number {
  return Math.floor(ageInDays(dob, now) / 7);
}

export function ageInMonthsApprox(dob: Date, now: Date = new Date()): number {
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  return months;
}

export function formatAgeRu(dob: Date, now: Date = new Date()): string {
  const days = ageInDays(dob, now);
  if (days < 0) return 'ещё не родился';
  if (days < 14) {
    return `${days} ${pluralRu(days, ['день', 'дня', 'дней'])}`;
  }
  const weeks = ageInWeeks(dob, now);
  if (weeks < 17) {
    return `${weeks} ${pluralRu(weeks, ['неделя', 'недели', 'недель'])}`;
  }
  const months = ageInMonthsApprox(dob, now);
  if (months < 24) {
    return `${months} ${pluralRu(months, ['месяц', 'месяца', 'месяцев'])}`;
  }
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const yearStr = `${years} ${pluralRu(years, ['год', 'года', 'лет'])}`;
  if (restMonths === 0) return yearStr;
  return `${yearStr} ${restMonths} ${pluralRu(restMonths, ['месяц', 'месяца', 'месяцев'])}`;
}

export function formatWeekAgeRu(weeks: number): string {
  return `около ${weeks} ${pluralRu(weeks, ['недели', 'недель', 'недель'])}`;
}

export type PretermInfo = {
  isPreterm: boolean;
  chronological: string;
  corrected: string;
};

export function getPretermInfo(
  dob: Date,
  expectedDob: Date,
  now: Date = new Date(),
): PretermInfo {
  const isPreterm = dob.getTime() !== expectedDob.getTime();
  return {
    isPreterm,
    chronological: formatAgeRu(dob, now),
    corrected: formatAgeRu(expectedDob, now),
  };
}

export function formatAgeWithCorrection(
  dob: Date,
  expectedDob: Date,
  now: Date = new Date(),
): string {
  const info = getPretermInfo(dob, expectedDob, now);
  if (!info.isPreterm) return info.chronological;
  return `${info.chronological} · ${info.corrected} скорр.`;
}
