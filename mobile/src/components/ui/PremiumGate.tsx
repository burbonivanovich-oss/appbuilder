import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaywallSheet } from '@/src/components/PaywallSheet';
import { PremiumBadge } from '@/src/components/ui/PremiumBadge';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useIsPremium } from '@/src/store/settings';
import { type PaywallTrigger } from '@/src/lib/premium';

type Props = {
  children: React.ReactNode;
  trigger?: PaywallTrigger;
  lockedTitle: string;
  lockedHint?: string;
};

export function PremiumGate({ children, trigger = 'general', lockedTitle, lockedHint }: Props) {
  const isPremium = useIsPremium();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const t = useThemedTokens();

  if (isPremium) return <>{children}</>;

  return (
    <>
      <Pressable
        onPress={() => setPaywallVisible(true)}
        style={({ pressed }) => [
          styles.locked,
          {
            backgroundColor: t.surfaceAlt,
            borderColor: t.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={t.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.subtitle, { color: t.textPrimary }]}>{lockedTitle}</Text>
            {lockedHint && (
              <Text style={[typography.caption, { color: t.textSecondary, marginTop: 2 }]}>
                {lockedHint}
              </Text>
            )}
          </View>
          <PremiumBadge />
        </View>

        <View
          style={[
            styles.unlockRow,
            { borderTopColor: t.border },
          ]}
        >
          <Text style={[typography.captionStrong, { color: t.primary }]}>
            Открыть в Premium →
          </Text>
        </View>
      </Pressable>

      <PaywallSheet
        visible={paywallVisible}
        trigger={trigger}
        onClose={() => setPaywallVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  locked: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockRow: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
