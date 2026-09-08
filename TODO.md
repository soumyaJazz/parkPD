# ParkPD — outstanding work

Opened 2026-09-08, after the Postgres migration and the production-readiness
pass on the backend. Grouped by when it has to be done, not by how big it is.

---

## Blocking — before any real user signs up

### 1. Rotate the Railway Postgres password

The current password was pasted into a chat transcript. Nothing about it is
secret any more.

Railway → Postgres service → rotate. The backend reads
`DATABASE_URL=${{Postgres.DATABASE_URL}}`, a variable reference rather than a
literal, so rotating costs nothing — the new value is picked up on the next
deploy with no file to edit.

---

### 2. Move the OTP from 4 digits to 6  ← decided 2026-09-08

**Why.** A 4-digit code is 9,000 possibilities. With `OTP_MAX_ATTEMPTS=5` and a
60-second resend cooldown, someone targeting one account can request a code
(the response hands *them* the `challengeId`; the victim only gets the email),
guess five times, wait a minute, and repeat — 1,440 rounds a day, 7,200 guesses
against a 9,000-wide space:

- **~55% chance of breaking a chosen account within 24 hours**
- **~90% within three days**

Neither rate limit stops it. The per-challenge limit (10/min) is never reached
— the attacker only makes five guesses per challenge. The per-contact limit
(5/min) is never reached either, because the 60-second cooldown already binds
tighter. Both were built for bursts; this attack is patient.

Six digits is 900,000 possibilities, which drops the same attack to roughly
**0.8% a day**.

**Backend**

- [ ] `backend/park-pd-server/src/otp/otp.service.ts:80` —
      `crypto.randomInt(1000, 10000)` → `crypto.randomInt(100000, 1000000)`
- [ ] `backend/park-pd-server/src/auth/dto/verify-otp.dto.ts` — `@Length(4, 4)`
      → `(6, 6)`, `@Matches(/^\d{4}$/)` → `/^\d{6}$/`, and both messages
- [ ] `backend/park-pd-server/src/auth/auth.service.ts:248` — "A 4-digit code
      has been sent…"
- [ ] `backend/park-pd-server/.env` — `OTP_DEV_CODE=1234` becomes an invalid
      code the moment the DTO wants six digits. Change it to a 6-digit value or
      local sign-in breaks with a confusing validation error.
- [ ] `backend/park-pd-server/.env.example` — same note there

**Frontend**

- [ ] `frontend/parkPD/src/screens/Otp/OtpScreen.tsx:25` — `OTP_LENGTH = 4` → 6.
      Everything else in that file is derived from the constant, so the array,
      the paste-spill loop and `maxLength` follow for free.
- [ ] `frontend/parkPD/src/screens/Otp/OtpScreen.tsx:251` — "Please enter
      4-digit code"
- [ ] `frontend/parkPD/src/screens/SignUp/SignUpScreen.tsx:33` — "We'll send you
      a 4-digit code to confirm your details."
- [ ] `frontend/parkPD/src/screens/Login/LoginScreen.tsx:33` — "We'll send you a
      4-digit code to verify it's you."

**Accessibility — this is the cost of the decision, so it is not optional**

Six digits is harder for our audience than four: more to hold in working memory
between the email app and this one, more to type, more places to slip. Having
chosen the security, these are what keep the screen usable:

- [ ] **Touch targets.** `OtpScreen.styles.ts:45` gives `otpBox` `flex: 1`, so
      six boxes split the same row that four did — each loses about a third of
      its width. Measure on the narrowest device we support and confirm each box
      still clears **44×44px** (48 preferred). If it does not, the row needs to
      wrap, scroll, or become a single field rather than shrink.
- [ ] **Contrast.** CLAUDE.md names OTP codes as critical text — **AAA, 7:1**.
      Smaller boxes must not come with smaller or lighter type.
- [ ] **No auto-submit.** CLAUDE.md forbids instant-submit OTP. Filling the
      sixth box must not fire the request; the manual confirm stays.
- [ ] **Paste and SMS autofill** must still spill correctly across six boxes —
      typing six digits by hand is exactly what we want people to be able to
      avoid. There is already paste-spill handling at `OtpScreen.tsx:123`.
- [ ] **Expiry.** `OTP_EXPIRY_MINUTES=5` was sized for a 4-digit code. Six
      digits takes longer to read, switch apps for, and enter. Consider 10.

---

### 3. Turn on mail in production

`MAIL_ENABLED=false` means the server logs codes to the console instead of
sending them. SMS has no provider wired up, so it refuses phone sign-in outright
in production. Deployed as-is, **nobody can sign in at all** — email is the only
route and it is switched off.

- [ ] Set `MAIL_ENABLED=true` and the five `MAIL_*` values on the Railway
      backend service
- [ ] Do one real end-to-end sign-in against the deployed backend before telling
      anyone it is live

---

### 4. Point the app at the deployed backend

- [ ] `frontend/parkPD/src/api/config.ts:12` — `http://${DEV_HOST}:8000` →
      the `https://…up.railway.app` origin

Not just the host: it is cleartext HTTP. Android blocks that by default from API
28, and iOS ATS blocks it too, so the current value cannot work on a real device
regardless of what it points at. Railway terminates TLS, so nothing changes
server-side.

---

### 5. Finish the Railway setup

- [ ] Service **Settings → Root Directory** = `backend/park-pd-server`. Without
      it Railway builds from the repo root, never sees `railway.json`, and never
      finds the Nest app.
- [ ] Paste the variables from `backend/park-pd-server/.env.production.local`,
      then delete that file
- [ ] Confirm the Postgres service is actually named `Postgres` — if it is not,
      `${{Postgres.DATABASE_URL}}` silently fails to resolve and the backend
      will not boot
- [ ] `FRONTEND_ORIGIN` only matters if the `react-native-web` build gets
      deployed. Native iOS/Android are not subject to CORS and ignore it.
- [ ] Verify: `curl https://<backend>/health` → `{"status":"ok","database":"up"}`

---

## Cleanup — small, and each one removes a real risk

- [ ] **Delete `backend/park-pd-server/data/`.** Five JSON files still holding
      real health records, left over from before the Postgres migration.
      Gitignored, so nothing leaked, but it is a duplicate copy of personal data
      with no reason to exist.
- [ ] **Drop the `parkinson` schema.** A duplicate, empty copy of all five
      tables sitting beside `public`, left over from running `001_schema.sql`
      with the wrong schema selected. Verified empty by exact `count(*)`.
      `DROP SCHEMA parkinson CASCADE;`. Two identical table sets in one database
      is how you end up writing to one and reading the other.
- [ ] **`OTP_DEV_CODE` hygiene.** The two-variable override is default-safe —
      the server refuses to boot on `OTP_DEV_CODE` alone. The risk is
      procedural: `.env` already has half the combination set. Never let both it
      and `ALLOW_DEV_OTP_IN_PRODUCTION` reach the same deploy once real accounts
      exist, or authentication is off entirely.

---

## Known and accepted for now

Not urgent, but written down so they are decisions rather than oversights.

- [ ] **Refresh tokens sit in unencrypted AsyncStorage for 60 days.**
      `frontend/parkPD/src/api/tokenStorage.ts:6` already says so. Paired with
      health data, `react-native-keychain` (iOS Keychain / Android
      EncryptedSharedPreferences) is the fix, at roughly the same API surface.
- [ ] **The rate limiter is in-memory**, so its limits are per-instance. Fine at
      one replica. This matters more than it used to: the per-contact and
      per-challenge limits are now the real protection, not the per-IP one.
      A second replica needs a shared store.
- [ ] **No refresh-token reuse detection.** A stolen token silently signs the
      real device out instead of raising an alarm. Standard practice is to
      revoke the whole family on reuse.
- [ ] **No SMS provider**, so production is email-only and phone sign-in returns
      a 503. Deliberate and handled with a clear message — see the TODO in
      `backend/park-pd-server/src/sms/sms.service.ts` — but it means "sign in
      with your mobile number" does not exist yet.
- [ ] **No account deletion, data export, or consent record.** This stores named
      individuals' health data. If we operate in India, worth checking against
      the DPDP Act 2023 before real users sign up. Not a code question.
- [ ] **No migration runner.** `db/001_schema.sql` was applied by hand. Fine for
      one schema; needs a real story before the second change to it.
- [ ] **Lint debt:** 284 pre-existing errors, all in `users/users.service.ts`
      (248), `mail/mail.service.ts` (33) and `users/users.module.ts` (3). Almost
      all auto-fixable formatting. Left alone so far to keep diffs readable.
