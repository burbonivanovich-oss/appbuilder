import { pluralRu } from './date';
import type { TodaySnapshot } from './leaps';

/**
 * The presentation shape rendered by LeapHeroCard. Extracted so the decision
 * logic ("which label, title, subtitle, progress, CTA, accent for which
 * snapshot kind?") can be unit-tested without rendering React Native.
 */
export type LeapHeroContent = {
  label: string;
  title: string;
  subtitle?: string;
  progress?: number;
  cta?: string;
  accent: boolean;
};

export function buildLeapHero(snapshot: TodaySnapshot): LeapHeroContent {
  switch (snapshot.kind) {
    case 'active': {
      const day = snapshot.leap.daysIntoLeap + 1;
      const total = snapshot.leap.durationDays + 1;
      return {
        label: 'Сейчас идёт',
        title: `Скачок ${snapshot.leap.number}`,
        subtitle: `День ${day} из ≈${total}. Будьте рядом и обнимайте чаще.`,
        progress: Math.min(day / total, 1),
        cta: 'Подробнее о скачке',
        accent: true,
      };
    }
    case 'pre-leap': {
      const days = snapshot.leap.daysUntilStart;
      const w = pluralRu(days, ['день', 'дня', 'дней']);
      return {
        label: 'Скоро',
        title: `Скачок ${snapshot.leap.number} через ${days} ${w}`,
        subtitle: 'Можно готовиться: больше объятий и размеренный режим.',
        cta: 'Что ожидать',
        accent: false,
      };
    }
    case 'calm': {
      if (snapshot.next) {
        const weeks = Math.max(1, Math.round(snapshot.next.daysUntilStart / 7));
        const w = pluralRu(weeks, ['неделю', 'недели', 'недель']);
        return {
          label: 'Спокойный период',
          title: 'Наслаждайтесь',
          subtitle: `До следующего скачка ≈${weeks} ${w}.`,
          cta: `Посмотреть скачок ${snapshot.next.number}`,
          accent: false,
        };
      }
      return {
        label: 'Спокойный период',
        title: 'Наслаждайтесь',
        accent: false,
      };
    }
    case 'all-done': {
      return {
        label: 'Поздравляем',
        title: 'Все 10 скачков позади',
        subtitle: 'Малыш прошёл большой путь. Следующий этап — в V2 приложения.',
        accent: false,
      };
    }
  }
}
