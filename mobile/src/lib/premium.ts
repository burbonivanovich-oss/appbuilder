export type PremiumFeature =
  | 'leap_tips'
  | 'leap_abilities'
  | 'leap_future_content'
  | 'notifications_advance'
  | 'partner_digest'
  | 'export_pdf'
  | 'advanced_insights';

export const PREMIUM_FEATURE_LABEL: Record<PremiumFeature, string> = {
  leap_tips: 'Советы что делать',
  leap_abilities: 'Новые умения после скачка',
  leap_future_content: 'Полный контент будущих скачков',
  notifications_advance: 'Уведомление за 3 дня',
  partner_digest: 'Дайджест для партнёра',
  export_pdf: 'Экспорт PDF',
  advanced_insights: 'Подробная аналитика',
};

export type PaywallTrigger = 'leap_tips' | 'notification' | 'insights' | 'general';

export const PAYWALL_HEADLINE: Record<PaywallTrigger, string> = {
  leap_tips: 'Узнайте что делать, а не только что происходит',
  notification: 'Готовьтесь заранее, а не в разгар скачка',
  insights: 'Поймите паттерны поведения вашего малыша',
  general: 'Полный доступ ко всем возможностям',
};

export const PAYWALL_SUBTITLE: Record<PaywallTrigger, string> = {
  leap_tips:
    'Раздел «Что попробовать» — практические советы на каждый день скачка. Это то, чего нет в абстрактных текстах.',
  notification:
    'За 3 дня до скачка — время скорректировать планы, подготовить режим и запастись терпением.',
  insights:
    'Журнал уже собрал данные. Premium показывает, как настроение малыша связано со скачками.',
  general: 'Полный контент скачков, уведомления заранее, аналитика журнала и многое другое.',
};
