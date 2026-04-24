export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const MS_PER_WEEK = MS_PER_DAY * 7;

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function diffDays(a: Date, b: Date): number {
  const startOfA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const startOfB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((startOfA.getTime() - startOfB.getTime()) / MS_PER_DAY);
}

export function diffWeeks(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_WEEK);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatDateRu(date: Date, opts: { withYear?: boolean } = {}): string {
  const day = date.getDate();
  const month = MONTHS_RU[date.getMonth()];
  const year = opts.withYear ? ` ${date.getFullYear()}` : '';
  return `${day} ${month}${year}`;
}

export function formatTimeRu(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatRelativeDayRu(date: Date, now: Date = new Date()): string {
  const days = diffDays(now, date);
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days === -1) return 'Завтра';
  return formatDateRu(date);
}

export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
