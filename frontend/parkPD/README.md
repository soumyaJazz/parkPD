# ParkPD frontend

React Native 0.87. One codebase, three targets: **iOS**, **Android**, and
**web** (react-native-web, bundled by Vite instead of Metro).

> **Accessibility rules are non-negotiable.** The audience is adults 60+ with
> vision, motor and cognitive changes. Read [`CLAUDE.md`](../../CLAUDE.md)
> before writing any UI.

---

## Start the backend first

Every target calls the API, so nothing below is much use on its own:

```sh
cd ../../backend/park-pd-server
npm run start:dev          # http://localhost:8000
```

---

## Which backend the app talks to

`PARKPD_ENV` decides, and **unset means `local`** — so the everyday commands
need no prefix.

| `PARKPD_ENV` | Base URL |
| --- | --- |
| unset / `local` | `http://localhost:8000`, or `http://10.0.2.2:8000` on Android |
| `test` | the staging deployment |
| `prod` | `https://parkpd-production.up.railway.app` |

`10.0.2.2` is not a typo: inside an Android emulator, `localhost` means the
emulator itself, and `10.0.2.2` is its alias for the host machine.

The three environments live in [`src/api/env/`](src/api/env/) as ordinary
committed modules. At build time Metro and Vite each rewrite the `parkpd/env`
import to exactly one of them, so the others never reach the bundle. The rules
are shared in [`env.config.cjs`](env.config.cjs); a typo like
`PARKPD_ENV=production` fails the build rather than silently falling back.

> **The Metro server owns this, not the build command.** In a debug build the
> JavaScript is served by Metro, so it is the `npm start` terminal whose
> environment counts. Running `PARKPD_ENV=prod npm run android` against a Metro
> that started as `local` gets you `local`. Restart Metro instead:
> `npm run start:prod`.

---

## Web

The fastest loop for UI work — no emulator, no native build.

```sh
npm run web
```

Vite dev server on **http://localhost:3000**, opens automatically. Hot reload on
save.

---

## iOS simulator

On a fresh clone, install CocoaPods itself, then the pods:

```sh
bundle install                       # once, installs CocoaPods
bundle exec pod install --project-directory=ios
```

Re-run `pod install` after any native dependency change. Then:

```sh
npm start                            # terminal 1 — Metro
npm run ios                          # terminal 2 — build + launch
```

Pick a device: `npm run ios -- --simulator="iPhone 17 Pro"`.

The simulator shares the host's loopback, so `localhost:8000` reaches your
backend with no extra setup.

---

## Android emulator

The AVD already exists and is named **`parkpd`**. Three terminals:

```sh
emulator -avd parkpd &               # terminal 1 — wait for the home screen
npm start                            # terminal 2 — Metro (shared with iOS)
npm run android                      # terminal 3 — build + install
```

Check the emulator is actually up before building — `adb devices` must list
`emulator-5554   device`.

If a **"find and connect to nearby devices"** dialog appears, tap **Allow**.
Denying it blocks calls to `10.0.2.2:8000`. To grant it directly:

```sh
adb shell pm grant com.parkpd android.permission.ACCESS_LOCAL_NETWORK
```

---

## A physical device

Neither `localhost` nor `10.0.2.2` reaches a real phone. Two options:

- **Point it at the deployment** — `npm run start:prod`, then build as usual.
- **Point it at your laptop** — put your LAN address (`ipconfig getifaddr en0`)
  in [`src/api/env/local.ts`](src/api/env/local.ts) in place of `DEV_HOST`, with
  the phone on the same Wi-Fi.

A **release** APK cannot use `local` at all: release builds merge
`usesCleartextTraffic="false"`, so plain HTTP is blocked outright. That is why
there is no `build:apk:local`.

---

## Scripts

| Command | Target | Environment |
| --- | --- | --- |
| `npm start` | Metro (iOS + Android) | local |
| `npm run start:test` | Metro | test |
| `npm run start:prod` | Metro | prod |
| `npm run ios` | iOS simulator | whichever Metro is running |
| `npm run android` | Android emulator | whichever Metro is running |
| `npm run web` | Vite dev server, :3000 | local |
| `npm run web:test` / `web:prod` | Vite dev server | test / prod |
| `npm run build:web` | web production bundle → `dist/` | prod |
| `npm run build:web:test` | web production bundle | test |
| `npm run build:apk` | release APK | prod |
| `npm run build:apk:test` | release APK | test |
| `npm test` | Jest | always local |
| `npm run lint` | ESLint | — |

---

## When something is stuck

```sh
npm start -- --reset-cache                        # Metro cache
npm run clean:android                             # Gradle
cd ios && rm -rf Pods build && bundle exec pod install && cd ..

lsof -nP -iTCP:8081 -sTCP:LISTEN                  # who is holding Metro's port
lsof -nP -iTCP:3000 -sTCP:LISTEN                  # ...or Vite's
```

Full reload: **Android** — press <kbd>R</kbd> twice, or <kbd>Cmd ⌘</kbd> +
<kbd>M</kbd> for the Dev Menu. **iOS** — press <kbd>R</kbd> in the simulator.
