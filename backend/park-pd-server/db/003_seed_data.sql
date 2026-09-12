-- ============================================================================
-- parkPD - the contents of data/*.json as plain INSERT statements.
--
-- Generated from the JSON files. Unlike 002_load_json.sql this uses no psql
-- meta-commands, so it runs in any client - DBeaver, pgAdmin, psql, a
-- migration tool. Run it after 001_schema.sql.
--
-- Re-runnable: ON CONFLICT DO NOTHING, so a second run loads nothing rather
-- than failing.
--
-- Regenerate after the JSON files change, rather than editing by hand.
--
-- The dose inserts below name no pre_med_al_pct: these rows were logged
-- before that question was asked, and NULL is what the column is meant to hold
-- for them - see db/004.
--
-- Formatting rules are the same as 001 - see the note at the top of that file.
-- ============================================================================

BEGIN;

-- users
INSERT INTO users (
  id, created_at, email, phone, verified_with,
  full_name, gender, dob,
  p_duration, first_symptom, first_affected_part,
  recc_falls, recc_falls_type, psychiatric, addiction, rem, non_motor_symptoms,
  diabetes_yrs, hypertension_yrs, thyroid_yrs,
  family_p_history, walk_independent, assistance_needed, dose_mode,
  profile_completed_at, profile_updated_at
) VALUES (
  '73f50f42-9358-49b2-bd86-95e873ff804e'::uuid, '2026-09-07T17:41:07.193Z'::timestamptz, 'vkvksingh24@gmail.com', '8103104863', 'email',
  'vijay kumar', 'male', to_date('01/01/1991', 'DD/MM/YYYY'),
  29, ARRAY['Tremor', 'Slowness', 'Reduced voice volume', 'Freezing while walking']::text[], ARRAY['Left hand', 'Face / jaw', 'Both hands symmetrically']::text[],
  4, ARRAY['Provoked']::text[], 1, ARRAY['Drugs']::text[], 1, ARRAY['Constipation', 'Urinary urgency / incontinence', 'Dizziness on getting out of bed']::text[],
  2, 1, 2,
  1, 1, 1, 'pages',
  '2026-09-07T17:45:22.515Z'::timestamptz, NULL
) ON CONFLICT (id) DO NOTHING;

-- daily_logs
INSERT INTO daily_logs (
  id, user_id, log_date, timezone, utc_offset_minutes,
  wake_time, morning_symptoms, wakeup_independence_pct, daily_activities_independence_flag,
  medicine_name, dose_count, other_meds, med_side_effects,
  night_wakeup_flag, night_wakeup_count, night_symptoms, night_symptoms_troublesome_flag,
  created_at, updated_at
) VALUES (
  '37ca47ff-8925-4487-9e97-4a510727f6f6'::uuid, '73f50f42-9358-49b2-bd86-95e873ff804e'::uuid, '2026-09-05'::date, 'Asia/Calcutta', 330,
  '2026-09-05T03:00:00.000Z'::timestamptz, ARRAY['Stiffness', 'Difficulty moving']::text[], 71, 1,
  'Syndopa', 3, ARRAY['Rasagiline']::text[], ARRAY['Gambling / Shopping / Hypersexuality', 'Sudden sleep episodes']::text[],
  1, 2, NULL, NULL,
  '2026-09-07T17:50:33.292Z'::timestamptz, '2026-09-07T17:50:33.292Z'::timestamptz
) ON CONFLICT (id) DO NOTHING;

-- dose_logs
INSERT INTO dose_logs (
  id, daily_log_id, user_id, log_date, dose_number,
  dose_time, tablets_count,
  first_effect_time, first_effect_flag,
  peak_effect_time, peak_effect_flag,
  pal_pct, at_pal_dl_affected_flag,
  dysky_flag, dysky_duration, dysky_body_part, dysky_dl_affected_flag,
  med_wear_off_time, med_wear_off_flag, off_period_dl_affected_flag,
  created_at, updated_at
) VALUES (
  'a20dd441-14ba-47ca-ae6a-ccc0b47d8798'::uuid, '37ca47ff-8925-4487-9e97-4a510727f6f6'::uuid, '73f50f42-9358-49b2-bd86-95e873ff804e'::uuid, '2026-09-05'::date, 1,
  '2026-09-05T03:00:00.000Z'::timestamptz, 1,
  '2026-09-05T03:30:00.000Z'::timestamptz, 1,
  '2026-09-05T03:30:00.000Z'::timestamptz, 1,
  97, 0,
  1, 60, ARRAY['Face / jaw']::text[], 0,
  '2026-09-05T07:00:00.000Z'::timestamptz, 1, 0,
  '2026-09-07T17:50:33.292Z'::timestamptz, '2026-09-07T17:50:33.292Z'::timestamptz
) ON CONFLICT (id) DO NOTHING;

INSERT INTO dose_logs (
  id, daily_log_id, user_id, log_date, dose_number,
  dose_time, tablets_count,
  first_effect_time, first_effect_flag,
  peak_effect_time, peak_effect_flag,
  pal_pct, at_pal_dl_affected_flag,
  dysky_flag, dysky_duration, dysky_body_part, dysky_dl_affected_flag,
  med_wear_off_time, med_wear_off_flag, off_period_dl_affected_flag,
  created_at, updated_at
) VALUES (
  'aa63666c-e4cb-446a-93a6-e44be1d98c1f'::uuid, '37ca47ff-8925-4487-9e97-4a510727f6f6'::uuid, '73f50f42-9358-49b2-bd86-95e873ff804e'::uuid, '2026-09-05'::date, 2,
  '2026-09-05T07:15:00.000Z'::timestamptz, 1,
  '2026-09-05T07:45:00.000Z'::timestamptz, 1,
  '2026-09-05T08:15:00.000Z'::timestamptz, 1,
  85, 0,
  0, NULL, NULL, NULL,
  '2026-09-05T11:45:00.000Z'::timestamptz, 1, 0,
  '2026-09-07T17:50:33.292Z'::timestamptz, '2026-09-07T17:50:33.292Z'::timestamptz
) ON CONFLICT (id) DO NOTHING;

INSERT INTO dose_logs (
  id, daily_log_id, user_id, log_date, dose_number,
  dose_time, tablets_count,
  first_effect_time, first_effect_flag,
  peak_effect_time, peak_effect_flag,
  pal_pct, at_pal_dl_affected_flag,
  dysky_flag, dysky_duration, dysky_body_part, dysky_dl_affected_flag,
  med_wear_off_time, med_wear_off_flag, off_period_dl_affected_flag,
  created_at, updated_at
) VALUES (
  '35871e32-f07c-4c90-a5b7-14d1df38fecb'::uuid, '37ca47ff-8925-4487-9e97-4a510727f6f6'::uuid, '73f50f42-9358-49b2-bd86-95e873ff804e'::uuid, '2026-09-05'::date, 3,
  '2026-09-05T12:00:00.000Z'::timestamptz, 1,
  '2026-09-05T12:15:00.000Z'::timestamptz, 1,
  '2026-09-05T13:00:00.000Z'::timestamptz, 1,
  83, 0,
  0, NULL, NULL, NULL,
  '2026-09-05T16:00:00.000Z'::timestamptz, 1, 0,
  '2026-09-07T17:50:33.292Z'::timestamptz, '2026-09-07T17:50:33.292Z'::timestamptz
) ON CONFLICT (id) DO NOTHING;

-- refresh_tokens
INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (
  '36927bb1ad2afd9bc7860783421549dc1218d9ec0eb5cce1b1b30e0481a24757', '73f50f42-9358-49b2-bd86-95e873ff804e'::uuid, to_timestamp(1793986867203 / 1000.0), to_timestamp(1788802867203 / 1000.0)
) ON CONFLICT (token_hash) DO NOTHING;

-- otp_challenges: otp-store.json is empty, as it normally is - a challenge lives for minutes.

COMMIT;
