import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useSettings, settingsStore } from '@/src/store/settings';
import { useAuth } from '@/src/store/auth';
import { useChild } from '@/src/store/child';

/**
 * Shown once after the user has signed in AND created a child profile.
 * Sets expectations that the app is informational, not medical, and points
 * to the pediatrician for anything serious.
 */
export function DisclaimerModal() {
  const t = useThemedTokens();
  const { user } = useAuth();
  const child = useChild();
  const { disclaimerAccepted } = useSettings();

  const visible = !!user && !!child && !disclaimerAccepted;

  return (
    <Modal animationType="fade" transparent={false} visible={visible}>
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconWrap, { backgroundColor: t.primarySoft }]}>
            <Ionicons name="medkit-outline" size={32} color={t.primary} />
          </View>
          <Text style={[typography.title, styles.heading, { color: t.textPrimary }]}>
            Несколько слов перед стартом
          </Text>

          <Section
            title="Это не медицинский совет"
            body="«Рост малыша» помогает наблюдать и записывать развитие — но не заменяет педиатра. Информация о скачках основана на работе психологов Plooij и Plas-Plooij и носит ориентировочный характер."
          />
          <Section
            title="Каждый малыш — свой"
            body="Сроки скачков плавают на 1–2 недели в обе стороны. Если ваш ребёнок ведёт себя иначе — это нормально."
          />
          <Section
            title="Когда обращаться к врачу"
            body="Если что-то всерьёз беспокоит — высокая температура, отказ от еды или питья дольше суток, необычная сонливость или возбуждение — пожалуйста, свяжитесь с педиатром."
          />
          <Section
            title="Ваши данные — ваши"
            body="Записи журнала и профиль малыша хранятся локально на устройстве. Мы не передаём их третьим лицам без вашего согласия."
          />
        </ScrollView>

        <View style={[styles.footer, { borderColor: t.border, backgroundColor: t.bg }]}>
          <Pressable
            onPress={() => settingsStore.acceptDisclaimer()}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>
              Я понимаю, продолжить
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  const t = useThemedTokens();
  return (
    <View style={styles.section}>
      <Text style={[typography.subtitle, { color: t.textPrimary }]}>{title}</Text>
      <Text style={[typography.body, { color: t.textSecondary, marginTop: spacing.xs }]}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  heading: {
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
  },
  btn: {
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
