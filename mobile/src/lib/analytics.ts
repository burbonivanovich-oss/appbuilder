/**
 * Thin analytics facade. Today: no-op + dev console log. Tomorrow: drop in
 * Amplitude / PostHog / Mixpanel by replacing the body of `track` and
 * `identify`. Call sites should not change.
 *
 * Event names are a closed string union so a typo at a call site fails
 * type-check rather than silently going to /dev/null.
 */

export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'auth_signed_in'
  | 'child_created'
  | 'child_updated'
  | 'disclaimer_accepted'
  | 'leap_viewed'
  | 'entry_added'
  | 'entry_removed'
  | 'mood_quick_logged'
  | 'share_used'
  | 'notif_permission_granted'
  | 'notif_permission_denied'
  | 'notif_tapped'
  | 'settings_notifications_toggled'
  | 'signed_out'
  | 'data_exported'
  | 'crash_caught'
  | 'paywall_shown'
  | 'paywall_subscribe_tapped'
  | 'paywall_dismissed'
  | 'premium_activated';

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

type Provider = {
  track: (event: AnalyticsEvent, props?: AnalyticsProps) => void;
  identify: (userId: string, traits?: AnalyticsProps) => void;
  reset: () => void;
};

const noopProvider: Provider = {
  track: () => {},
  identify: () => {},
  reset: () => {},
};

const devProvider: Provider = {
  track: (event, props) => {
    // eslint-disable-next-line no-console
    console.log('[analytics] track', event, props ?? {});
  },
  identify: (userId, traits) => {
    // eslint-disable-next-line no-console
    console.log('[analytics] identify', userId, traits ?? {});
  },
  reset: () => {
    // eslint-disable-next-line no-console
    console.log('[analytics] reset');
  },
};

const provider: Provider = __DEV__ ? devProvider : noopProvider;

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  try {
    provider.track(event, props);
  } catch {
    // analytics must never break the app
  }
}

export function identify(userId: string, traits?: AnalyticsProps): void {
  try {
    provider.identify(userId, traits);
  } catch {
    // ignore
  }
}

export function resetAnalytics(): void {
  try {
    provider.reset();
  } catch {
    // ignore
  }
}
