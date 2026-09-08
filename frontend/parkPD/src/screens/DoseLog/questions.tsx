import { Text, View } from 'react-native';
import type { ReactNode } from 'react';
import {
  AnswerStack,
  ChipGroup,
  Duration,
  Scale,
  YesNo,
} from '../../components/Questionnaire';
import type { Answer } from '../../components/Questionnaire';
import TimeAnswer from '../../components/TimeAnswer';
import type { Escape } from '../../components/TimeAnswer';
import type { DailyActivities, Medicine } from '../../types/dailyLog';
import type { DoseDraft } from '../../types/doseLog';
import {
  ACTIVITY_LEVEL,
  DOSE_TIME_OFFSETS,
  DYSKINESIA_BODY_PARTS,
  FIRST_EFFECT_OFFSETS,
  MAX_DYSKINESIA_HOURS,
  PEAK_EFFECT_OFFSETS,
  WEAR_OFF_OFFSETS,
  doseAmount,
  dyskinesiaMinutes,
} from '../../types/doseLog';
import type { TimeOfDay } from '../../utils/date';
import { formatTime12, ordinal } from '../../utils/date';
import { TabletPicker } from './parts';
import { styles } from './DoseLogScreen.styles';

/** The nine questions asked of every dose. */
export const QUESTION_COUNT = 9;

/**
 * Answering "no motor improvement" ends the dose here: the six questions after
 * it describe a period that never began.
 */
export const FIRST_EFFECT_QUESTION = 2;

export type QuestionDef = {
  title: string;
  subtitle?: string;
  explainer?: string;
  body: ReactNode;
};

export type DoseContext = {
  dose: DoseDraft;
  /** One-based, the way the questions name it. */
  doseNumber: number;
  medicine: Medicine;
  wakeTime: TimeOfDay;
  /** The dose before this one, or null for the first of the day. */
  previous: DoseDraft | null;
  /**
   * Points the layout takes out of the window before these questions get their
   * width. The tablet tiles are sized in points, so they have to be told.
   */
  insetX: number;
  set: <K extends keyof DoseDraft>(key: K, value: DoseDraft[K]) => void;
};

/**
 * The daily-living answers, shared by three of the nine questions.
 *
 * The mark says which answer this is, yes or no; the colour says how it went.
 * Neither carries the meaning on its own - the sentence does.
 */
const ADL_ANSWERS: ReadonlyArray<Answer<DailyActivities>> = [
  {
    value: 'limited',
    mark: '✓',
    label: 'Yes, I was not able to do work',
    tone: 'bad',
  },
  { value: 'functional', mark: '✗', label: 'No, I was functional', tone: 'good' },
];

/** What is still missing on one question, in plain words. */
export function validateQuestion(
  dose: DoseDraft,
  index: number,
): string | null {
  switch (index) {
    case 0:
      return dose.doseTime === null ? 'Choose the time you took this dose' : null;
    case 1:
      // Either row on its own is an answer - half a tablet is a dose. Only
      // "None" on both leaves the question unanswered.
      return doseAmount(dose) === 0
        ? 'Choose how many tablets you took — whole tablets, a part tablet, or both'
        : null;
    case 2:
      return dose.noFirstEffect || dose.firstEffect !== null
        ? null
        : 'Choose when you first felt better, or say there was no improvement';
    case 3:
      return dose.noPeakEffect || dose.peakEffect !== null
        ? null
        : 'Choose when the medicine was at its best, or say there was no improvement';
    case 4:
      // The scale opens on a value, so it cannot be unanswered.
      return null;
    case 5:
      return dose.peakAdl === null ? 'Choose one of the two answers' : null;
    case 6:
      if (dose.dyskinesia === null) {
        return 'Choose yes or no';
      }
      if (dose.dyskinesia) {
        if (dyskinesiaMinutes(dose) === 0) {
          return 'Enter how long the dyskinesia lasted';
        }
        if (dose.dyskinesiaParts.length === 0) {
          return 'Choose at least one part of your body';
        }
        if (dose.dyskinesiaAdl === null) {
          return 'Choose one of the two answers below';
        }
      }
      return null;
    case 7:
      return dose.noWearOff || dose.wearOff !== null
        ? null
        : 'Choose when the effect wore off, or say your symptoms did not return';
    case 8:
      return dose.offAdl === null ? 'Choose one of the two answers' : null;
    default:
      return null;
  }
}

/**
 * Which questions this dose still has to answer.
 *
 * "Answered" means it would not stop the user leaving, which is why the
 * activity scale counts from the start: it opens on a value, and there is no
 * such thing as an unanswered one.
 */
export function isAnswered(dose: DoseDraft, index: number): boolean {
  return validateQuestion(dose, index) === null;
}

/** Which of the nine are being asked at all, given the answers so far. */
export function askedQuestions(dose: DoseDraft): number[] {
  const all = Array.from({ length: QUESTION_COUNT }, (_, index) => index);
  return dose.noFirstEffect
    ? all.filter(index => index <= FIRST_EFFECT_QUESTION)
    : all;
}

/**
 * The nine questions, wired to one dose.
 *
 * Built here rather than inside a screen because the same nine are laid out two
 * ways - one to a page, or all on one scroll - and the wording, the offsets and
 * the follow-ups have to be the same in both. Only the arrangement differs.
 */
export function buildQuestions(ctx: DoseContext): QuestionDef[] {
  const { dose, doseNumber, medicine, wakeTime, previous, insetX, set } = ctx;

  /**
   * What Q1's offsets are measured from.
   *
   * Waking up, for the first dose. After that it is the moment the dose before
   * it wore off - which is when the next one is actually reached for. A dose
   * whose effect never wore off gives the chain nothing to hang on, so there
   * are simply no suggestions: an offset from a time that means something else
   * would be a worse answer than the clock on its own.
   */
  const previousWoreOff =
    previous !== null && !previous.noWearOff && previous.wearOff !== null;
  const doseAnchor: TimeOfDay | null =
    previous === null ? wakeTime : previousWoreOff ? previous.wearOff : null;

  const doseAnchorPhrase =
    previous === null
      ? 'after waking up'
      : `after the ${medicine} effect wore off`;

  const doseSubtitle =
    previous === null
      ? `You woke up at ${formatTime12(wakeTime)} — pick how long after that you took your dose.`
      : doseAnchor === null
      ? `Your ${ordinal(doseNumber - 1)} dose had no wear-off time, so pick this one on the clock.`
      : `Your ${medicine} wore off at ${formatTime12(doseAnchor)} — pick how long after that you took this dose.`;

  const takenAt =
    dose.doseTime === null
      ? 'Dose time not set yet'
      : `Dose taken at ${formatTime12(dose.doseTime)}`;

  /** One time question's worth of wiring - four of the nine are this shape. */
  const timeQuestion = (
    value: TimeOfDay | null,
    onChange: (time: TimeOfDay) => void,
    label: string,
    anchor: TimeOfDay | null,
    anchorPhrase: string,
    offsets: readonly number[],
    noAnchorHint: string,
    escape?: Escape,
  ) => (
    <TimeAnswer
      value={value}
      onChange={onChange}
      label={label}
      pickerTitle={label.toUpperCase()}
      anchor={anchor}
      anchorPhrase={anchorPhrase}
      offsets={offsets}
      noAnchorHint={noAnchorHint}
      escape={escape}
    />
  );

  return [
    {
      title: `When did you take your ${ordinal(doseNumber)} dose?`,
      subtitle: doseSubtitle,
      body: timeQuestion(
        dose.doseTime,
        time => set('doseTime', time),
        'Dose time',
        doseAnchor,
        doseAnchorPhrase,
        DOSE_TIME_OFFSETS,
        'There is no wear-off time to count from, so choose this dose’s time on the clock above.',
      ),
    },

    {
      title: `How many tablets of ${medicine} did you take for the ${ordinal(
        doseNumber,
      )} dose?`,
      subtitle:
        'Pick whole tablets, a part tablet, or both — whatever adds up to what you took.',
      body: (
        <TabletPicker
          dose={dose}
          onWhole={whole => set('whole', whole)}
          onFraction={fraction => set('fraction', fraction)}
          insetX={insetX}
        />
      ),
    },

    {
      title: `After taking ${medicine}, how long did it take to feel the first improvement in motor activity?`,
      subtitle: takenAt,
      explainer:
        'Motor improvement means noticing that stiffness reduces, tremor decreases, movements become easier or faster, or you feel more in control of your body — any positive change after taking the medicine.',
      body: timeQuestion(
        dose.firstEffect,
        time => set('firstEffect', time),
        'First improvement',
        dose.doseTime,
        `after taking ${medicine}`,
        FIRST_EFFECT_OFFSETS,
        'Choose the time on the clock above.',
        {
          label: 'No motor improvement',
          tone: 'bad',
          selected: dose.noFirstEffect,
          onPress: () => {
            const next = !dose.noFirstEffect;
            set('noFirstEffect', next);
            if (next) {
              set('firstEffect', null);
            }
          },
        },
      ),
    },

    {
      title:
        'How long did it take to feel the maximum improvement (peak effect)?',
      subtitle: takenAt,
      explainer:
        'Peak effect is when the medicine is working at its absolute best — movements are smoothest, stiffness is least, and you feel most functional. This usually comes after the first improvement and before symptoms start returning.',
      body: timeQuestion(
        dose.peakEffect,
        time => set('peakEffect', time),
        'Peak effect',
        dose.doseTime,
        `after taking ${medicine}`,
        PEAK_EFFECT_OFFSETS,
        'Choose the time on the clock above.',
        {
          label: 'No peak improvement',
          tone: 'bad',
          selected: dose.noPeakEffect,
          onPress: () => {
            const next = !dose.noPeakEffect;
            set('noPeakEffect', next);
            if (next) {
              set('peakEffect', null);
            }
          },
        },
      ),
    },

    {
      title:
        'What was your activity level when the medicine was working at its best?',
      subtitle: 'Rate how active you were during the peak effect period.',
      body: (
        <Scale
          value={dose.activityLevel}
          onChange={value => set('activityLevel', value)}
          min={ACTIVITY_LEVEL.min}
          max={ACTIVITY_LEVEL.max}
          step={ACTIVITY_LEVEL.step}
          minLabel="Low"
          maxLabel="High"
          accessibilityLabel="Your activity level at peak effect, as a percentage"
        />
      ),
    },

    {
      title: 'At peak, were your activities of daily living affected?',
      subtitle:
        'During the period when the medicine was working at its best, did your symptoms still limit what you could do day-to-day?',
      body: (
        <AnswerStack
          options={ADL_ANSWERS}
          value={dose.peakAdl}
          onChange={value => set('peakAdl', value)}
        />
      ),
    },

    {
      title: 'Did you experience dyskinesia during this period?',
      explainer: `Dyskinesia refers to abnormal involuntary movements — writhing, twisting or jerking, often caused by long-term ${medicine} use.`,
      body: (
        <View>
          <YesNo
            value={dose.dyskinesia}
            onChange={value => set('dyskinesia', value)}
          />

          {dose.dyskinesia === true && (
            <View style={styles.unfold}>
              <View style={styles.subBlock}>
                <Text style={styles.subLabel}>For how long?</Text>
                <Duration
                  hours={dose.dyskinesiaHours}
                  minutes={dose.dyskinesiaMinutes}
                  onChange={next => {
                    set('dyskinesiaHours', next.hours);
                    set('dyskinesiaMinutes', next.minutes);
                  }}
                  maxHours={MAX_DYSKINESIA_HOURS}
                />
              </View>

              <View style={styles.subBlock}>
                <Text style={styles.subLabel}>
                  Which part of your body was affected?
                </Text>
                <ChipGroup
                  options={DYSKINESIA_BODY_PARTS}
                  selected={dose.dyskinesiaParts}
                  onToggle={option =>
                    set(
                      'dyskinesiaParts',
                      dose.dyskinesiaParts.includes(option)
                        ? dose.dyskinesiaParts.filter(part => part !== option)
                        : [...dose.dyskinesiaParts, option],
                    )
                  }
                />
              </View>

              <View>
                <Text style={styles.subLabel}>
                  Were your activities of daily living affected because of
                  the dyskinesia?
                </Text>
                <AnswerStack
                  options={ADL_ANSWERS}
                  value={dose.dyskinesiaAdl}
                  onChange={value => set('dyskinesiaAdl', value)}
                />
              </View>
            </View>
          )}
        </View>
      ),
    },

    {
      title: `When did your symptoms start returning and ${medicine}'s effect begin to wear off?`,
      subtitle: takenAt,
      body: timeQuestion(
        dose.wearOff,
        time => set('wearOff', time),
        'Wear-off time',
        dose.doseTime,
        `after taking ${medicine}`,
        WEAR_OFF_OFFSETS,
        'Choose the time on the clock above.',
        {
          label: 'Symptoms did not return',
          tone: 'good',
          selected: dose.noWearOff,
          onPress: () => {
            const next = !dose.noWearOff;
            set('noWearOff', next);
            if (next) {
              set('wearOff', null);
            }
          },
        },
      ),
    },

    {
      title:
        'After the medicine’s effect wore off, were your daily activities affected?',
      subtitle:
        'During the "off" period — before your next dose — did the return of symptoms significantly affect what you could do?',
      body: (
        <AnswerStack
          options={ADL_ANSWERS}
          value={dose.offAdl}
          onChange={value => set('offAdl', value)}
        />
      ),
    },
  ];
}
