import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { JournalEntryCard } from '@/src/components/JournalEntryCard';
import { Card } from '@/src/components/Card';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { journalStore, useJournal, type JournalEntry } from '@/src/store/journal';
import { formatRelativeDayRu, startOfDay } from '@/src/lib/date';
import {
  applyFilter,
  countByFilter,
  FILTER_LABELS,
  FILTER_ORDER,
  type JournalFilter,
} from '@/src/lib/journalFilters';

export default function JournalScreen() {
  const t = useThemedTokens();
  const entries = useJournal();
  const [filter, setFilter] = useState<JournalFilter>('all');

  const filtered = useMemo(() => applyFilter(entries, filter), [entries, filter]);
  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  const handleDelete = (entry: JournalEntry) => {
    const confirm = () => journalStore.remove(entry.id);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Удалить запись?')) {
        confirm();
      }
    } else {
      Alert.alert('Удалить запись?', 'Это действие нельзя отменить.', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: confirm },
      ]);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.caption, { color: t.textSecondary }]}>Журнал</Text>
        <Text style={[typography.title, { color: t.textPrimary }]}>
          Поведение малыша
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_ORDER.map((f) => {
          const selected = f === filter;
          const count = countByFilter(entries, f);
          if (f !== 'all' && count === 0) return null;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: selected ? t.primary : t.surface,
                  borderColor: selected ? t.primary : t.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  typography.captionStrong,
                  { color: selected ? '#FFFFFF' : t.textPrimary },
                ]}
              >
                {FILTER_LABELS[f]}
                {f === 'all' ? '' : ` · ${count}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: t.textSecondary }]}>
            {entries.length === 0
              ? 'Записей пока нет. Нажмите + чтобы добавить первую.'
              : 'Под этот фильтр записей нет.'}
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
                  <View key={e.id} style={styles.entryRow}>
                    <View style={{ flex: 1 }}>
                      <JournalEntryCard entry={e} />
                    </View>
                    <Pressable
                      onPress={() => handleDelete(e)}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        {
                          backgroundColor: t.surface,
                          borderColor: t.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={18} color={t.error} />
                    </Pressable>
                  </View>
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
    paddingBottom: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingRight: spacing.xl,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
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
  entryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
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
