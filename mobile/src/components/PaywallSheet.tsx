import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/Button';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { settingsStore } from '@/src/store/settings';
import { track } from '@/src/lib/analytics';
import { type PaywallTrigger, PAYWALL_HEADLINE, PAYWALL_SUBTITLE } from '@/src/lib/premium';

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'bulb-outline', text: 'Советы что делать во время каждого скачка' },
  { icon: 'notifications-outline', text: 'Уведомление за 3 дня до начала скачка' },
  { icon: 'analytics-outline', text: 'Подробная аналитика журнала' },
  { icon: 'people-outline', text: 'Еженедельный дайджест для партнёра' },
  { icon: 'document-text-outline', text: 'Экспорт данных PDF для педиатра' },
];

type Props = {
  visible: boolean;
  trigger?: PaywallTrigger;
  onClose: () => void;
};

export function PaywallSheet({ visible, trigger = 'general', onClose }: Props) {
  const t = useThemedTokens();

  const handleSubscribe = (plan: 'monthly' | 'annual') => {
    // Stub: real in-app purchase integration goes here (RevenueCat / Adapty)
    track('paywall_subscribe_tapped', { trigger, plan });
    settingsStore.activatePremium();
    onClose();
  };

  const handleClose = () => {
    track('paywall_dismissed', { trigger });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.title, { color: t.textPrimary }]}>
                {PAYWALL_HEADLINE[trigger]}
              </Text>
              <Text
                style={[typography.body, { color: t.textSecondary, marginTop: spacing.sm }]}
              >
                {PAYWALL_SUBTITLE[trigger]}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={[styles.closeBtn, { backgroundColor: t.surfaceAlt }]}
            >
              <Ionicons name="close" size={20} color={t.textSecondary} />
            </Pressable>
          </View>

          {/* Feature list */}
          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={[styles.iconWrap, { backgroundColor: t.primarySoft }]}>
                  <Ionicons name={f.icon} size={18} color={t.primary} />
                </View>
                <Text style={[typography.body, { color: t.textPrimary, flex: 1 }]}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Pricing */}
          <View style={[styles.pricingBlock, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
            <Pressable
              onPress={() => handleSubscribe('annual')}
              style={[
                styles.planRow,
                styles.planBest,
                { borderColor: t.primary, backgroundColor: t.primarySoft },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.planLabelRow}>
                  <Text style={[typography.bodyStrong, { color: t.textPrimary }]}>
                    Годовая подписка
                  </Text>
                  <View style={[styles.bestBadge, { backgroundColor: t.primary }]}>
                    <Text style={[typography.micro, { color: '#FFFFFF' }]}>ВЫГОДНЕЕ</Text>
                  </View>
                </View>
                <Text style={[typography.caption, { color: t.textSecondary }]}>
                  ₽83/мес · списывается ₽999 раз в год
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={t.primary} />
            </Pressable>

            <Pressable
              onPress={() => handleSubscribe('monthly')}
              style={[styles.planRow, { borderColor: t.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: t.textPrimary }]}>
                  Месячная подписка
                </Text>
                <Text style={[typography.caption, { color: t.textSecondary }]}>
                  ₽149/мес
                </Text>
              </View>
            </Pressable>
          </View>

          {/* CTA */}
          <Button
            title="Попробовать бесплатно 7 дней"
            size="lg"
            onPress={() => handleSubscribe('annual')}
          />

          <Text
            style={[
              typography.caption,
              { color: t.textMuted, textAlign: 'center', marginTop: spacing.sm },
            ]}
          >
            Затем ₽999/год. Отменить можно в любой момент.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: spacing.huge,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  scroll: {
    gap: spacing.xl,
    padding: spacing.xl,
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
  features: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingBlock: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 0,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 0,
    gap: spacing.md,
  },
  planBest: {
    borderBottomWidth: 1,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  bestBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
