import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

type Props = {
  size?: 'sm' | 'md';
};

export function PremiumBadge({ size = 'sm' }: Props) {
  const t = useThemedTokens();
  const iconSize = size === 'md' ? 13 : 11;
  const fontSize = size === 'md' ? 12 : 10;
  const px = size === 'md' ? spacing.sm : spacing.xs + 2;
  const py = size === 'md' ? 3 : 2;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: t.accent,
          paddingHorizontal: px,
          paddingVertical: py,
        },
      ]}
    >
      <Ionicons name="star" size={iconSize} color="#FFFFFF" />
      <Text style={[styles.label, { fontSize, lineHeight: fontSize + 4 }]}>Premium</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
