-- ============================================================================
-- parkPD - PostgreSQL schema
--
-- The relational form of the five file-backed stores in data/:
--     users.json           -> users
--     daily-logs.json      -> daily_logs
--     dose-logs.json       -> dose_logs
--     refresh-tokens.json  -> refresh_tokens
--     otp-store.json       -> otp_challenges
--
-- Column names are kept exactly as they travel on the wire (p_duration,
-- at_pal_dl_affected_flag, mixed vocabulary and all). The DTOs, the JSON files
-- and the client all speak those names already, so renaming them here would
-- only move the mismatch into a mapping layer.
--
-- Requires PostgreSQL 12 or later, for generated columns.
--
-- Run once against an empty database:
--     psql -d parkpd -f db/001_schema.sql
--
-- FORMATTING NOTE - please keep to it when editing.
-- Every statement below is one contiguous block: no blank lines inside it, no
-- inline comments inside it, and no semicolons inside any comment anywhere.
-- GUI clients split a script into statements before the server ever sees it,
-- and a blank line or a stray semicolon in a comment makes some of them cut a
-- CREATE TABLE in half. What the server then gets is a fragment starting at a
-- column or a CONSTRAINT, and the error it reports points at that fragment
-- rather than at the real cause. Column-level notes live in the COMMENT ON
-- statements after each table, which also puts them in the catalog where a
-- client will show them beside the column.
-- ============================================================================

BEGIN;

-- gen_random_uuid(), so the database can mint the ids the services currently
-- mint with crypto.randomUUID().
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------------
-- Domains - the shapes that repeat across every table, named once.
--
-- flag: every yes/no answer in the app is 0 or 1, not a boolean. Kept that way
-- on purpose - it is what the client sends, what the DTOs validate and what
-- the JSON files hold, so a boolean column would need translating at both
-- edges.
--
-- answer_list: a multi-select answer. text[] rather than a child table because
-- these lists are opaque to the server by design. "Other" lets the user write
-- their own words, and the clinical option lists are expected to grow, so a
-- stale server must not start rejecting an answer a newer app offers. It also
-- keeps the distinction the app depends on, where NULL means never asked and
-- an empty array means asked and answered none.
--   Trade-off: matching one answer needs a GIN index rather than a join, and
--   there is no referential list of valid symptoms. If you later want
--   per-symptom reporting, normalise then - not before.
-- ---------------------------------------------------------------------------
CREATE DOMAIN flag AS smallint CHECK (VALUE IN (0, 1));

CREATE DOMAIN pct AS smallint CHECK (VALUE BETWEEN 0 AND 100);

-- Cap is MAX_ANSWERS in the DTOs.
CREATE DOMAIN answer_list AS text[] CHECK (cardinality(VALUE) <= 32);

-- Cap is MAX_BODY_PARTS in DoseLogDto.
CREATE DOMAIN body_part_list AS text[] CHECK (cardinality(VALUE) <= 16);


-- ---------------------------------------------------------------------------
-- users
--
-- An account exists from the moment an OTP is verified. Everything from
-- full_name down is filled in by profile setup, which runs once straight after
-- sign-up, so those columns are nullable at the column level and the
-- users_profile_is_complete constraint is what says they must all be there
-- once profile_completed_at is set.
--
-- email and phone are the two ways of reaching a person. Which one is the
-- account is decided by verified_with, not by which happens to be filled in.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  email                 text,
  phone                 text,
  verified_with         text        NOT NULL DEFAULT 'email'
                                    CHECK (verified_with IN ('email', 'phone')),
  full_name             text        CHECK (length(full_name) BETWEEN 2 AND 60),
  gender                text        CHECK (gender IN ('male', 'female')),
  dob                   date,
  p_duration            integer     CHECK (p_duration >= 1),
  first_symptom         answer_list CHECK (cardinality(first_symptom) >= 1),
  first_affected_part   answer_list CHECK (cardinality(first_affected_part) >= 1),
  recc_falls            integer     CHECK (recc_falls >= 0),
  recc_falls_type       answer_list,
  psychiatric           flag,
  addiction             answer_list,
  rem                   flag,
  non_motor_symptoms    answer_list,
  diabetes_yrs          smallint    CHECK (diabetes_yrs >= 0),
  hypertension_yrs      smallint    CHECK (hypertension_yrs >= 0),
  thyroid_yrs           smallint    CHECK (thyroid_yrs >= 0),
  family_p_history      flag,
  walk_independent      flag,
  assistance_needed     flag,
  dose_mode             text        CHECK (dose_mode IN ('pages', 'scroll')),
  profile_completed_at  timestamptz,
  profile_updated_at    timestamptz,
  phone_national        text        GENERATED ALWAYS AS
                          (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)) STORED,
  CONSTRAINT users_verified_contact_present CHECK (
    (verified_with = 'email' AND email IS NOT NULL)
    OR (verified_with = 'phone' AND phone IS NOT NULL)
  ),
  CONSTRAINT users_falls_type_needs_falls CHECK (
    recc_falls IS NOT NULL OR recc_falls_type IS NULL
  ),
  CONSTRAINT users_profile_is_complete CHECK (
    profile_completed_at IS NULL OR (
      full_name           IS NOT NULL AND
      gender              IS NOT NULL AND
      dob                 IS NOT NULL AND
      p_duration          IS NOT NULL AND
      first_symptom       IS NOT NULL AND
      first_affected_part IS NOT NULL AND
      psychiatric         IS NOT NULL AND
      rem                 IS NOT NULL AND
      non_motor_symptoms  IS NOT NULL AND
      family_p_history    IS NOT NULL AND
      walk_independent    IS NOT NULL AND
      assistance_needed   IS NOT NULL AND
      dose_mode           IS NOT NULL
    )
  )
);

COMMENT ON TABLE users IS
  'One account. Exists from OTP verification onward; the profile answers are filled in by setup, which runs once straight after sign-up.';
COMMENT ON COLUMN users.verified_with IS
  'Which detail a code was actually delivered to, and so what the account is. Defaulted rather than left null: every row written before it was recorded was made by email, because phone verification has never been switched on.';
COMMENT ON COLUMN users.dob IS
  'A real date. The wire format is DD/MM/YYYY and is converted on the way in, which is what makes age at diagnosis answerable in SQL.';
COMMENT ON COLUMN users.p_duration IS
  'How long they have had Parkinson disease, in months. The form asks for years and months separately and folds them together.';
COMMENT ON COLUMN users.recc_falls IS
  'Falls in the last year, or NULL for no history of them. NULL is not 0 - 0 means a history of falls, but none in the last year.';
COMMENT ON COLUMN users.recc_falls_type IS
  'NULL whenever recc_falls is: there were no falls to characterise.';
COMMENT ON COLUMN users.addiction IS
  'What they use, or NULL for no history. An empty array is a third answer: a history the user chose not to break down.';
COMMENT ON COLUMN users.non_motor_symptoms IS
  'May be empty. "None of these" is an answer, not a skip.';
COMMENT ON COLUMN users.diabetes_yrs IS
  'NULL means the condition was answered no. 0 is a different answer - diagnosed, but under a year ago.';
COMMENT ON COLUMN users.hypertension_yrs IS
  'NULL means the condition was answered no. 0 means diagnosed under a year ago.';
COMMENT ON COLUMN users.thyroid_yrs IS
  'NULL means the condition was answered no. 0 means diagnosed under a year ago.';
COMMENT ON COLUMN users.profile_completed_at IS
  'Set once, when setup is saved. NULL means the form is still owed.';
COMMENT ON COLUMN users.profile_updated_at IS
  'Last time the profile screen saved. NULL on a profile nobody has been back to since setup, which is why it is separate from profile_completed_at.';
COMMENT ON COLUMN users.phone_national IS
  'The last ten digits of the phone - what identifies a number in this app. "+91 98765 43210" and "9876543210" are one number and must not become two accounts, so uniqueness is enforced here rather than on the raw text. Revisit if parkPD is ever used across more than one dialling code: two numbers in different countries sharing their last ten digits would collide, exactly as they do in the current service.';

-- Addresses are lowercased in the service before they are stored, so a plain
-- unique index is enough. Partial, because most rows may have only one of the
-- two contact details.
CREATE UNIQUE INDEX users_email_key ON users (email) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX users_phone_national_key ON users (phone_national) WHERE phone IS NOT NULL;

-- For "who has ever reported freezing while walking" - the only way to search
-- an answer_list without reading every row.
CREATE INDEX users_first_symptom_gin ON users USING gin (first_symptom);

CREATE INDEX users_non_motor_symptoms_gin ON users USING gin (non_motor_symptoms);


-- ---------------------------------------------------------------------------
-- daily_logs
--
-- One row per person per day: the questions asked once for the whole day - the
-- morning check, the medication plan, the night. The doses live next door.
--
-- log_date is the day being logged in the user own timezone, which is the day
-- the person lived and so the thing they are logging. Local, while every
-- timestamp beside it is absolute, and deliberately so.
-- ---------------------------------------------------------------------------
CREATE TABLE daily_logs (
  id                                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                            uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  log_date                           date        NOT NULL,
  timezone                           text        CHECK (length(timezone) <= 64),
  utc_offset_minutes                 smallint    NOT NULL
                                                 CHECK (utc_offset_minutes BETWEEN -720 AND 840),
  wake_time                          timestamptz NOT NULL,
  morning_symptoms                   answer_list NOT NULL,
  wakeup_independence_pct            pct         NOT NULL,
  daily_activities_independence_flag flag        NOT NULL,
  medicine_name                      text        NOT NULL
                                                 CHECK (medicine_name IN ('Syndopa', 'Syncapone')),
  dose_count                         smallint    NOT NULL CHECK (dose_count BETWEEN 0 AND 8),
  other_meds                         answer_list,
  med_side_effects                   answer_list,
  night_wakeup_flag                  flag        NOT NULL,
  night_wakeup_count                 smallint    CHECK (night_wakeup_count BETWEEN 1 AND 4),
  night_symptoms                     answer_list,
  night_symptoms_troublesome_flag    flag,
  created_at                         timestamptz NOT NULL DEFAULT now(),
  updated_at                         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_logs_user_day_key UNIQUE (user_id, log_date),
  CONSTRAINT daily_logs_day_identity_key UNIQUE (id, user_id, log_date),
  CONSTRAINT daily_logs_unbroken_night_is_silent CHECK (
    night_wakeup_flag = 1 OR (
      night_wakeup_count              IS NULL AND
      night_symptoms                  IS NULL AND
      night_symptoms_troublesome_flag IS NULL
    )
  ),
  CONSTRAINT daily_logs_broken_night_has_count CHECK (
    night_wakeup_flag = 0 OR night_wakeup_count IS NOT NULL
  ),
  CONSTRAINT daily_logs_troublesome_needs_symptoms CHECK (
    (night_symptoms IS NULL) = (night_symptoms_troublesome_flag IS NULL)
  )
);

COMMENT ON TABLE daily_logs IS
  'One row per person per day - the questions asked once for the whole day. The doses are in dose_logs.';
COMMENT ON COLUMN daily_logs.log_date IS
  'The day being logged, in the user own timezone. Local, while the timestamps beside it are absolute.';
COMMENT ON COLUMN daily_logs.timezone IS
  'The IANA zone the log was recorded in, or NULL on a device that cannot name one. The instants are what make two logs comparable; this is what lets a wake-up time be read back as the hour of the morning it actually was.';
COMMENT ON COLUMN daily_logs.morning_symptoms IS
  'May be empty. "None" is a real answer, not a skipped question.';
COMMENT ON COLUMN daily_logs.dose_count IS
  'Occasions in the day, not tablets on any one of them. Zero is an answer. This is what the dose_logs rows for the day have to add up to.';
COMMENT ON COLUMN daily_logs.other_meds IS
  'NULL when nothing was chosen, never an empty array: this question has no "none" option of its own, so an empty list would be a claim the user never made.';
COMMENT ON COLUMN daily_logs.med_side_effects IS
  'NULL when nothing was chosen, never an empty array - as with other_meds.';
COMMENT ON COLUMN daily_logs.night_wakeup_count IS
  'How many times, or NULL on an unbroken night. 4 means four or more.';
COMMENT ON COLUMN daily_logs.updated_at IS
  'Moves when a day is logged again. created_at stays put.';
COMMENT ON CONSTRAINT daily_logs_user_day_key ON daily_logs IS
  'The real key: two people log the same date, and one person logs a date at most once. This is what makes a re-submit safe - the day someone fills in a second time to correct it ends up as one row, not two that disagree.';
COMMENT ON CONSTRAINT daily_logs_day_identity_key ON daily_logs IS
  'Exists so dose_logs can carry its own copy of user_id and log_date and still be unable to disagree with the day it points at. See dose_logs_day_fk.';

-- (user_id, log_date) ascending is already indexed by daily_logs_user_day_key.
-- This one serves the descending "newest day first" list without a sort.
CREATE INDEX daily_logs_user_recent_idx ON daily_logs (user_id, log_date DESC);


-- ---------------------------------------------------------------------------
-- dose_logs
--
-- One row per dose. Kept apart from the day rather than nested inside it
-- because a dose is what this app is actually about: how long the medicine
-- took to work, and how often it wore off early, are questions about doses,
-- and they should not have to open every day of the year and dig through an
-- array to find them.
--
-- The three "a moment, or a word saying the moment never came" fields are each
-- split into a timestamp and a flag:
--
--     <name>_time    the instant, or NULL
--     <name>_flag    1 = a time was recorded
--                    0 = the sentinel, no-effect or no-return
--                    NULL = the question was never reached
--
-- The wire sends one field carrying either an instant or the sentinel word.
-- Storing that verbatim would mean a text column, and a text column cannot be
-- subtracted from another - which is the whole analysis this data exists for.
-- The pair costs one mapping step in the service and keeps "median minutes to
-- first effect" a plain SQL query.
--
-- user_id and log_date are denormalised from the day so a dose row is legible
-- on its own and the common "this person doses on this date" read needs no
-- join. dose_logs_day_fk is what stops the copies ever drifting, and it is why
-- there is no separate single-column foreign key on daily_log_id - two
-- overlapping constraints would only mean two checks per insert to prove the
-- same thing.
--
-- NOTE: that a day holds exactly dose_count dose rows spans two tables, so it
-- is not a CHECK. The service already enforces it on the way in, in
-- assertDosesMatchPlan. Add a constraint trigger here only if something other
-- than the API will ever write doses.
-- ---------------------------------------------------------------------------
CREATE TABLE dose_logs (
  id                          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id                uuid         NOT NULL,
  user_id                     uuid         NOT NULL,
  log_date                    date         NOT NULL,
  dose_number                 smallint     NOT NULL CHECK (dose_number BETWEEN 1 AND 8),
  dose_time                   timestamptz  NOT NULL,
  tablets_count               numeric(4,3) NOT NULL
                                           CHECK (tablets_count BETWEEN 0.25 AND 4.5),
  first_effect_time           timestamptz,
  first_effect_flag           flag         NOT NULL,
  peak_effect_time            timestamptz,
  peak_effect_flag            flag,
  pal_pct                     pct,
  at_pal_dl_affected_flag     flag,
  dysky_flag                  flag,
  dysky_duration              smallint     CHECK (dysky_duration BETWEEN 1 AND 1439),
  dysky_body_part             body_part_list,
  dysky_dl_affected_flag      flag,
  med_wear_off_time           timestamptz,
  med_wear_off_flag           flag,
  off_period_dl_affected_flag flag,
  created_at                  timestamptz  NOT NULL DEFAULT now(),
  updated_at                  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT dose_logs_day_number_key UNIQUE (daily_log_id, dose_number),
  CONSTRAINT dose_logs_day_fk FOREIGN KEY (daily_log_id, user_id, log_date)
    REFERENCES daily_logs (id, user_id, log_date)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT dose_logs_first_effect_pair CHECK (
    (first_effect_flag = 1 AND first_effect_time IS NOT NULL)
    OR (first_effect_flag = 0 AND first_effect_time IS NULL)
  ),
  CONSTRAINT dose_logs_peak_effect_pair CHECK (
    (peak_effect_flag IS NULL AND peak_effect_time IS NULL)
    OR (peak_effect_flag = 0 AND peak_effect_time IS NULL)
    OR (peak_effect_flag = 1 AND peak_effect_time IS NOT NULL)
  ),
  CONSTRAINT dose_logs_wear_off_pair CHECK (
    (med_wear_off_flag IS NULL AND med_wear_off_time IS NULL)
    OR (med_wear_off_flag = 0 AND med_wear_off_time IS NULL)
    OR (med_wear_off_flag = 1 AND med_wear_off_time IS NOT NULL)
  ),
  CONSTRAINT dose_logs_no_effect_is_silent CHECK (
    first_effect_flag = 1 OR (
      peak_effect_flag            IS NULL AND
      pal_pct                     IS NULL AND
      at_pal_dl_affected_flag     IS NULL AND
      dysky_flag                  IS NULL AND
      dysky_duration              IS NULL AND
      dysky_body_part             IS NULL AND
      dysky_dl_affected_flag      IS NULL AND
      med_wear_off_flag           IS NULL AND
      off_period_dl_affected_flag IS NULL
    )
  ),
  CONSTRAINT dose_logs_worked_is_complete CHECK (
    first_effect_flag = 0 OR (
      peak_effect_flag            IS NOT NULL AND
      pal_pct                     IS NOT NULL AND
      at_pal_dl_affected_flag     IS NOT NULL AND
      dysky_flag                  IS NOT NULL AND
      med_wear_off_flag           IS NOT NULL AND
      off_period_dl_affected_flag IS NOT NULL
    )
  ),
  CONSTRAINT dose_logs_dyskinesia_details CHECK (
    dysky_flag IS NULL
    OR (dysky_flag = 1 AND dysky_duration         IS NOT NULL
                       AND dysky_body_part        IS NOT NULL
                       AND dysky_dl_affected_flag IS NOT NULL)
    OR (dysky_flag = 0 AND dysky_duration         IS NULL
                       AND dysky_body_part        IS NULL
                       AND dysky_dl_affected_flag IS NULL)
  ),
  CONSTRAINT dose_logs_effect_after_dose CHECK (
    first_effect_time IS NULL OR first_effect_time >= dose_time
  ),
  CONSTRAINT dose_logs_peak_after_first_effect CHECK (
    peak_effect_time IS NULL OR first_effect_time IS NULL
    OR peak_effect_time >= first_effect_time
  ),
  CONSTRAINT dose_logs_wear_off_after_dose CHECK (
    med_wear_off_time IS NULL OR med_wear_off_time >= dose_time
  )
);

COMMENT ON TABLE dose_logs IS
  'One row per dose. Kept apart from the day because a dose is what this app is about - how long the medicine took to work, and how often it wore off early.';
COMMENT ON COLUMN dose_logs.user_id IS
  'Denormalised from the day so a dose row is legible on its own. dose_logs_day_fk stops it drifting from the day it points at.';
COMMENT ON COLUMN dose_logs.log_date IS
  'Denormalised from the day, so "this person doses on this date" needs no join. Guaranteed to match the day by dose_logs_day_fk.';
COMMENT ON COLUMN dose_logs.dose_number IS
  '1, 2, 3 - the order they were taken in, which the day chain depends on.';
COMMENT ON COLUMN dose_logs.tablets_count IS
  'Tablets on this occasion - 1, 1.5, 2.333. Three decimal places because a third of a tablet has no exact one and the client rounds it there.';
COMMENT ON COLUMN dose_logs.first_effect_flag IS
  '1 = a first-effect time was recorded. 0 = the dose never worked, which the wire sends as the word no-effect.';
COMMENT ON COLUMN dose_logs.peak_effect_flag IS
  '1 = a peak time was recorded. 0 = the wire sent no-effect. NULL = never asked, because the dose never worked.';
COMMENT ON COLUMN dose_logs.pal_pct IS
  'How much of the usual activity was possible at the peak, 0 to 100.';
COMMENT ON COLUMN dose_logs.dysky_duration IS
  'Minutes of involuntary movement. Only asked when dysky_flag is 1.';
COMMENT ON COLUMN dose_logs.med_wear_off_flag IS
  '1 = a wear-off time was recorded. 0 = the symptoms never came back, which the wire sends as the word no-return. NULL = never asked.';
COMMENT ON CONSTRAINT dose_logs_no_effect_is_silent ON dose_logs IS
  'A dose that never worked ends there: the questions after "did you feel it working" are about a period that never began, so they were never asked.';
COMMENT ON CONSTRAINT dose_logs_effect_after_dose ON dose_logs IS
  'Readings are stamped with one clock that only moves forwards, so a later reading before an earlier one means the chain was built wrong.';

-- "This person doses on this date", and the calendar month sweep.
CREATE INDEX dose_logs_user_day_idx ON dose_logs (user_id, log_date, dose_number);

-- "Every dose this person has taken, in order" - the trend queries.
CREATE INDEX dose_logs_user_time_idx ON dose_logs (user_id, dose_time);


-- ---------------------------------------------------------------------------
-- refresh_tokens
--
-- One row per signed-in device. The token itself is never stored: what is here
-- is a keyed HMAC of it, so a copy of this table is useless on its own. The
-- hash is deterministic, which is what lets a presented token be looked up in
-- one pass rather than compared row by row.
-- ---------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  token_hash  char(64)    PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN refresh_tokens.token_hash IS
  'HMAC-SHA256 of the token as 64 lowercase hex characters. It is the lookup key, so it is the primary key.';

-- Serves both "this user live sessions", for the ten-per-account cap, and the
-- sweep that drops expired rows.
CREATE INDEX refresh_tokens_user_expiry_idx ON refresh_tokens (user_id, expires_at);


-- ---------------------------------------------------------------------------
-- otp_challenges
--
-- Short-lived by nature - a row here outlives its use by minutes. Kept as a
-- table anyway so the whole of the app state is in one place, and so the
-- attempt counter is incremented under the database locking rather than by
-- rewriting a file.
--
-- There is no foreign key to users: a signup challenge is issued before the
-- account exists, which is the point of it.
-- ---------------------------------------------------------------------------
CREATE TABLE otp_challenges (
  challenge_id uuid        PRIMARY KEY,
  contact      text        NOT NULL,
  otp_hash     text        NOT NULL,
  purpose      text        NOT NULL CHECK (purpose IN ('login', 'signup')),
  method       text        NOT NULL CHECK (method IN ('email', 'phone')),
  expires_at   timestamptz NOT NULL,
  attempts     smallint    NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN otp_challenges.contact IS
  'Where the code was sent - an address or a number, per method. Named for what it is rather than for the only kind there used to be.';
COMMENT ON COLUMN otp_challenges.otp_hash IS
  'Hashed, never the raw code.';
COMMENT ON COLUMN otp_challenges.attempts IS
  'Wrong guesses so far. Caps brute force.';
COMMENT ON COLUMN otp_challenges.created_at IS
  'Also what the resend cooldown is measured from.';

-- The resend check: the newest live challenge for one contact.
CREATE INDEX otp_challenges_contact_idx ON otp_challenges (contact, created_at DESC);

CREATE INDEX otp_challenges_expiry_idx ON otp_challenges (expires_at);


-- ---------------------------------------------------------------------------
-- updated_at, kept by the database rather than by each caller, so a row cannot
-- be changed without the timestamp moving.
-- ---------------------------------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER daily_logs_set_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER dose_logs_set_updated_at
  BEFORE UPDATE ON dose_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
