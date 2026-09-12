-- ============================================================================
-- parkPD - dose_logs.pre_med_al_pct
--
-- Adds the activity level recorded just before a dose is swallowed. It is
-- asked on the same screen as "when did you take your Nth dose?", before
-- anything is known about whether the dose worked, so it belongs with
-- dose_time and tablets_count rather than with the questions about the effect.
--
-- The peak's pal_pct is the other end of the same measurement: subtracting one
-- from the other is what says how much a dose was actually worth, which is why
-- the pair is worth having on every dose rather than only on the ones that
-- worked.
--
-- NULLABLE, deliberately. The column is required of every new dose - DoseLogDto
-- rejects a dose without it - but rows written before this ran were never asked
-- the question, and there is no value that could be invented for them that
-- would not read later as an answer somebody gave. NULL here means "never
-- asked", the same as it does everywhere else in this schema.
--
--   Consequence for analysis: filter it out rather than treating it as zero.
--   `WHERE pre_med_al_pct IS NOT NULL` is the honest population.
--
-- Re-runnable: IF NOT EXISTS, so a second run does nothing rather than failing.
--
-- Run against a database already carrying 001_schema.sql:
--     psql -d parkpd -f db/004_dose_pre_med_activity.sql
--
-- Formatting rules are the same as 001 - see the note at the top of that file.
-- ============================================================================

BEGIN;

-- `pct` is the domain declared in 001: smallint, 0 to 100.
ALTER TABLE dose_logs ADD COLUMN IF NOT EXISTS pre_med_al_pct pct;

COMMENT ON COLUMN dose_logs.pre_med_al_pct IS
  'How active the person was in the run-up to swallowing it, 0 to 100. Asked beside the dose time, before anything is known about whether the dose worked, so it is recorded even on a dose that never did. NULL only on rows written before the question existed - see db/004.';

COMMENT ON COLUMN dose_logs.pal_pct IS
  'How much of the usual activity was possible at the peak, 0 to 100. The other end of pre_med_al_pct: the difference between the two is what says how much the dose was worth.';

COMMIT;
