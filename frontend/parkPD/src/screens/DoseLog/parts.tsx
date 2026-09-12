import { Pressable, Text, View } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import type { DoseDraft, DoseFraction, WholeTablets } from '../../types/doseLog';
import {
  DOSE_FRACTIONS,
  FRACTION_GLYPH,
  NONE_TILE,
  WHOLE_TABLETS,
  describeDose,
} from '../../types/doseLog';
import { ordinal } from '../../utils/date';
import { useAppWidth } from '../../utils/useAppWidth';
import { styles, tileMetrics } from './DoseLogScreen.styles';

/** Which dose is being logged. Shared by both layouts' headers. */
export function DoseBadge({
  dose,
  totalDoses,
}: {
  dose: number;
  totalDoses: number;
}) {
  return (
    <View style={styles.badge}>
      <Icon name="capsule" size={13} color={colors.white} />
      <Text style={styles.badgeText}>{`DOSE ${dose} OF ${totalDoses}`}</Text>
    </View>
  );
}

/** Which dose is being logged, and how far through this one's questions. */
export function DoseHeader({
  dose,
  totalDoses,
  answered,
  totalQuestions,
  label,
  topInset,
}: {
  dose: number;
  totalDoses: number;
  /** How many of the ten this page reaches. */
  answered: number;
  totalQuestions: number;
  /** What the bar is showing; null once the dose is done. */
  label: string | null;
  topInset: number;
}) {
  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <DoseBadge dose={dose} totalDoses={totalDoses} />

      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: totalQuestions, now: answered }}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${(answered / totalQuestions) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {label ?? `${ordinal(dose)} dose complete`}
      </Text>
    </View>
  );
}

/**
 * "None" leads both rows, because either row can be the one left empty: most
 * doses are a whole number of tablets, and some are only a part of one.
 */
const WHOLE_TILES: ReadonlyArray<WholeTablets | typeof NONE_TILE> = [
  NONE_TILE,
  ...WHOLE_TABLETS,
];

const FRACTION_TILES: ReadonlyArray<DoseFraction | typeof NONE_TILE> = [
  NONE_TILE,
  ...DOSE_FRACTIONS,
];

/** Written out, because a screen reader given "\u00BC" may simply spell it. */
const FRACTION_SPOKEN: Record<DoseFraction, string> = {
  '1/4': 'a quarter',
  '1/3': 'a third',
  '1/2': 'a half',
};

/**
 * Whole tablets, then a part of one, then what the two add up to.
 *
 * Either row can be answered "None": half a tablet on its own is a dose, and
 * so is two whole ones. Only both at once is not, which is what the question's
 * validation says.
 *
 * Asked per dose rather than once for the day: the morning dose and the evening
 * one are often not the same size, and the day's plan only says how many times.
 */
export function TabletPicker({
  dose,
  onWhole,
  onFraction,
  insetX,
}: {
  dose: DoseDraft;
  onWhole: (whole: WholeTablets | null) => void;
  onFraction: (fraction: DoseFraction | null) => void;
  /** Points between the app's edges and this row - see `tileMetrics`. */
  insetX: number;
}) {
  const width = useAppWidth();
  const tile = tileMetrics(width, insetX);

  return (
    <View>
      <Text style={styles.eyebrow}>WHOLE TABLETS</Text>
      <View style={styles.tileRow}>
        {WHOLE_TILES.map(option => {
          const isNone = option === NONE_TILE;
          const isSelected = isNone
            ? dose.whole === null
            : dose.whole === option;
          return (
            <Pressable
              key={option}
              style={[
                styles.tile,
                { width: tile.whole, height: tile.whole },
                isSelected && styles.tileSelected,
              ]}
              onPress={() => onWhole(isNone ? null : (option as WholeTablets))}
              accessibilityRole="radio"
              accessibilityLabel={
                isNone
                  ? 'No whole tablet'
                  : option === 1
                  ? '1 whole tablet'
                  : `${option} whole tablets`
              }
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.tileText,
                  isNone && styles.tileTextWord,
                  isSelected && styles.tileTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.plus}>+</Text>

      <Text style={[styles.eyebrow, styles.eyebrowSpaced]}>PART TABLET</Text>
      <View style={styles.tileRow}>
        {FRACTION_TILES.map(option => {
          const isNone = option === NONE_TILE;
          const isSelected = isNone
            ? dose.fraction === null
            : dose.fraction === option;
          return (
            <Pressable
              key={option}
              style={[
                styles.tile,
                { width: tile.fraction, height: tile.fraction },
                isSelected && styles.tileSelected,
              ]}
              onPress={() =>
                onFraction(isNone ? null : (option as DoseFraction))
              }
              accessibilityRole="radio"
              accessibilityLabel={
                isNone
                  ? 'No part tablet'
                  : `${FRACTION_SPOKEN[option as DoseFraction]} of a tablet`
              }
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.tileText,
                  isNone && styles.tileTextWord,
                  isSelected && styles.tileTextSelected,
                ]}
              >
                {isNone ? option : FRACTION_GLYPH[option as DoseFraction]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.total} accessibilityLiveRegion="polite">
        <Text style={styles.totalLabel}>TOTAL DOSE</Text>
        <Text style={styles.totalValue}>{describeDose(dose)}</Text>
      </View>
    </View>
  );
}

/** The card that closes one dose before the next begins. */
export function DoseDone({
  dose,
  totalDoses,
  skipped,
}: {
  dose: number;
  totalDoses: number;
  /** Closed early because the medicine never took hold. */
  skipped: boolean;
}) {
  const isLast = dose >= totalDoses;
  return (
    <View style={styles.done}>
      <View style={styles.doneMark}>
        <Icon name="check" size={32} color={colors.primary} />
      </View>
      <Text style={styles.doneTitle}>{`Dose ${dose} logged`}</Text>
      <Text style={styles.doneText}>
        {skipped
          ? isLast
            ? 'Logged with no motor improvement noted. That was your last dose.'
            : `Logged with no motor improvement noted. Next is your ${ordinal(
                dose + 1,
              )} dose.`
          : isLast
          ? 'That was your last dose for today.'
          : `Nicely done. Next is your ${ordinal(dose + 1)} dose.`}
      </Text>
    </View>
  );
}
