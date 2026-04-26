import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { LeapHeroCard } from '@/src/components/LeapHeroCard';
import { AllDoneCard } from '@/src/components/AllDoneCard';
import { InsightsCard } from '@/src/components/InsightsCard';
import { MoodPicker } from '@/src/components/MoodPicker';
import { JournalEntryCard } from '@/src/components/JournalEntryCard';
import { Card } from '@/src/components/Card';
import { ShareButton } from '@/src/components/ShareButton';
import { PermissionBanner } from '@/src/components/PermissionBanner';
import { PaywallSheet } from '@/src/components/PaywallSheet';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useChildRequired } from '@/src/store/child';
import { useJournal, journalStore, type Mood } from '@/src/store/journal';
import { computeLeapStates, getTodaySnapshot } from '@/src/lib/leaps';
import { formatAgeWithCorrection } from '@/src/lib/age';
import { track } from '@/src/lib/analytics';
import { useIsPremium } from '@/src/store/settings';

export default function TodayScreen() {
  const t = useThemedTokens();
  const child = useChildRequired();
  const journal = useJournal();
  const isPremium = useIsPremium();
  const [notifPaywallVisible, setNotifPaywallVisible] = useState(false);
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);

  const snapshot = useMemo(() => {
    const states = computeLeapStates(child.expectedDob);
    return getTodaySnapshot(states);
  }, [child.expectedDob]);

  const targetLeapNumber =
    snapshot.kind === 'active'
      ? snapshot.leap.number
      : snapshot.kind === 'pre-leap'
        ? snapshot.leap.number
        : snapshot.kind === 'calm' && snapshot.next
          ? snapshot.next.number
          : snapshot.kind === 'all-done'
            ? snapshot.last.number
            : undefined;

  const handleQuickMood = (mood: Mood) => {
    const linkedLeapNumber =
      snapshot.kind === 'active' ? snapshot.leap.number : undefined;
    journalStore.add({
      date: new Date(),
      mood,
      symptoms: [],
      note: '',
      linkedLeapNumber,
    });
    track('mood_quick_logged', { mood, linkedLeap: linkedLeapNumber ?? null });
  };

  const recent = journal.slice(0, 5);

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[typography.caption, { color: t.textSecondary }]}>Сегодня</Text>
          <Text style={[typography.title, { color: t.textPrimary }]}>
            {child.name}, {formatAgeWithCorrection(child.dob, child.expectedDob)}
          </Text>
        </View>

        {snapshot.kind === 'all-done' ? (
          <AllDoneCard />
        ) : (
          <LeapHeroCard
            snapshot={snapshot}
            onPress={() =>
              targetLeapNumber !== undefined &&
              router.push(`/leap/${targetLeapNumber}` as any)
            }
          />
        )}

        <PermissionBanner />

        {!isPremium && !notifBannerDismissed && snapshot.kind !== 'all-done' && (
          <Pressable
            onPress={() => setNotifPaywallVisible(true)}
            style={({ pressed }) => [
              styles.notifBanner,
              { backgroundColor: t.secondarySoft, borderColor: t.secondary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="notifications-outline" size={18} color={t.secondary} />
            <Text style={[typography.caption, { color: t.textSecondary, flex: 1 }]}>
              Хотите узнавать о скачке за 3 дня?
            </Text>
            <Text style={[typography.captionStrong, { color: t.secondary }]}>Premium →</Text>
            <Pressable onPress={() => setNotifBannerDismissed(true)} hitSlop={8}>
              <Ionicons name="close" size={16} color={t.textMuted} />
            </Pressable>
          </Pressable>
        )}

        <PaywallSheet
          visible={notifPaywallVisible}
          trigger="notification"
          onClose={() => setNotifPaywallVisible(false)}
        />

        <ShareButton childName={child.name} snapshot={snapshot} />

        <InsightsCard />

        <Card tone="soft">
          <Text style={[typography.subtitle, { color: t.textPrimary }]}>Как сегодня?</Text>
          <Text style={[typography.caption, { color: t.textSecondary, marginBottom: spacing.md }]}>
            Тап — и запись появится в журнале. Детали можно добавить позже.
          </Text>
          <MoodPicker onChange={handleQuickMood} />
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.subtitle, { color: t.textPrimary }]}>Недавние записи</Text>
            <Text
              onPress={() => router.push('/journal' as any)}
              style={[typography.captionStrong, { color: t.primary }]}
            >
              Все →
            </Text>
          </View>
          {recent.length === 0 ? (
            <Card>
              <Text style={[typography.body, { color: t.textSecondary }]}>
                Пока нет записей. Начните с эмодзи выше — это займёт 10 секунд.
              </Text>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {recent.map((entry) => (
                <JournalEntryCard key={entry.id} entry={entry} compact />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ height: spacing.huge }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentRow: {
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
