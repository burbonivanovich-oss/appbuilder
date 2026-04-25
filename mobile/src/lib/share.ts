import type { TodaySnapshot } from '@/src/lib/leaps';
import { LEAPS } from '@/src/content/leaps';
import { pluralRu } from '@/src/lib/date';

export type ShareTextInput = {
  childName: string;
  snapshot: TodaySnapshot;
};

export type SharePayload = {
  title: string;
  message: string;
};

export function buildShareText(input: ShareTextInput): SharePayload | null {
  const { childName, snapshot } = input;

  switch (snapshot.kind) {
    case 'active': {
      const leap = snapshot.leap;
      const content = LEAPS.find((l) => l.number === leap.number);
      const day = leap.daysIntoLeap + 1;
      const total = leap.durationDays + 1;
      const symptoms = content?.symptoms.slice(0, 3).join(', ').toLowerCase();
      const lines = [
        `${childName}: сейчас идёт скачок ${leap.number} (день ${day} из ≈${total}).`,
      ];
      if (content?.name) {
        lines.push(`Тема скачка — «${content.name}».`);
      }
      if (symptoms) {
        lines.push(`Что часто бывает: ${symptoms}.`);
      }
      lines.push('Будьте рядом, обнимайте чаще, размеренный режим.');
      return {
        title: `Скачок ${leap.number} у ${childName}`,
        message: lines.join('\n'),
      };
    }
    case 'pre-leap': {
      const leap = snapshot.leap;
      const days = Math.max(1, leap.daysUntilStart);
      const word = pluralRu(days, ['день', 'дня', 'дней']);
      return {
        title: `Скачок ${leap.number} у ${childName} — скоро`,
        message:
          `${childName}: возможно скоро начнётся скачок ${leap.number} (через ${days} ${word}).\n` +
          'Можно готовиться: больше объятий, размеренный режим.',
      };
    }
    case 'calm': {
      if (snapshot.next) {
        const weeks = Math.max(1, Math.round(snapshot.next.daysUntilStart / 7));
        const word = pluralRu(weeks, ['неделю', 'недели', 'недель']);
        return {
          title: `${childName} — спокойный период`,
          message: `${childName}: сейчас спокойный период. До следующего скачка ≈${weeks} ${word}.`,
        };
      }
      return null;
    }
    case 'all-done':
      return {
        title: `${childName} — все скачки позади`,
        message: `${childName}: 10 скачков позади. Большой путь!`,
      };
  }
}
