-- ============================================================================
-- parkPD - the activity-state views behind the Insights chart
--
-- A day's doses, read as a line: how active the person was, hour by hour, and
-- how much of the day the medicine was working for.
--
-- Three views, each one built on the one above it, so the chart and the three
-- figures under it are the same arithmetic and can never disagree:
--
--     dose_bounds       one row per dose, with the next dose alongside it
--     dose_state_spans  one row per drawable segment of the line
--     day_state_totals  those segments added up, per state, per day
--
-- WHAT A DOSE LOOKS LIKE ON THE LINE
--
-- Four anchors are recorded for a dose that worked - when it was swallowed,
-- when it was first felt, when it was working best, and when it wore off - and
-- between them they cut the time up to the next dose into four segments:
--
--     dose_time   -> first_effect   flat, low     the medicine has not landed
--     first_effect-> peak_effect    rising        it is taking hold
--     peak_effect -> wear_off       flat, high    it is working
--     wear_off    -> next dose_time falling       it is wearing off
--
-- The two heights are already recorded: pre_med_al_pct is where the line sits
-- before the dose, pal_pct is where it sits at the peak. Nothing is inferred.
--
-- WHERE EACH SEGMENT ENDS
--
-- Every one of them ends at the next dose if it has not ended sooner, because
-- the next dose is the last moment the previous one can still be said to be
-- what is happening. That is also why the last dose of the day has no falling
-- segment: there is no next dose to end it at, and nothing records the moment
-- the medicine was fully gone - med_wear_off_time is when symptoms start to
-- come back, not when they finished coming back. Inventing an end for it would
-- put minutes in the totals that nobody logged.
--
-- WHAT IS DELIBERATELY NOT HERE
--
-- The stretch between waking and the first dose. It is real off time, but no
-- activity level is recorded for it - wakeup_independence_pct answers a
-- different question - so it is left out rather than drawn at a height nobody
-- gave. The totals therefore cover the first dose onwards, and the screen says
-- so in words rather than letting three figures imply a whole day.
--
-- Re-runnable: CREATE OR REPLACE, so a second run redefines rather than fails.
-- Views only - no table is touched, and dropping all three leaves the data
-- exactly as it was.
--
-- Run against a database already carrying 001_schema.sql and 004:
--     psql -d parkpd -f db/005_activity_state_views.sql
--
-- Formatting rules are the same as 001 - see the note at the top of that file.
-- ============================================================================

BEGIN;


-- ---------------------------------------------------------------------------
-- dose_bounds
--
-- One row per dose, with the dose after it brought alongside. That is the only
-- thing the raw table cannot answer on its own: three of the four segments end
-- at the next dose, and without LEAD every one of them would need the table
-- joined to itself.
--
-- The three "_at" columns are the recorded times under plainer names. They are
-- already NULL exactly when the thing never happened - dose_logs_first_effect_pair
-- and its two siblings are what guarantee that - so no CASE is needed to turn a
-- 0 flag into a NULL.
--
-- Ordered by dose_time first and dose_number second, so two doses stamped at
-- the same minute still come out in the order they were logged in.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW dose_bounds AS
SELECT
  d.id AS dose_log_id,
  d.daily_log_id,
  d.user_id,
  d.log_date,
  d.dose_number,
  d.dose_time,
  d.tablets_count,
  d.pre_med_al_pct,
  d.pal_pct,
  d.first_effect_time AS onset_at,
  d.peak_effect_time AS peak_at,
  d.med_wear_off_time AS wear_off_at,
  LEAD(d.dose_time) OVER w AS next_dose_time,
  LEAD(d.pre_med_al_pct) OVER w AS next_pre_med_al_pct
FROM dose_logs d
WINDOW w AS (PARTITION BY d.daily_log_id ORDER BY d.dose_time, d.dose_number);

COMMENT ON VIEW dose_bounds IS
  'One row per dose with the next dose alongside it, which is what the four segments of the line need and what dose_logs alone cannot give.';


-- ---------------------------------------------------------------------------
-- dose_state_spans
--
-- One row per drawable segment: a state, a start, an end, and the height of the
-- line at each end. This view is the chart.
--
-- The four segments are written out as a VALUES list rather than as four
-- UNIONed queries, so the table above is read once and the shape of a dose is
-- readable in four lines.
--
-- Two things are then true of every row that survives:
--
--   It ends at the next dose or sooner. The clamp is the second LATERAL, and it
--   is what keeps a day where dose 3 was taken before dose 2 wore off from
--   producing a segment that runs backwards.
--
--   It has a length. Segments whose ends are unknown, or which the clamp has
--   closed to nothing, are dropped - a dose that never worked has no rising
--   segment because there was nothing to rise to.
--
-- pct_start and pct_end are allowed through as NULL. They are NULL only for
-- doses written before db/004 added pre_med_al_pct, and the minutes are real
-- even when the height is not - so the span still counts towards the totals and
-- the chart simply leaves that piece of line undrawn.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW dose_state_spans AS
SELECT
  b.user_id,
  b.log_date,
  b.daily_log_id,
  b.dose_number,
  s.state,
  s.starts_at,
  c.ends_at,
  s.pct_start,
  s.pct_end
FROM dose_bounds b
CROSS JOIN LATERAL (
  VALUES
    ('off',        b.dose_time,   COALESCE(b.onset_at, b.next_dose_time),    b.pre_med_al_pct, b.pre_med_al_pct),
    ('transition', b.onset_at,    b.peak_at,                                 b.pre_med_al_pct, b.pal_pct),
    ('on',         b.peak_at,     COALESCE(b.wear_off_at, b.next_dose_time), b.pal_pct,        b.pal_pct),
    ('transition', b.wear_off_at, b.next_dose_time,                          b.pal_pct,        b.next_pre_med_al_pct)
) AS s(state, starts_at, raw_ends_at, pct_start, pct_end)
CROSS JOIN LATERAL (
  SELECT LEAST(s.raw_ends_at, COALESCE(b.next_dose_time, s.raw_ends_at)) AS ends_at
) AS c
WHERE s.starts_at IS NOT NULL
  AND c.ends_at IS NOT NULL
  AND c.ends_at > s.starts_at;

COMMENT ON VIEW dose_state_spans IS
  'One row per segment of the activity line - state, start, end, and the height at each end. Segments with no known end, or none left after the clamp to the next dose, are not here.';


-- ---------------------------------------------------------------------------
-- day_state_totals
--
-- The three figures under the chart. Long form - one row per state - rather
-- than three columns, so a day with no off time at all is an absent row rather
-- than a zero, and so a fourth state could be added without changing the shape.
--
-- Minutes rather than an interval: the client formats them into "8 hrs", and an
-- interval would arrive at it as a string it would only have to parse back.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW day_state_totals AS
SELECT
  user_id,
  log_date,
  state,
  round(SUM(EXTRACT(EPOCH FROM (ends_at - starts_at))) / 60)::int AS minutes
FROM dose_state_spans
GROUP BY user_id, log_date, state;

COMMENT ON VIEW day_state_totals IS
  'Minutes per state per day, added up from dose_state_spans so the figures under the chart and the chart itself are the same arithmetic. Covers the first dose onwards, not the whole day.';


COMMIT;
