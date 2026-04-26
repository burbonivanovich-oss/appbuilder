import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { pluralRu } from '@/src/lib/date';
import type { LeapState } from '@/src/lib/leaps';

// Leap center weeks from EDD (same data as leaps.ts)
const LEAP_WEEKS = [5, 8, 12, 19, 26, 37, 46, 55, 64, 75] as const;
const TOTAL_WEEKS = 75;

type Props = {
  states: LeapState[];
  onSelect?: (number: number) => void;
};

type DotPoint = {
  x: number;
  y: number;
  state: LeapState;
  number: number;
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/** Maps a leap's week position onto the arc (counterclockwise sweep from left). */
function arcPoint(
  week: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): { x: number; y: number } {
  // φ goes from π (left endpoint) to 0 (right endpoint)
  // y = cy - ry * sin(φ) so the arc curves upward in screen coords
  const phi = Math.PI - (week / TOTAL_WEEKS) * Math.PI;
  return {
    x: cx + rx * Math.cos(phi),
    y: cy - ry * Math.sin(phi),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeapArc({ states, onSelect }: Props) {
  const t = useThemedTokens();
  const { width: screenWidth } = useWindowDimensions();

  // Arc canvas dimensions
  const W = screenWidth - spacing.xl * 2; // matches Screen horizontal padding
  const H = 220;
  const DOT_MARGIN = 20; // horizontal padding inside SVG so dots aren't clipped
  const cx = W / 2;
  const cy = H - 28; // arc endpoints sit near bottom of SVG view
  const rx = cx - DOT_MARGIN;
  const ry = 148; // arc height (how far above the endpoints the peak rises)

  // Pre-compute dot positions
  const dots: DotPoint[] = LEAP_WEEKS.map((week, i) => ({
    ...arcPoint(week, cx, cy, rx, ry),
    state: states[i],
    number: i + 1,
  }));

  // SVG arc path: left endpoint → right endpoint, curving upward (sweep=1)
  const arcD = `M ${DOT_MARGIN},${cy} A ${rx},${ry} 0 0 1 ${W - DOT_MARGIN},${cy}`;

  // Split arc at progress position for the "completed" coloring
  const activeIndex = dots.findIndex(
    (d) => d.state.status === 'active' || d.state.status === 'pre-leap',
  );
  const progressDot = activeIndex >= 0 ? dots[activeIndex] : dots[dots.length - 1];

  // Partial arc path from left endpoint to the progress dot
  const progressArcD =
    activeIndex > 0
      ? `M ${DOT_MARGIN},${cy} A ${rx},${ry} 0 0 1 ${progressDot.x},${progressDot.y}`
      : null;

  // Selected leap for the info card below (default: active or first pre-leap)
  const featuredState =
    states.find((s) => s.status === 'active') ??
    states.find((s) => s.status === 'pre-leap') ??
    states[states.length - 1];

  return (
    <View style={styles.wrap}>
      {/* ── Arc canvas ─────────────────────────────────────────────────────── */}
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Background arc – dashed, muted */}
          <Path
            d={arcD}
            stroke={t.border}
            strokeWidth={2}
            fill="none"
            strokeDasharray="5,5"
          />

          {/* Completed/progress arc – solid, colored */}
          {progressArcD && (
            <Path
              d={progressArcD}
              stroke={t.secondary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* ── Dots ──────────────────────────────────────────────────────── */}
          {dots.map((d, i) => {
            const isActive = d.state.status === 'active';
            const isCompleted = d.state.status === 'completed';
            const isPreLeap = d.state.status === 'pre-leap';
            const isUpcoming = d.state.status === 'upcoming';

            const r = isActive ? 18 : 14;
            const dotFill = isActive
              ? t.primary
              : isCompleted
                ? t.secondary
                : t.surface;
            const dotStroke = isActive
              ? t.primary
              : isCompleted
                ? t.secondary
                : isPreLeap
                  ? t.primary
                  : t.border;
            const dotStrokeWidth = isPreLeap ? 2 : 1;
            const labelColor =
              isActive || isCompleted ? '#FFFFFF' : isPreLeap ? t.primary : t.textMuted;

            // Label placement: above arc for middle dots, below near ends
            const labelY =
              i === 0 || i === 9
                ? d.y + 28
                : d.y - r - 10;
            const isBelowDot = i === 0 || i === 9;

            return (
              <G key={i}>
                {/* Outer glow ring for active */}
                {isActive && (
                  <Circle
                    cx={d.x}
                    cy={d.y}
                    r={r + 6}
                    fill={t.primarySoft}
                  />
                )}

                {/* Pre-leap dashed ring */}
                {isPreLeap && (
                  <Circle
                    cx={d.x}
                    cy={d.y}
                    r={r + 5}
                    fill="none"
                    stroke={t.primary}
                    strokeWidth={1}
                    strokeDasharray="3,3"
                    opacity={0.5}
                  />
                )}

                {/* Main dot (also tappable hit area) */}
                <Circle
                  cx={d.x}
                  cy={d.y}
                  r={r + 8}           // larger invisible hit area
                  fill="transparent"
                  onPress={() => onSelect?.(d.number)}
                />
                <Circle
                  cx={d.x}
                  cy={d.y}
                  r={r}
                  fill={dotFill}
                  stroke={dotStroke}
                  strokeWidth={dotStrokeWidth}
                />

                {/* Number label inside dot */}
                <SvgText
                  x={d.x}
                  y={d.y + 1}
                  fontSize={isActive ? 13 : 11}
                  fontWeight="700"
                  fill={labelColor}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {d.number}
                </SvgText>

                {/* Month label above/below dot (every other to reduce clutter) */}
                {(i === 0 || i === 4 || i === 9) && (
                  <SvgText
                    x={d.x}
                    y={labelY}
                    fontSize={9}
                    fontWeight="500"
                    fill={t.textMuted}
                    textAnchor="middle"
                    alignmentBaseline={isBelowDot ? 'hanging' : 'auto'}
                  >
                    {Math.round(LEAP_WEEKS[i] / 4.3)} мес
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      </View>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        <LegendItem color={t.primary} label="Сейчас" />
        <LegendItem color={t.secondary} label="Прошёл" />
        <LegendItem color={t.border} label="Впереди" dashed />
      </View>

      {/* ── Featured leap card ────────────────────────────────────────────── */}
      <FeaturedLeap state={featuredState} onPress={() => onSelect?.(featuredState.number)} />
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  const t = useThemedTokens();
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendLine,
          {
            backgroundColor: dashed ? 'transparent' : color,
            borderColor: color,
            borderStyle: dashed ? 'dashed' : 'solid',
            borderWidth: dashed ? 1 : 0,
          },
        ]}
      />
      <Text style={[typography.micro, { color: t.textMuted }]}>{label}</Text>
    </View>
  );
}

function FeaturedLeap({
  state,
  onPress,
}: {
  state: LeapState;
  onPress: () => void;
}) {
  const t = useThemedTokens();

  const isActive = state.status === 'active';
  const isPreLeap = state.status === 'pre-leap';
  const bg = isActive ? t.primarySoft : t.surfaceAlt;
  const border = isActive ? t.primary : t.border;

  const statusLine = (() => {
    if (isActive)
      return `Идёт · день ${state.daysIntoLeap + 1} из ${state.durationDays}`;
    if (isPreLeap) {
      const d = state.daysUntilStart;
      return `Начнётся через ${d} ${pluralRu(d, ['день', 'дня', 'дней'])}`;
    }
    if (state.status === 'upcoming') {
      const w = Math.round(state.daysUntilStart / 7);
      return `Через ≈${w} ${pluralRu(w, ['неделю', 'недели', 'недель'])}`;
    }
    const w = Math.round(state.daysSinceEnded / 7);
    return `Завершён ${w} ${pluralRu(w, ['неделю', 'недели', 'недель'])} назад`;
  })();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featured,
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[typography.captionStrong, { color: isActive ? t.primary : t.textSecondary }]}>
        СКАЧОК {state.number}
      </Text>
      <Text style={[typography.subtitle, { color: t.textPrimary }]}>{statusLine}</Text>
      <Text style={[typography.captionStrong, { color: t.primary, marginTop: spacing.xs }]}>
        Подробнее →
      </Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.xl,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  featured: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
    gap: 2,
  },
});
