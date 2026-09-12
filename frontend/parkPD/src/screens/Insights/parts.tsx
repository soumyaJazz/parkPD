import { Pressable, Text, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import Icon from '../../components/Icon';
import { activity, colors, fontWeight } from '../../theme';
import type { ActivityState, StateTotals } from '../../types/insights';
import { formatDuration } from '../../utils/date';
import type { ChartModel, Period } from './chart';
import {
  CHIP_HEIGHT,
  DOSE_MARKER_RADIUS,
  DYSKINESIA_MARKER_RADIUS,
  STATE_COPY,
  STATE_DASH,
} from './chart';
import { styles } from './InsightsScreen.styles';

/** The order the three states are always listed in - best day first. */
export const STATES: readonly ActivityState[] = ['on', 'transition', 'off'];

/** Axis type. 14 is the floor this project sets for any text at all. */
const AXIS_FONT = 14;

/**
 * The hand-with-movement-lines glyph, for drawing inside the chart.
 *
 * The same paths as the `dyskinesia` entry in `components/Icon`, repeated here
 * rather than reached for through `<Icon>`: inside an `<Svg>` the glyph has to
 * be a `<G>` placed at a point on the plot, and `Icon` draws its own `<Svg>`
 * with its own viewBox, which cannot be positioned that way. The word for it is
 * in the key below the chart and on every written period, so the picture never
 * carries the meaning by itself.
 */
const HAND_PATHS = [
  'M5.00 10 L5.00 4.15 A0.55 0.55 0 0 1 6.10 4.15 L6.10 10 Z',
  'M6.325 10 L6.325 2.85 A0.55 0.55 0 0 1 7.425 2.85 L7.425 10 Z',
  'M7.65 10 L7.65 2.55 A0.55 0.55 0 0 1 8.75 2.55 L8.75 10 Z',
  'M8.975 10 L8.975 3.75 A0.55 0.55 0 0 1 10.075 3.75 L10.075 10 Z',
  'M10.30 10 L10.30 6.35 A0.55 0.55 0 0 1 11.40 6.35 L11.40 10 Z',
  'M5.00 9 L11.40 9 L11.40 13.2 A1.4 1.4 0 0 1 10.00 14.6 L6.40 14.6 A1.4 1.4 0 0 1 5.00 13.2 Z',
  'M3.65 4.6 L2.35 6.05 L3.65 7.5 L2.35 8.95 L3.65 10.4 L2.75 10.4 L1.45 8.95 L2.75 7.5 L1.45 6.05 L2.75 4.6 Z',
  'M12.35 4.6 L13.65 6.05 L12.35 7.5 L13.65 8.95 L12.35 10.4 L13.25 10.4 L14.55 8.95 L13.25 7.5 L14.55 6.05 L13.25 4.6 Z',
];

/** How big the glyph is drawn inside its marker, in points. */
const HAND_SIZE = 17;

/**
 * The day, drawn.
 *
 * Three signals carry each state and none of them is the colour on its own: the
 * stroke's dash pattern, the word on the chip where a stretch is long enough to
 * hold one, and the key underneath. The exact times are deliberately not on the
 * axis - a day of doses cannot hold eight of them at a readable size - so the
 * axis names the two ends and numbers each dose, and every exact time is in the
 * written list below.
 *
 * The whole thing is one accessibility node with a sentence for a label. A
 * chart read out shape by shape is noise.
 */
export function ActivityChart({
  model,
  label,
}: {
  model: ChartModel;
  label: string;
}) {
  const { plot } = model;
  const baseline = plot.top + plot.height;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={model.width} height={model.height}>
        {model.grid.map(gridLine => (
          <Line
            key={`grid-${gridLine.y}`}
            x1={plot.left}
            y1={gridLine.y}
            x2={plot.left + plot.width}
            y2={gridLine.y}
            stroke={colors.divider}
            strokeWidth={1}
          />
        ))}

        {model.grid
          .filter(gridLine => gridLine.label !== null)
          .map(gridLine => (
            <SvgText
              key={`ylabel-${gridLine.y}`}
              x={plot.left - 8}
              y={gridLine.y + 5}
              textAnchor="end"
              fontSize={AXIS_FONT}
              fill={colors.subtext}
            >
              {gridLine.label}
            </SvgText>
          ))}

        {/* A guide from each dose down to its numbered marker, so the mark on
            the axis and the moment on the line are visibly the same event. */}
        {model.doses.map(dose => (
          <Line
            key={`guide-${dose.key}`}
            x1={dose.x}
            y1={plot.top}
            x2={dose.x}
            y2={baseline}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray={[2, 5]}
          />
        ))}

        <Line
          x1={plot.left}
          y1={baseline}
          x2={plot.left + plot.width}
          y2={baseline}
          stroke={colors.border}
          strokeWidth={1.5}
        />

        {/* Under the coloured line, so a stretch that was recorded always wins
            the pixel where the two meet. */}
        {model.gaps.map(gap => (
          <Line
            key={gap.key}
            x1={gap.x1}
            y1={gap.y1}
            x2={gap.x2}
            y2={gap.y2}
            stroke={activity.unrecorded.line}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={[1, 5]}
          />
        ))}

        {model.lines.map(line => (
          <Line
            key={line.key}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={activity[line.state].line}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={STATE_DASH[line.state]}
          />
        ))}

        {model.chips.map(chip => (
          <Rect
            key={`${chip.key}-box`}
            x={chip.x}
            y={chip.y}
            width={chip.width}
            height={CHIP_HEIGHT}
            rx={CHIP_HEIGHT / 2}
            fill={activity[chip.state].bg}
            stroke={activity[chip.state].border}
            strokeWidth={1}
          />
        ))}
        {model.chips.map(chip => (
          <SvgText
            key={`${chip.key}-text`}
            x={chip.x + chip.width / 2}
            y={chip.y + CHIP_HEIGHT / 2 + 5}
            textAnchor="middle"
            fontSize={AXIS_FONT}
            fontWeight={fontWeight.semibold}
            fill={activity[chip.state].text}
          >
            {chip.label}
          </SvgText>
        ))}

        {model.dyskinesia.map(mark => (
          <Circle
            key={`${mark.key}-ring`}
            cx={mark.x}
            cy={mark.y}
            r={DYSKINESIA_MARKER_RADIUS}
            fill={colors.background}
            stroke={colors.text}
            strokeWidth={1.5}
          />
        ))}
        {model.dyskinesia.map(mark => (
          <G
            key={`${mark.key}-hand`}
            // Drawn on a 16-unit grid, so it is scaled to the size wanted and
            // then moved so its centre lands on the mark.
            transform={`translate(${mark.x - HAND_SIZE / 2}, ${
              mark.y - HAND_SIZE / 2
            }) scale(${HAND_SIZE / 16})`}
          >
            {HAND_PATHS.map((d, index) => (
              <Path key={index} d={d} fill={colors.text} />
            ))}
          </G>
        ))}

        {model.doses.map(dose => (
          <Circle
            key={`${dose.key}-ring`}
            cx={dose.x}
            cy={baseline + 20}
            r={DOSE_MARKER_RADIUS}
            fill={colors.background}
            stroke={colors.primary}
            strokeWidth={1.5}
          />
        ))}
        {model.doses.map(dose => (
          <SvgText
            key={`${dose.key}-number`}
            x={dose.x}
            y={baseline + 25}
            textAnchor="middle"
            fontSize={AXIS_FONT}
            fontWeight={fontWeight.semibold}
            fill={colors.primary}
          >
            {String(dose.number)}
          </SvgText>
        ))}

        <SvgText
          x={plot.left}
          y={baseline + 48}
          textAnchor="start"
          fontSize={AXIS_FONT}
          fill={colors.subtext}
        >
          {model.startLabel}
        </SvgText>
        <SvgText
          x={plot.left + plot.width}
          y={baseline + 48}
          textAnchor="end"
          fontSize={AXIS_FONT}
          fill={colors.subtext}
        >
          {model.endLabel}
        </SvgText>
      </Svg>
    </View>
  );
}

/**
 * What each line style means.
 *
 * A legend, but one matched by shape rather than by hue: each row shows the
 * dash pattern the chart actually draws, beside the word. It is the third way
 * the states are told apart, after the chips on the long stretches and the
 * written list below, and it is the one that covers the short stretches no
 * label will fit on.
 */
export function PatternKey() {
  return (
    <View style={styles.keyRow}>
      {STATES.map(state => (
        <View
          key={state}
          style={styles.keyItem}
          accessible
          accessibilityLabel={`${STATE_COPY[state].short}, ${STATE_COPY[state].clinical}`}
        >
          <Svg width={30} height={10}>
            <Line
              x1={2}
              y1={5}
              x2={28}
              y2={5}
              stroke={activity[state].line}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={STATE_DASH[state]}
            />
          </Svg>
          <Text style={styles.keyLabel}>{STATE_COPY[state].short}</Text>
        </View>
      ))}

      <View
        style={styles.keyItem}
        accessible
        accessibilityLabel="A hand with movement lines marks involuntary movements, also called dyskinesia"
      >
        <Icon name="dyskinesia" size={18} color={colors.text} />
        <Text style={styles.keyLabel}>Involuntary movements</Text>
      </View>
    </View>
  );
}

/**
 * The three figures.
 *
 * Icon, plain word, clinical term and duration on every card, so none of it
 * rests on the green/amber/red. The note underneath is the fourth number: what
 * the three add up to, and what they therefore do not cover.
 */
export function Totals({ totals }: { totals: StateTotals }) {
  const minutes: Record<ActivityState, number> = {
    on: totals.on_minutes,
    transition: totals.transition_minutes,
    off: totals.off_minutes,
  };

  return (
    <View style={styles.totalsGrid}>
      {STATES.map(state => {
        const copy = STATE_COPY[state];
        const tint = activity[state];
        return (
          <View
            key={state}
            style={[
              styles.total,
              { backgroundColor: tint.bg, borderColor: tint.border },
            ]}
            accessible
            accessibilityLabel={`${copy.short}, ${
              copy.clinical
            }, ${formatDuration(minutes[state])}`}
          >
            <View style={styles.totalIcon}>
              <Icon name={copy.icon} size={16} color={tint.text} />
            </View>
            <View style={styles.totalText}>
              <Text style={styles.totalLabel}>{copy.short}</Text>
              <Text style={styles.totalClinical}>{copy.clinical}</Text>
            </View>
            <Text style={[styles.totalValue, { color: tint.text }]}>
              {formatDuration(minutes[state])}
            </Text>
          </View>
        );
      })}

      <Text style={styles.totalsNote}>
        {`These add up to ${formatDuration(
          totals.recorded_minutes,
        )}, counted from your first dose onwards. The time before your first dose is not included, because no activity level was recorded for it.`}
      </Text>
    </View>
  );
}

/**
 * Every stretch of the day, written out.
 *
 * Not a fallback for the chart. It carries the exact times the axis has no room
 * for, it is the only form of this a screen reader can follow, and it is what
 * the reader who does not get on with charts is left with - so it holds
 * everything, not a summary.
 */
export function Periods({ periods }: { periods: Period[] }) {
  return (
    <View>
      {periods.map((period, index) => {
        const copy = STATE_COPY[period.state];
        const tint = activity[period.state];
        return (
          <View
            key={period.key}
            style={[styles.period, index === 0 && styles.periodFirst]}
            accessible
            accessibilityLabel={[
              `${period.time}.`,
              `${copy.short}, ${copy.clinical}.`,
              `${period.duration}.`,
              `${period.level}.`,
              period.movements ?? '',
            ]
              .join(' ')
              .trim()}
          >
            <View style={[styles.periodRule, { backgroundColor: tint.line }]} />
            <View style={styles.periodText}>
              <Text style={styles.periodTime}>{period.time}</Text>
              <Text style={[styles.periodState, { color: tint.text }]}>
                {`${copy.short} - ${copy.clinical.toLowerCase()}`}
              </Text>
              <Text style={styles.periodDetail}>
                {`${period.duration} - ${period.level}`}
              </Text>
              {period.movements !== null && (
                <View style={styles.movements}>
                  <Icon name="dyskinesia" size={16} color={colors.text} />
                  <Text style={styles.movementsText}>{period.movements}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * What the screen says while it is waiting, and when it could not ask.
 *
 * Both in words. A spinner alone says nothing about which of the two is
 * happening, and this screen's empty state and its failed state look identical
 * otherwise.
 */
export function Notice({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error !== null) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeError}>{error}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try loading your chart again"
        >
          <Text style={styles.actionText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.notice}>
        <Text style={styles.body}>Loading your chart...</Text>
      </View>
    );
  }

  return null;
}
