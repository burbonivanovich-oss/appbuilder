import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import type { Mood } from '@/src/store/journal';

// Mood → weather metaphor:
//   great    → ☀  sun          (coral)
//   ok       → 🌤  partly cloudy (textSecondary)
//   sad      → 🌧  rain         (secondary/sage)
//   fussy    → ⛈  thunderstorm  (accent/amber)
//   sleepy   → 🌙  moon          (textMuted)

const SW = 1.5; // stroke weight, matches Ionicons outline feel

// ─── Individual icon bodies (all 24×24 viewBox) ──────────────────────────────

function SunIcon({ c }: { c: string }) {
  return (
    <G>
      <Circle cx="12" cy="12" r="4" stroke={c} strokeWidth={SW} fill="none" />
      {/* cardinal rays */}
      <Line x1="12" y1="2.5" x2="12" y2="5.2" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="18.8" x2="12" y2="21.5" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="2.5" y1="12" x2="5.2" y2="12" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="18.8" y1="12" x2="21.5" y2="12" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      {/* diagonal rays */}
      <Line x1="5.5" y1="5.5" x2="7.4" y2="7.4" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="16.6" y1="7.4" x2="18.5" y2="5.5" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="5.5" y1="18.5" x2="7.4" y2="16.6" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="16.6" y1="16.6" x2="18.5" y2="18.5" stroke={c} strokeWidth={SW} strokeLinecap="round" />
    </G>
  );
}

function PartlyCloudyIcon({ c }: { c: string }) {
  return (
    <G>
      {/* Small sun, top-right */}
      <Circle cx="17" cy="7" r="2.3" stroke={c} strokeWidth={SW} fill="none" />
      <Line x1="17" y1="3.5" x2="17" y2="4.7" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="17" y1="9.3" x2="17" y2="10.5" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="13.5" y1="7" x2="14.7" y2="7" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="19.3" y1="7" x2="20.5" y2="7" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      {/* Cloud body (covers lower-left, overlaps sun slightly) */}
      <Path
        d="M 3 16 C 3 13.8 4.8 12 7 12 C 7.3 10.2 9 9 11 9 C 13.8 9 16 11.2 16 14 C 17.3 14 18.5 15 18.5 16.5 C 18.5 17.9 17.4 19 16 19 L 5 19 C 3.9 19 3 18.1 3 17 Z"
        stroke={c}
        strokeWidth={SW}
        fill="none"
        strokeLinejoin="round"
      />
    </G>
  );
}

function RainIcon({ c }: { c: string }) {
  return (
    <G>
      {/* Cloud */}
      <Path
        d="M 4 13.5 C 4 11.3 5.8 9.5 8 9.5 C 8.3 7.5 10 6 12 6 C 15 6 17.5 8.5 17.5 11.5 C 19 11.5 20.5 12.8 20.5 14.5 C 20.5 16 19.2 17.5 17.5 17.5 L 6 17.5 C 4.9 17.5 4 16.6 4 15.5 Z"
        stroke={c}
        strokeWidth={SW}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Rain drops (diagonal lines) */}
      <Line x1="8.5" y1="19.5" x2="7" y2="22.5" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="12" y1="19.5" x2="10.5" y2="22.5" stroke={c} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="15.5" y1="19.5" x2="14" y2="22.5" stroke={c} strokeWidth={SW} strokeLinecap="round" />
    </G>
  );
}

function ThunderstormIcon({ c }: { c: string }) {
  return (
    <G>
      {/* Cloud (sits higher to leave room for bolt) */}
      <Path
        d="M 3 11 C 3 9 4.8 7.5 7 7.5 C 7.3 5.5 9 4 11 4 C 14 4 16.5 6.5 16.5 9.5 C 18 9.5 19.5 10.8 19.5 12.5 C 19.5 14 18.2 15.5 16.5 15.5 L 5 15.5 C 3.9 15.5 3 14.6 3 13.5 Z"
        stroke={c}
        strokeWidth={SW}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Lightning bolt */}
      <Path
        d="M 13.5 16.5 L 9 22 L 12.5 22 L 8.5 24"
        stroke={c}
        strokeWidth={SW}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

function MoonIcon({ c }: { c: string }) {
  return (
    <G>
      {/* Crescent: outer arc minus inner arc = crescent shape */}
      <Path
        d="M 16.5 8.5 A 8 8 0 1 0 8.5 19.5 A 6 6 0 0 1 16.5 8.5 Z"
        stroke={c}
        strokeWidth={SW}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Stars */}
      <Circle cx="19.5" cy="7" r="1" fill={c} />
      <Circle cx="20.5" cy="13" r="0.7" fill={c} />
      <Circle cx="6" cy="5.5" r="0.7" fill={c} />
    </G>
  );
}

// ─── Colour mapping (design-system tokens) ────────────────────────────────────

function useMoodColors(mood: Mood) {
  const t = useThemedTokens();
  const map: Record<Mood, { stroke: string; bg: string }> = {
    great:  { stroke: t.primary,        bg: t.primarySoft },
    ok:     { stroke: t.textSecondary,  bg: t.surfaceAlt },
    sad:    { stroke: t.secondary,      bg: t.secondarySoft },
    fussy:  { stroke: t.accent,         bg: t.surfaceAlt },
    sleepy: { stroke: t.textMuted,      bg: t.surface },
  };
  return map[mood];
}

// ─── Public component ─────────────────────────────────────────────────────────

type MoodIconProps = {
  mood: Mood;
  /** Icon size in pt. Circle diameter = size × 1.6 when withCircle=true */
  size?: number;
  /** Wrap in a tinted circle background (for MoodPicker, JournalEntryCard) */
  withCircle?: boolean;
};

export function MoodIcon({ mood, size = 24, withCircle = false }: MoodIconProps) {
  const { stroke, bg } = useMoodColors(mood);

  const icon = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {mood === 'great'  && <SunIcon c={stroke} />}
      {mood === 'ok'     && <PartlyCloudyIcon c={stroke} />}
      {mood === 'sad'    && <RainIcon c={stroke} />}
      {mood === 'fussy'  && <ThunderstormIcon c={stroke} />}
      {mood === 'sleepy' && <MoonIcon c={stroke} />}
    </Svg>
  );

  if (!withCircle) return icon;

  const circleSize = Math.round(size * 1.6);
  const borderRadius = circleSize / 2;

  return (
    <View
      style={[
        styles.circle,
        { width: circleSize, height: circleSize, borderRadius, backgroundColor: bg },
      ]}
    >
      {icon}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
