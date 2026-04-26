import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { MOOD_LABEL, type Mood } from '@/src/store/journal';
import { MoodIcon } from '@/src/components/ui/MoodIcon';

const MOODS: Mood[] = ['great', 'ok', 'sad', 'fussy', 'sleepy'];

type Props = {
  value?: Mood;
  onChange: (mood: Mood) => void;
  showLabels?: boolean;
};

export function MoodPicker({ value, onChange, showLabels }: Props) {
  const t = useThemedTokens();
  return (
    <View style={styles.row}>
      {MOODS.map((m) => {
        const selected = value === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: selected ? t.primarySoft : t.surface,
                borderColor: selected ? t.primary : t.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <MoodIcon mood={m} size={26} withCircle={false} />
            {showLabels && (
              <Text style={[styles.label, { color: t.textSecondary }]}>{MOOD_LABEL[m]}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: '500',
  },
});
