import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { buildShareText } from '@/src/lib/share';
import { track } from '@/src/lib/analytics';
import type { TodaySnapshot } from '@/src/lib/leaps';

type Props = {
  childName: string;
  snapshot: TodaySnapshot;
};

export function ShareButton({ childName, snapshot }: Props) {
  const t = useThemedTokens();
  const payload = buildShareText({ childName, snapshot });

  if (!payload) return null;

  const handlePress = async () => {
    track('share_used', { snapshotKind: snapshot.kind, platform: Platform.OS });
    try {
      if (Platform.OS === 'web') {
        const navAny = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
        if (navAny?.share) {
          await navAny.share({ title: payload.title, text: payload.message });
          return;
        }
        if (navAny?.clipboard?.writeText) {
          await navAny.clipboard.writeText(payload.message);
          if (typeof window !== 'undefined') {
            window.alert('Текст скопирован — можно вставить партнёру.');
          }
          return;
        }
        if (typeof window !== 'undefined') {
          window.alert(payload.message);
        }
        return;
      }
      await Share.share({ title: payload.title, message: payload.message });
    } catch (e) {
      Alert.alert('Не удалось поделиться', 'Попробуйте ещё раз.');
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name="share-social-outline" size={18} color={t.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyStrong, { color: t.textPrimary }]}>
            Поделиться с партнёром
          </Text>
          <Text style={[typography.caption, { color: t.textSecondary }]}>
            Готовый текст в один тап
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
