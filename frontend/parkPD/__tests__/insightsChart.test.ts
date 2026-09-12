import {
  buildChart,
  buildPeriods,
  chartAccessibilityLabel,
  describeChart,
  describeDyskinesia,
  describeTotals,
} from '../src/screens/Insights/chart';
import type {
  ActivitySpan,
  DayInsights,
  DoseMarker,
} from '../src/types/insights';

/**
 * The day from the notebook page this screen was drawn from, run through the
 * geometry.
 *
 * One dose at 6am that takes an hour to be felt, peaks at 8 and wears off at
 * 11, and a second at noon that peaks at 2 and holds until 7 in the evening.
 * Eight hours on, three in transition, two off - which is what was written
 * under the sketch, and what the three views are supposed to produce.
 *
 * Instants are built from local parts rather than written out as UTC, so the
 * suite gives the same answer in every timezone it is run in.
 */
const LOG_DATE = '2026-09-11';

function at(hour: number, minute = 0): string {
  return new Date(2026, 8, 11, hour, minute, 0, 0).toISOString();
}

function span(
  doseNumber: number,
  state: ActivitySpan['state'],
  fromHour: number,
  toHour: number,
  pctStart: number,
  pctEnd: number,
): ActivitySpan {
  return {
    dose_number: doseNumber,
    state,
    starts_at: at(fromHour),
    ends_at: at(toHour),
    pct_start: pctStart,
    pct_end: pctEnd,
  };
}

const SPANS: ActivitySpan[] = [
  span(1, 'off', 6, 7, 50, 50),
  span(1, 'transition', 7, 8, 50, 75),
  span(1, 'on', 8, 11, 75, 75),
  span(1, 'transition', 11, 12, 75, 50),
  span(2, 'off', 12, 13, 50, 50),
  span(2, 'transition', 13, 14, 50, 75),
  span(2, 'on', 14, 19, 75, 75),
];

const DAY: DayInsights = {
  log_date: LOG_DATE,
  medicine_name: 'Syndopa',
  dose_count: 2,
  side_effects: ['Tremor'],
  window: { starts_at: at(6), ends_at: at(19) },
  doses: [
    {
      dose_number: 1,
      dose_time: at(6),
      tablets_count: '1.000',
      dyskinesia: null,
    },
    {
      dose_number: 2,
      dose_time: at(12),
      tablets_count: '1.000',
      dyskinesia: null,
    },
  ],
  spans: SPANS,
  totals: {
    on_minutes: 480,
    transition_minutes: 180,
    off_minutes: 120,
    recorded_minutes: 780,
  },
};

const WIDTH = 400;

describe('buildChart', () => {
  const model = buildChart(DAY, WIDTH)!;

  it('draws one line per span', () => {
    expect(model.lines).toHaveLength(SPANS.length);
    expect(model.lines.map(line => line.state)).toEqual(
      SPANS.map(s => s.state),
    );
  });

  it('runs the line from one edge of the plot to the other', () => {
    const first = model.lines[0];
    const last = model.lines[model.lines.length - 1];
    expect(first.x1).toBeCloseTo(model.plot.left);
    expect(last.x2).toBeCloseTo(model.plot.left + model.plot.width);
  });

  it('leaves no gap in a day where every stretch was recorded', () => {
    expect(model.gaps).toHaveLength(0);
  });

  it('places every segment end-to-end with the next', () => {
    model.lines.slice(1).forEach((line, index) => {
      const before = model.lines[index];
      expect(line.x1).toBeCloseTo(before.x2);
      expect(line.y1).toBeCloseTo(before.y2);
    });
  });

  it('puts a higher activity level higher up the plot', () => {
    const rising = model.lines[1];
    expect(rising.y2).toBeLessThan(rising.y1);
  });

  it('scales time onto the axis in proportion', () => {
    // The first dose wears off at 11, five of the thirteen hours in.
    const wearOff = model.lines[3].x1;
    expect(wearOff - model.plot.left).toBeCloseTo((5 / 13) * model.plot.width);
  });

  it('marks each dose on the axis', () => {
    expect(model.doses.map(dose => dose.number)).toEqual([1, 2]);
    expect(model.doses[0].time).toBe('6:00 AM');
    expect(model.doses[1].time).toBe('12:00 PM');
  });

  it('names the two ends of the axis', () => {
    expect(model.startLabel).toBe('6:00 AM');
    expect(model.endLabel).toBe('7:00 PM');
  });

  it('labels the longest stretch on the line itself', () => {
    // Five hours at 75% is the widest span here, and the only one with room.
    const onChip = model.chips.find(chip => chip.state === 'on');
    expect(onChip?.label).toBe('Working');
    const fiveHours = model.lines[6];
    expect(onChip!.x).toBeGreaterThanOrEqual(fiveHours.x1);
    expect(onChip!.x + onChip!.width).toBeLessThanOrEqual(fiveHours.x2);
  });

  it('keeps a label on a stretch at the very top inside the plot', () => {
    const perfect = buildChart(
      { ...DAY, spans: [span(1, 'on', 6, 19, 100, 100)] },
      WIDTH,
    )!;
    const [chip] = perfect.chips;
    expect(chip.y).toBeGreaterThanOrEqual(perfect.plot.top);
    expect(chip.y).toBeLessThanOrEqual(
      perfect.plot.top + perfect.plot.height - 24,
    );
  });

  it('has nothing to draw for a day with no spans', () => {
    expect(buildChart({ ...DAY, spans: [], window: null }, WIDTH)).toBeNull();
  });
});

describe('buildChart with stretches missing', () => {
  it('joins two segments that do not meet with a gap', () => {
    // A dose whose peak was never noted: the rise and the plateau are both
    // unbuildable, so the line jumps from the first-effect time to the fall.
    const broken: DayInsights = {
      ...DAY,
      spans: [SPANS[0], SPANS[3], SPANS[4]],
    };
    const model = buildChart(broken, WIDTH)!;
    expect(model.lines).toHaveLength(3);
    expect(model.gaps).toHaveLength(1);
    expect(model.gaps[0].x1).toBeCloseTo(model.lines[0].x2);
    expect(model.gaps[0].x2).toBeCloseTo(model.lines[1].x1);
  });

  it('draws no line for a span whose height was never recorded', () => {
    const legacy: DayInsights = {
      ...DAY,
      spans: [{ ...SPANS[0], pct_start: null, pct_end: null }, SPANS[1]],
    };
    const model = buildChart(legacy, WIDTH)!;
    expect(model.lines).toHaveLength(1);
    expect(model.lines[0].state).toBe('transition');
  });
});

/** The same day, with involuntary movements recorded against one dose. */
function withDyskinesia(doseNumber: number): DayInsights {
  const doses: DoseMarker[] = DAY.doses.map(dose =>
    dose.dose_number === doseNumber
      ? {
          ...dose,
          dyskinesia: {
            duration_minutes: 45,
            body_parts: ['Right hand', 'Left leg'],
            affected_daily_life: true,
          },
        }
      : dose,
  );
  return { ...DAY, doses };
}

describe('dyskinesia', () => {
  it('marks it over the on period of the dose it belongs to', () => {
    const model = buildChart(withDyskinesia(1), WIDTH)!;
    expect(model.dyskinesia).toHaveLength(1);

    // Dose 1's on period is 8am to 11am - the third line.
    const onSpan = model.lines[2];
    const [mark] = model.dyskinesia;
    expect(mark.doseNumber).toBe(1);
    expect(mark.x).toBeCloseTo((onSpan.x1 + onSpan.x2) / 2);
    expect(mark.y).toBeLessThan(onSpan.y1);
  });

  it('keeps the mark inside the plot', () => {
    const model = buildChart(withDyskinesia(1), WIDTH)!;
    const [mark] = model.dyskinesia;
    expect(mark.y).toBeGreaterThanOrEqual(model.plot.top);
  });

  it('never lets a state label sit on top of the mark', () => {
    const model = buildChart(withDyskinesia(2), WIDTH)!;
    const [mark] = model.dyskinesia;
    model.chips.forEach(chip => {
      const overlaps =
        chip.x < mark.x + 14 &&
        mark.x - 14 < chip.x + chip.width &&
        chip.y < mark.y + 14 &&
        mark.y - 14 < chip.y + 24;
      expect(overlaps).toBe(false);
    });
  });

  it('marks nothing on a day where none was recorded', () => {
    expect(buildChart(DAY, WIDTH)!.dyskinesia).toHaveLength(0);
  });

  it('writes it out in full beside the period it happened in', () => {
    const periods = buildPeriods(withDyskinesia(1));
    const carrying = periods.filter(period => period.movements !== null);
    expect(carrying).toHaveLength(1);
    expect(carrying[0].time).toBe('8:00 AM to 11:00 AM');
    expect(carrying[0].movements).toBe(
      'Involuntary movements for 45 mins. Felt in: Right hand, Left leg. They affected what you could do.',
    );
  });

  it('says so plainly when it did not affect daily life', () => {
    expect(
      describeDyskinesia({
        duration_minutes: 20,
        body_parts: ['Both legs'],
        affected_daily_life: false,
      }),
    ).toBe(
      'Involuntary movements for 20 mins. Felt in: Both legs. They did not affect what you could do.',
    );
  });

  it('names it in the sentence a screen reader hears', () => {
    expect(chartAccessibilityLabel(DAY)).toContain(
      'No involuntary movements were recorded.',
    );
    expect(chartAccessibilityLabel(withDyskinesia(1))).toContain(
      'Involuntary movements were recorded after 1 dose.',
    );
  });
});

describe('buildPeriods', () => {
  const periods = buildPeriods(DAY);

  it('writes out every stretch the chart draws', () => {
    expect(periods).toHaveLength(SPANS.length);
  });

  it('gives each one its exact times and its length', () => {
    expect(periods[0].time).toBe('6:00 AM to 7:00 AM');
    expect(periods[0].duration).toBe('1 hr');
    expect(periods[0].level).toBe('Activity 50%');
    expect(periods[6].time).toBe('2:00 PM to 7:00 PM');
    expect(periods[6].duration).toBe('5 hrs');
  });

  it('says which way a sloping stretch went', () => {
    expect(periods[1].level).toBe('Activity rising from 50% to 75%');
    expect(periods[3].level).toBe('Activity falling from 75% to 50%');
  });

  it('says so when a height was never recorded', () => {
    const [only] = buildPeriods({
      ...DAY,
      spans: [{ ...SPANS[0], pct_start: null, pct_end: null }],
    });
    expect(only.level).toBe('Activity level not recorded');
  });

  it('names the next day when a stretch crossed midnight', () => {
    const lateNight: ActivitySpan = {
      dose_number: 3,
      state: 'on',
      starts_at: new Date(2026, 8, 11, 23, 0).toISOString(),
      ends_at: new Date(2026, 8, 12, 1, 0).toISOString(),
      pct_start: 70,
      pct_end: 70,
    };
    const [period] = buildPeriods({ ...DAY, spans: [lateNight] });
    expect(period.time).toBe('11:00 PM to 1:00 AM (next day)');
    expect(period.duration).toBe('2 hrs');
  });
});

describe('the sentences around the chart', () => {
  it('says what the chart covers', () => {
    expect(describeChart(DAY)).toBe(
      'How active you were from 6:00 AM, when you took your first dose, to 7:00 PM.',
    );
  });

  it('says what it adds up to, in hours rather than a share', () => {
    expect(describeTotals(DAY)).toBe(
      'Your medicine was working for 8 hrs of the 13 hrs recorded on this day.',
    );
  });

  it('does not claim a total for a day with nothing in it', () => {
    const empty: DayInsights = {
      ...DAY,
      totals: {
        on_minutes: 0,
        transition_minutes: 0,
        off_minutes: 0,
        recorded_minutes: 0,
      },
    };
    expect(describeTotals(empty)).toBe(
      'There is not enough recorded on this day to add up.',
    );
  });
});
