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

## Next — features, in priority order

Everything above is about making what already exists safe to deploy. This is
what gets built after it, in the order agreed on 2026-09-08:

**real OTP delivery → payment → Hindi → push notifications**

The order is not arbitrary. Nobody can sign in without the first. Nobody can
pay without an account. Nothing needs translating until there is something
worth reading in it. And a notification has nowhere useful to land until the
other three exist.

---

### 1. Real OTP validation — email *and* mobile number

Neither channel actually delivers today. Email is written and switched off
(blocking item 3 above is the switch). Mobile has no provider at all, so
`SmsService` refuses phone sign-in outright — "sign in with your mobile number"
is a screen with nothing behind it.

**Email** — mostly item 3, plus the two things it does not cover:

- [ ] Deliverability, not just delivery: SPF and DKIM on the sending domain.
      Without them the codes land in spam, and to the user that is
      indistinguishable from the app being broken.
- [ ] `backend/park-pd-server/src/mail/mail.service.ts:40` and `:42` — "expires
      in 5 minutes" is hardcoded in both the text and the HTML body while the
      real value lives in `OTP_EXPIRY_MINUTES`. If the OTP work above moves
      expiry to 10, these two lines start lying to users.

**Mobile**

- [ ] Choose a provider. India-first means **DLT registration** — sender ID and
      message template pre-registered with TRAI — before a single transactional
      SMS delivers. That is a paperwork lead time, not a coding one, so start it
      well before the code is ready or it becomes the thing everything waits on.
- [ ] `backend/park-pd-server/src/sms/sms.service.ts:37` — the TODO there spells
      out what the provider call needs, down to the number format and the
      message body. It is a change to that one file: the account model, both
      flows and every screen are already finished and channel-agnostic.
- [ ] Same hardcoded "5 minutes" in the message body at `sms.service.ts:40`.
- [ ] `SMS_ENABLED=true` and the provider credentials on the Railway service.
      Keep the throw-rather-than-resolve-quietly behaviour that file already
      has — a silent success is a user waiting for a code that never comes.
- [ ] **Cost is an attack surface.** SMS is billed per message and anyone can
      make us send them. Today the only thing between a bored attacker and our
      invoice is the 60-second per-contact cooldown. Add a hard daily cap per
      number *before* this goes live, not after the first bill.
- [ ] When it works: delete "No SMS provider" from *Known and accepted* below,
      and the 503 that goes with it.

**Accessibility**

- [ ] **SMS autofill on both platforms.** Android needs the app hash appended to
      the message body; iOS needs the code recognisable in the text. This has to
      be designed into the message string, not bolted on afterwards — typing
      digits by hand is precisely what this audience finds hardest, and autofill
      is the whole fix.
- [ ] No auto-submit, still. Autofill fills the boxes; the user confirms.

---

### 2. Payment integration

Nothing exists yet — no price, no plan, no table, no provider.

**Decide before writing code**

- [ ] What is being sold, and whether it recurs. If it recurs, RBI's rules on
      recurring card payments mean auto-renew needs an e-mandate — manual
      renewal is less work and, for this audience, arguably kinder.
- [ ] **What happens when payment lapses.** People will have entered months of
      health records. Losing access to them is a very different product from
      losing access to new logging, and it is a decision, not a default.
- [ ] Provider: India-first points at Razorpay or Stripe India.
- [ ] **Never handle card numbers ourselves** — hosted page or provider SDK
      sheet only. This app already stores named individuals' health data;
      putting card data on the same breach surface buys nothing.

**Backend**

- [ ] A `payments` table and a webhook endpoint. The **webhook is the source of
      truth**, not the app's success callback — people close the app mid-payment
      and the callback never fires. Verify the signature, and make the handler
      idempotent: every provider retries.
- [ ] Per CLAUDE.md, every response carries a `message`. Payment is exactly
      where a raw gateway string must not reach the screen: "Your bank declined
      the payment. Please try another card." — the provider's
      `ERR_CARD_DECLINED_51` goes in `error`.

**Accessibility — these are the highest-stakes screens in the app**

- [ ] Prices are critical text: **AAA, 7:1**, 18px or larger, never gray on
      white.
- [ ] One primary action per screen. "Pay" and "Change plan" competing for the
      same thumb is how somebody pays for the wrong thing.
- [ ] Confirm in plain terms both ways: "This will charge ₹499 to your card
      today", "This will end your subscription on 12 October. Your logs stay."
- [ ] The receipt stays on screen until dismissed. A toast that vanishes is
      forbidden here for the same reason it is forbidden everywhere else, only
      the stakes are higher.
- [ ] Whatever timeout the provider's sheet has, check it survives someone
      reading every line slowly and fetching their card from another room.

---

### 3. Hindi language support

There is no i18n library and no string catalogue. Every user-facing string is a
literal in the JSX, and the backend's `message` fields are English too.

- [ ] Wire a library (`react-i18next` is the default choice for RN), then
      extract. **Extraction is the bulk of the work** — do it one screen at a
      time, completely, rather than scattering it.
- [ ] **The backend is a UI surface too.** Per CLAUDE.md every `message` is
      shown to the user, so either the server sends a code the app translates,
      or it accepts a language header and translates itself. Decide before
      extracting anything, or the job gets done twice.
- [ ] The language switch has to be findable *without reading English*: label it
      "हिन्दी" in its own script, put it on Profile, and offer it at first launch.

**Devanagari specifics — this is where "just translate the strings" goes wrong**

- [ ] Devanagari needs more vertical room; matras sit above and below the
      baseline. 1.5–1.6 line height is a floor here rather than a target, and
      any fixed-height row or button will clip.
- [ ] Bundle a font that actually covers the script (Noto Sans Devanagari). The
      RN default varies by device and OS version, which is how you get boxes.
- [ ] Hindi runs roughly 20–30% longer than English. Nothing may truncate or
      ellipsize; buttons wrap rather than shrink their text. The 16/18px floor
      does not bend to make a translation fit.
- [ ] Digits, dates and currency: pick Latin or Devanagari numerals **once**.
      OTP codes and prices are critical text, and whatever we pick has to match
      what the email and SMS show — otherwise the user is comparing two
      alphabets under time pressure.
- [ ] Translate into plain speech, not formal register. Machine-translated Hindi
      medical text reads as government officialese. Have a native speaker in the
      target age group read it aloud before it ships.

---

### 4. Push notifications

Last, and the easiest to get wrong in a way that makes people uninstall.
"Reminders" is already in the drawer with a hardcoded badge of `3`
(`frontend/parkPD/src/screens/Home/parts.tsx:223`) and nothing behind it.

- [ ] FCM and APNs, a device-token table, and token refresh — including
      invalidation on sign-out. Tokens outlive sessions, so a stale one sends
      somebody's dose reminder to whoever has that phone next.
- [ ] Decide what is allowed to notify: dose reminders and a daily-log nudge are
      the obvious two. Quiet hours on by default, and a cap per day.
- [ ] Ask for permission **at the moment the user turns a reminder on**, with a
      plain-language sentence saying what will be sent — not on first launch.
      iOS gives you one prompt; a denial is close to permanent.
- [ ] Reminders are wall-clock ("8:00 am"), not a UTC offset. Store the user's
      timezone or they break on travel and on DST.

**Accessibility**

- [ ] **A notification is never the only way to know something.** Everything a
      push says must also be visible in the app. Same reasoning as CLAUDE.md's
      rule about gestures: a channel that can fail silently — permission denied,
      phone off, notification swiped away — cannot be the only channel for
      anything that matters.
- [ ] The text must be complete and plain on a lock screen: "Time for your
      8:00 am dose", not "ParkPD reminder".
- [ ] Per-type toggles, and turning them off must be easy to find.

---

## Minor — small, and independent of everything above

- [ ] **Role column.** Add to `users` (`db/001_schema.sql:81`):
      `role text NOT NULL DEFAULT 'patient' CHECK (role IN ('patient','admin'))`.
      Existing rows take the default, so everyone becomes a patient; then set my
      own row by hand: `UPDATE users SET role = 'admin' WHERE email = '…';`.
      Add it to the `User` interface (`src/users/users.service.ts:23`) and to
      the select list, or it will not survive the round trip.

      Two things to keep in mind. **A column is not authorization** — until a
      guard reads it, `role` is a label, and shipping one that looks like it
      protects something is worse than not having it. Add the guard with the
      first admin-only route. And decide deliberately whether `role` travels to
      the client: hiding an admin button based on it is a convenience, never a
      control.

      Note this is the *second* hand-applied schema change — see "no migration
      runner" below. That is the point at which running SQL by hand stops being
      fine.

- [ ] **A chart in the Insights tab.** Insights is currently a drawer entry that
      answers "not ready yet" (`frontend/parkPD/src/screens/Home/HomeScreen.tsx:157`).
      It needs a screen before it needs a chart; daily logs are the data.

      Start with **one chart answering one question** — "are doses being taken on
      time?" — not a dashboard. Then:

      - Never color alone: label each series directly on the line, rather than a
        legend the reader has to match by hue.
      - 3:1 minimum contrast for lines and bars, 4.5:1 for any text; axis labels
        14px at the very smallest, 16 preferred.
      - No hover-only tooltips. This is touch, and the values should be readable
        without interacting at all.
      - A plain sentence above ("Your on-time doses over the last two weeks")
        and one below saying in words what it shows. A chart that only works for
        people who are comfortable reading charts excludes a real share of this
        audience.
      - Design the empty and near-empty states first. A new user has one day of
        data, and that is the state most people will see it in.

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
