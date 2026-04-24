import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { MoodPicker } from '@/src/components/MoodPicker';
import { Button } from '@/src/components/Button';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { journalStore, SYMPTOM_LABEL, type Mood, type SymptomTag } from '@/src/store/journal';
import { useChild } from '@/src/store/child';
import { computeLeapStates, getActiveLeap } from '@/src/lib/leaps';

const SYMPTOMS: SymptomTag[] = [
  'crying',
  'bad-sleep',
  'needs-contact',
  'low-appetite',
  'milestone',
  'other',
];

export default function NewEntryScreen() {
  const t = useThemedTokens();
  const params = useLocalSearchParams<{ leap?: string }>();
  const child = useChild();

  const activeLeapNumber = useMemo(() => {
    const state = getActiveLeap(computeLeapStates(child.expectedDob));
    return state?.number;
  }, [child.expectedDob]);

  const linkedLeap = params.leap ? Number(params.leap) : activeLeapNumber;

  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [symptoms, setSymptoms] = useState<Set<SymptomTag>>(new Set());
  const [note, setNote] = useState('');

  const canSave = mood !== undefined;

  const toggleSymptom = (s: SymptomTag) => {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const save = () => {
    if (!mood) return;
    journalStore.add({
      date: new Date(),
      mood,
      symptoms: Array.from(symptoms),
      note: note.trim(),
      linkedLeapNumber: linkedLeap,
    });
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: t.textSecondary }]}>Новая запись</Text>
            <Text style={[typography.title, { color: t.textPrimary }]}>
              Что происходит?
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: t.surfaceAlt }]}
          >
            <Ionicons name="close" size={20} color={t.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[typography.subtitle, { color: t.textPrimary }]}>Настроение</Text>
          <MoodPicker value={mood} onChange={setMood} showLabels />
        </View>

        <View style={styles.section}>
          <Text style={[typography.subtitle, { color: t.textPrimary }]}>Что заметили</Text>
          <View style={styles.chips}>
            {SYMPTOMS.map((s) => {
              const selected = symptoms.has(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => toggleSymptom(s)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected ? t.primarySoft : t.surface,
                      borderColor: selected ? t.primary : t.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodyStrong,
                      { color: selected ? t.primary : t.textSecondary },
                    ]}
                  >
                    {SYMPTOM_LABEL[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[typography.subtitle, { color: t.textPrimary }]}>Заметка</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Что-то особенное сегодня..."
            placeholderTextColor={t.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                color: t.textPrimary,
              },
            ]}
          />
        </View>

        {linkedLeap !== undefined && (
          <View
            style={[styles.linkedBox, { backgroundColor: t.secondarySoft, borderColor: t.secondary }]}
          >
            <Ionicons name="link-outline" size={18} color={t.secondary} />
            <Text style={[typography.caption, { color: t.textSecondary, flex: 1 }]}>
              Запись будет связана со скачком {linkedLeap}
            </Text>
          </View>
        )}

        <Button title="Сохранить" onPress={save} disabled={!canSave} size="lg" />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  input: {
    minHeight: 100,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  linkedBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
