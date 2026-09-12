import { Pool } from 'pg';
import { DoseLogsService } from './dose-logs.service';
import { DoseLogDto } from './dto/dose-log.dto';

/**
 * That a dose is written with every column it claims to write.
 *
 * `DOSE_COLUMNS` and `toRow` are two lists that have to stay the same length
 * and the same order, and nothing but care keeps them that way - a column added
 * to one and not the other binds every value after it to the wrong column, and
 * Postgres only notices if the types happen to disagree. `pre_med_al_pct`
 * went in between `tablets_count` and `first_effect_time`, which is exactly the
 * kind of insertion that does this quietly.
 */

/** One fully answered dose, as the wire sends it. */
const DOSE: DoseLogDto = {
  dose_time: '2026-09-11T02:30:00.000Z',
  tablets_count: 1,
  pre_med_al_pct: 35,
  first_effect_time: '2026-09-11T03:00:00.000Z',
  peak_effect_time: '2026-09-11T03:30:00.000Z',
  pal_pct: 85,
  at_pal_dl_affected_flag: 0,
  dysky_flag: 0,
  dysky_duration: null,
  dysky_body_part: null,
  dysky_dl_affected_flag: null,
  med_wear_off_time: '2026-09-11T07:00:00.000Z',
  off_period_dl_affected_flag: 0,
};

/** The row Postgres would hand back, so `rowToDose` has something to read. */
const RETURNED = {
  id: 'dose-1',
  daily_log_id: 'day-1',
  user_id: 'user-1',
  log_date: '2026-09-11',
  dose_number: 1,
  dose_time: new Date(DOSE.dose_time),
  tablets_count: '1.000',
  pre_med_al_pct: 35,
  first_effect_time: new Date(DOSE.first_effect_time),
  first_effect_flag: 1,
  peak_effect_time: new Date(DOSE.peak_effect_time!),
  peak_effect_flag: 1,
  pal_pct: 85,
  at_pal_dl_affected_flag: 0,
  dysky_flag: 0,
  dysky_duration: null,
  dysky_body_part: null,
  dysky_dl_affected_flag: null,
  med_wear_off_time: new Date(DOSE.med_wear_off_time!),
  med_wear_off_flag: 1,
  off_period_dl_affected_flag: 0,
  created_at: new Date('2026-09-11T08:00:00.000Z'),
  updated_at: new Date('2026-09-11T08:00:00.000Z'),
};

/** Captures what was asked of the database instead of asking one. */
function fakePool() {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query = jest.fn((text: string, values: unknown[] = []) => {
    calls.push({ text, values });
    return Promise.resolve({
      rows: text.startsWith('INSERT') ? [RETURNED] : [],
    });
  });
  return { pool: { query } as unknown as Pool, calls };
}

/** The column list the INSERT names, in order. */
function columnsOf(sql: string): string[] {
  const inside = /INSERT INTO dose_logs \(([^)]*)\)/.exec(sql);
  if (!inside) {
    throw new Error('No INSERT found');
  }
  return inside[1].split(',').map((name) => name.trim());
}

describe('writing a day of doses', () => {
  const timestamps = {
    created_at: '2026-09-11T08:00:00.000Z',
    updated_at: '2026-09-11T08:00:00.000Z',
  };

  it('binds exactly one value per column it names', async () => {
    const { pool, calls } = fakePool();
    const service = new DoseLogsService(pool);

    await service.replaceForDay(
      'day-1',
      'user-1',
      '2026-09-11',
      [DOSE, DOSE],
      timestamps,
    );

    const insert = calls.find((call) => call.text.includes('INSERT INTO'))!;
    const columns = columnsOf(insert.text);

    // Two doses, so twice the columns - and the placeholders run to exactly
    // that, which is what says nothing was added to one list and not the other.
    expect(insert.values).toHaveLength(columns.length * 2);
    expect(insert.text).toContain(`$${columns.length * 2}`);
    expect(insert.text).not.toContain(`$${columns.length * 2 + 1}`);
  });

  it('puts the pre-dose activity level in its own column', async () => {
    const { pool, calls } = fakePool();
    const service = new DoseLogsService(pool);

    await service.replaceForDay(
      'day-1',
      'user-1',
      '2026-09-11',
      [DOSE],
      timestamps,
    );

    const insert = calls.find((call) => call.text.includes('INSERT INTO'))!;
    const columns = columnsOf(insert.text);
    const at = columns.indexOf('pre_med_al_pct');

    expect(at).toBeGreaterThan(-1);
    expect(insert.values[at]).toBe(35);
    // And it sits with the answers that are known before the dose does
    // anything, not with the ones about its effect.
    expect(columns[at - 1]).toBe('tablets_count');
  });

  it('reads it back on the way out', async () => {
    const { pool } = fakePool();
    const service = new DoseLogsService(pool);

    const [saved] = await service.replaceForDay(
      'day-1',
      'user-1',
      '2026-09-11',
      [DOSE],
      timestamps,
    );

    expect(saved.pre_med_al_pct).toBe(35);
    expect(saved.pal_pct).toBe(85);
  });

  /**
   * Rows written before the question existed have no answer to give, and NULL
   * is what the column holds for them - see db/004.
   */
  it('hands back null for a dose logged before the question existed', async () => {
    const { pool, calls } = fakePool();
    calls.length = 0;
    const service = new DoseLogsService(pool);
    (RETURNED as { pre_med_al_pct: number | null }).pre_med_al_pct = null;

    const [saved] = await service.replaceForDay(
      'day-1',
      'user-1',
      '2026-09-11',
      [DOSE],
      timestamps,
    );

    expect(saved.pre_med_al_pct).toBeNull();
    (RETURNED as { pre_med_al_pct: number | null }).pre_med_al_pct = 35;
  });
});
