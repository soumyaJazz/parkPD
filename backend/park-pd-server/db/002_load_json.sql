-- ============================================================================
-- parkPD - load the file-backed stores in data/ into the schema
--
-- THIS FILE IS FOR psql ONLY. The \set lines below are psql meta-commands, so
-- a JDBC client such as DBeaver or pgAdmin cannot run it. If that is what you
-- are using, run db/003_seed_data.sql instead, which is the same data written
-- out as plain INSERT statements.
--
-- Run from the server root, after 001_schema.sql. The paths are relative to
-- where psql is started, hence the cd:
--     cd backend/park-pd-server
--     psql -d parkpd -f db/001_schema.sql
--     psql -d parkpd -f db/002_load_json.sql
--
-- Re-runnable: every insert is ON CONFLICT DO NOTHING, so loading twice loads
-- nothing the second time rather than failing halfway.
--
-- Formatting rules are the same as 001 - see the note at the top of that file.
-- Every statement is one contiguous block, and no comment contains a
-- semicolon.
-- ============================================================================

\set ON_ERROR_STOP on

\set users_json          `cat data/users.json`
\set daily_logs_json     `cat data/daily-logs.json`
\set dose_logs_json      `cat data/dose-logs.json`
\set refresh_tokens_json `cat data/refresh-tokens.json`
\set otp_json            `cat data/otp-store.json`

BEGIN;

-- ---------------------------------------------------------------------------
-- users
--
-- Two conversions the file needs: dob arrives as DD/MM/YYYY text and becomes a
-- real date, and the array answers are unpacked from JSON arrays into text[].
-- jsonb_array_elements_text is used rather than a cast so that JSON nulls and
-- absent keys both land as SQL NULL, which is the distinction the app depends
-- on - NULL meaning never asked is not the same as an empty array meaning
-- answered none.
-- ---------------------------------------------------------------------------
INSERT INTO users (
  id, created_at, email, phone, verified_with,
  full_name, gender, dob,
  p_duration, first_symptom, first_affected_part,
  recc_falls, recc_falls_type, psychiatric, addiction, rem, non_motor_symptoms,
  diabetes_yrs, hypertension_yrs, thyroid_yrs,
  family_p_history, walk_independent, assistance_needed, dose_mode,
  profile_completed_at, profile_updated_at
)
SELECT
  (u->>'id')::uuid,
  (u->>'created_at')::timestamptz,
  lower(u->>'email'),
  u->>'phone',
  coalesce(u->>'verified_with', 'email'),
  u->>'full_name',
  u->>'gender',
  to_date(u->>'dob', 'DD/MM/YYYY'),
  (u->>'p_duration')::integer,
  CASE WHEN jsonb_typeof(u->'first_symptom') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(u->'first_symptom')) END,
  CASE WHEN jsonb_typeof(u->'first_affected_part') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(u->'first_affected_part')) END,
  (u->>'recc_falls')::integer,
  CASE WHEN jsonb_typeof(u->'recc_falls_type') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(u->'recc_falls_type')) END,
  (u->>'psychiatric')::smallint,
  CASE WHEN jsonb_typeof(u->'addiction') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(u->'addiction')) END,
  (u->>'rem')::smallint,
  CASE WHEN jsonb_typeof(u->'non_motor_symptoms') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(u->'non_motor_symptoms')) END,
  (u->>'diabetes_yrs')::smallint,
  (u->>'hypertension_yrs')::smallint,
  (u->>'thyroid_yrs')::smallint,
  (u->>'family_p_history')::smallint,
  (u->>'walk_independent')::smallint,
  (u->>'assistance_needed')::smallint,
  u->>'dose_mode',
  (u->>'profile_completed_at')::timestamptz,
  (u->>'profile_updated_at')::timestamptz
FROM jsonb_array_elements(:'users_json'::jsonb) AS u
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- daily_logs
-- ---------------------------------------------------------------------------
INSERT INTO daily_logs (
  id, user_id, log_date, timezone, utc_offset_minutes,
  wake_time, morning_symptoms, wakeup_independence_pct,
  daily_activities_independence_flag,
  medicine_name, dose_count, other_meds, med_side_effects,
  night_wakeup_flag, night_wakeup_count, night_symptoms,
  night_symptoms_troublesome_flag,
  created_at, updated_at
)
SELECT
  (d->>'id')::uuid,
  (d->>'user_id')::uuid,
  (d->>'log_date')::date,
  d->>'timezone',
  (d->>'utc_offset_minutes')::smallint,
  (d->>'wake_time')::timestamptz,
  CASE WHEN jsonb_typeof(d->'morning_symptoms') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(d->'morning_symptoms')) END,
  (d->>'wakeup_independence_pct')::smallint,
  (d->>'daily_activities_independence_flag')::smallint,
  d->>'medicine_name',
  (d->>'dose_count')::smallint,
  CASE WHEN jsonb_typeof(d->'other_meds') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(d->'other_meds')) END,
  CASE WHEN jsonb_typeof(d->'med_side_effects') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(d->'med_side_effects')) END,
  (d->>'night_wakeup_flag')::smallint,
  (d->>'night_wakeup_count')::smallint,
  CASE WHEN jsonb_typeof(d->'night_symptoms') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(d->'night_symptoms')) END,
  (d->>'night_symptoms_troublesome_flag')::smallint,
  (d->>'created_at')::timestamptz,
  (d->>'updated_at')::timestamptz
FROM jsonb_array_elements(:'daily_logs_json'::jsonb) AS d
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- dose_logs
--
-- Three fields arrive carrying either an instant or a word saying the instant
-- never came, no-effect or no-return. Each is split into the time and the flag
-- the schema keeps. An absent or JSON-null field means the question was never
-- reached, and both parts stay NULL.
--
-- pre_med_al_pct arrives as NULL on any dose exported before that question
-- existed, which is what an absent key casts to and what the column is meant to
-- hold for those rows - see db/004.
--
-- log_date is not in the dose file. It is taken from the day the dose points
-- at, which is also what dose_logs_day_fk checks it against. The join accepts
-- either link, because the file on disk carries daily_log_id while the current
-- DoseLogsService writes user_id with log_date.
-- ---------------------------------------------------------------------------
INSERT INTO dose_logs (
  id, daily_log_id, user_id, log_date, dose_number,
  dose_time, tablets_count, pre_med_al_pct,
  first_effect_time, first_effect_flag,
  peak_effect_time, peak_effect_flag,
  pal_pct, at_pal_dl_affected_flag,
  dysky_flag, dysky_duration, dysky_body_part, dysky_dl_affected_flag,
  med_wear_off_time, med_wear_off_flag, off_period_dl_affected_flag,
  created_at, updated_at
)
SELECT
  (x->>'id')::uuid,
  dl.id,
  dl.user_id,
  dl.log_date,
  (x->>'dose_number')::smallint,
  (x->>'dose_time')::timestamptz,
  (x->>'tablets_count')::numeric,
  (x->>'pre_med_al_pct')::smallint,
  CASE WHEN x->>'first_effect_time' <> 'no-effect'
       THEN (x->>'first_effect_time')::timestamptz END,
  CASE WHEN x->>'first_effect_time' = 'no-effect' THEN 0 ELSE 1 END,
  CASE WHEN x->>'peak_effect_time' <> 'no-effect'
       THEN (x->>'peak_effect_time')::timestamptz END,
  CASE WHEN x->>'peak_effect_time' IS NULL THEN NULL
       WHEN x->>'peak_effect_time' = 'no-effect' THEN 0 ELSE 1 END,
  (x->>'pal_pct')::smallint,
  (x->>'at_pal_dl_affected_flag')::smallint,
  (x->>'dysky_flag')::smallint,
  (x->>'dysky_duration')::smallint,
  CASE WHEN jsonb_typeof(x->'dysky_body_part') = 'array'
       THEN ARRAY(SELECT jsonb_array_elements_text(x->'dysky_body_part')) END,
  (x->>'dysky_dl_affected_flag')::smallint,
  CASE WHEN x->>'med_wear_off_time' <> 'no-return'
       THEN (x->>'med_wear_off_time')::timestamptz END,
  CASE WHEN x->>'med_wear_off_time' IS NULL THEN NULL
       WHEN x->>'med_wear_off_time' = 'no-return' THEN 0 ELSE 1 END,
  (x->>'off_period_dl_affected_flag')::smallint,
  (x->>'created_at')::timestamptz,
  (x->>'updated_at')::timestamptz
FROM jsonb_array_elements(:'dose_logs_json'::jsonb) AS x
JOIN daily_logs dl
  ON dl.id = (x->>'daily_log_id')::uuid
  OR (dl.user_id = (x->>'user_id')::uuid AND dl.log_date = (x->>'log_date')::date)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- refresh_tokens - the two timestamps are epoch milliseconds in the file.
-- ---------------------------------------------------------------------------
INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at)
SELECT
  t->>'tokenHash',
  (t->>'userId')::uuid,
  to_timestamp((t->>'expiresAt')::bigint / 1000.0),
  to_timestamp((t->>'createdAt')::bigint / 1000.0)
FROM jsonb_array_elements(:'refresh_tokens_json'::jsonb) AS t
ON CONFLICT (token_hash) DO NOTHING;

-- ---------------------------------------------------------------------------
-- otp_challenges
--
-- Normally empty, since a challenge lives for minutes. contact also reads the
-- older email key, the way destinationOf in OtpService does.
-- ---------------------------------------------------------------------------
INSERT INTO otp_challenges (
  challenge_id, contact, otp_hash, purpose, method, expires_at, attempts, created_at
)
SELECT
  (o->>'challengeId')::uuid,
  coalesce(o->>'contact', o->>'email'),
  o->>'otpHash',
  o->>'purpose',
  coalesce(o->>'method', 'email'),
  to_timestamp((o->>'expiresAt')::bigint / 1000.0),
  coalesce((o->>'attempts')::smallint, 0),
  to_timestamp((o->>'createdAt')::bigint / 1000.0)
FROM jsonb_array_elements(:'otp_json'::jsonb) AS o
ON CONFLICT (challenge_id) DO NOTHING;

COMMIT;

SELECT 'users' AS table_name, count(*) FROM users
UNION ALL SELECT 'daily_logs', count(*) FROM daily_logs
UNION ALL SELECT 'dose_logs', count(*) FROM dose_logs
UNION ALL SELECT 'refresh_tokens', count(*) FROM refresh_tokens
UNION ALL SELECT 'otp_challenges', count(*) FROM otp_challenges;
