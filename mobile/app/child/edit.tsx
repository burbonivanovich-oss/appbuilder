import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ChildForm } from '@/src/components/ChildForm';
import { Button } from '@/src/components/Button';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { childStore, useChildRequired } from '@/src/store/child';
import { track } from '@/src/lib/analytics';

export default function EditChildScreen() {
  const t = useThemedTokens();
  const child = useChildRequired();

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: t.textSecondary }]}>Профиль</Text>
            <Text style={[typography.title, { color: t.textPrimary }]}>Редактировать малыша</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: t.surfaceAlt }]}
          >
            <Ionicons name="close" size={20} color={t.textSecondary} />
          </Pressable>
        </View>

        <ChildForm
          initial={child}
          footerNote="При смене ДР пересчитаются все 10 скачков."
          onSubmit={(values) => {
            childStore.update(values);
            track('child_updated');
            router.back();
          }}
          renderSubmit={({ onPress, disabled, error }) => (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              {error && (
                <Text style={[typography.caption, { color: t.error, textAlign: 'center' }]}>
                  {error}
                </Text>
              )}
              <Button title="Сохранить" size="lg" onPress={onPress} disabled={disabled} />
            </View>
          )}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
