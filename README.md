# ParkPD — running locally

A parking app for people with Parkinson's. NestJS backend + React Native
frontend (iOS, Android, web from one codebase).

> **Accessibility rules are non-negotiable** — the audience is adults 60+ with
> vision, motor, and cognitive changes. See [`CLAUDE.md`](./CLAUDE.md) before
> writing UI.

```
parkPD/
├── backend/park-pd-server/   NestJS API — :8000
└── frontend/parkPD/          React Native — iOS, Android, web
```

Both halves pick their environment with the same variable, `PARKPD_ENV`
(`local` | `test` | `prod`). **Unset means `local` on both sides**, so nothing
in this guide needs it. Full script lists:
[frontend](frontend/parkPD/README.md#scripts) ·
[backend](backend/park-pd-server/.env.example).

---

## 1. Backend (start this first — every platform needs it)

Own terminal:

```sh
cd backend/park-pd-server
npm run start:dev    # watch mode, restarts on save
```

Serves on **http://localhost:8000**.

The frontend picks the right host automatically. Web and the iOS simulator use
`localhost:8000`; the Android emulator uses `10.0.2.2:8000`, because inside the
emulator `localhost` means the emulator itself. Both come from
[`src/api/env/local.ts`](frontend/parkPD/src/api/env/local.ts), which Metro and
Vite select at build time — see
[the frontend README](frontend/parkPD/README.md#which-backend-the-app-talks-to).

---

## 2. Web

```sh
cd frontend/parkPD
npm run web
```

Vite dev server on **http://localhost:3000**, opens automatically. Fastest loop
for UI work — no emulator, no native build.

---

## 3. iOS simulator

On a fresh clone, and after any native dependency change:

```sh
cd frontend/parkPD
bundle install                                    # once, installs CocoaPods
bundle exec pod install --project-directory=ios
```

Then:

```sh
npm start            # terminal 1 — Metro (skip if already running)
npm run ios          # terminal 2 — build + launch simulator
```

Pick a specific device: `npm run ios -- --simulator="iPhone 17 Pro"`.

---

## 4. Android emulator

The AVD is already created and named **`parkpd`**. Three terminals:

```sh
emulator -avd parkpd &   # terminal 1 — wait for the home screen
npm start                # terminal 2 — Metro (skip if already running for iOS)
npm run android          # terminal 3 — build + install
```

Confirm the emulator is up before building — `adb devices` must list
`emulator-5554   device`.

One Metro instance serves iOS, Android, and native web alike, so terminal 2 is
shared between platforms.

If the emulator shows a "find and connect to nearby devices" dialog, tap
**Allow** — denying it blocks calls to `10.0.2.2:8000`. Or grant it directly:

```sh
adb shell pm grant com.parkpd android.permission.ACCESS_LOCAL_NETWORK
```

---

## Pointing the app at a deployed backend

Useful on a physical device, which reaches neither `localhost` nor `10.0.2.2`.
Restart **Metro** with the environment set — in a debug build the JavaScript is
served by Metro, so it is that terminal's environment that counts, not the one
you type `npm run android` in:

```sh
cd frontend/parkPD
npm run start:prod   # then npm run ios / npm run android as usual
npm run web:prod     # web equivalent
```

A release APK cannot talk to a `local` backend at all — release builds block
plain HTTP — which is why `build:apk` is prod-only.

---

## Handy resets

```sh
cd frontend/parkPD

npm start -- --reset-cache                       # Metro cache
cd android && ./gradlew clean && cd ..           # Android
cd ios && rm -rf Pods build && bundle exec pod install && cd ..   # iOS

lsof -nP -iTCP:8081 -sTCP:LISTEN                 # who's holding Metro's port
```

```

TODOs
railway setup for db

buy domain
railway setup for server
real otp setup for mobile + gmail
give a testable mobile verion

host backend on server
deploy on playstore
deploy on app store//we will add the apple pay option it will be less hectic

1. payment integration
2. notification service
3.

```
