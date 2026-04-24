import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

type ButtonProps = PressableProps & {
  title: string;
  variant?: Variant;
  size?: Size;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  style,
  ...rest
}: ButtonProps) {
  const t = useThemedTokens();

  const bg =
    variant === 'primary' ? t.primary : variant === 'secondary' ? t.surfaceAlt : 'transparent';
  const fg =
    variant === 'primary' ? '#FFFFFF' : variant === 'secondary' ? t.textPrimary : t.primary;
  const border =
    variant === 'secondary' ? t.border : variant === 'ghost' ? 'transparent' : bg;

  const paddingVertical = size === 'lg' ? spacing.lg : spacing.md;
  const fontSize = size === 'lg' ? 17 : 15;

  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingVertical,
          opacity: pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? undefined : style,
      ]}
    >
      <Text style={[styles.label, { color: fg, fontSize }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: {
    fontWeight: '600',
  },
});
