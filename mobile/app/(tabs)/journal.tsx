import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { JournalEntryCard } from '@/src/components/JournalEntryCard';
import { Card } from '@/src/components/Card';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useJournal, type JournalEntry } from '@/src/store/journal';
import { formatRelativeDayRu, startOfDay } from '@/src/lib/date';

export default function JournalScreen() {
  const t = useThemedTokens();
  const entries = useJournal();

  const grouped = useMemo(() => groupByDay(entries), [entries]);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.caption, { color: t.textSecondary }]}>Журнал</Text>
        <Text style={[typography.title, { color: t.textPrimary }]}>
          Поведение малыша
        </Text>
      </View>

      {entries.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: t.textSecondary }]}>
            Записей пока нет. Нажмите + чтобы добавить первую.
          </Text>
        </Card>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={[typography.captionStrong, { color: t.textSecondary }]}>
                {group.label}
              </Text>
              <View style={styles.stack}>
                {group.entries.map((e) => (
                  <JournalEntryCard key={e.id} entry={e} />
                ))}
              </View>
            </View>
          ))}
          <View style={{ height: spacing.huge * 2 }} />
        </ScrollView>
      )}

      <Pressable
        onPress={() => router.push('/journal/new' as any)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}

type Group = { key: string; label: string; entries: JournalEntry[] };

function groupByDay(entries: JournalEntry[]): Group[] {
  const map = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const key = startOfDay(e.date).toISOString();
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, entries]) => ({
      key,
      label: formatRelativeDayRu(new Date(key)),
      entries,
    }));
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  scroll: {
    gap: spacing.xl,
  },
  group: {
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
