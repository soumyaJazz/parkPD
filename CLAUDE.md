## API Response Conventions

- Every backend response (success or error) must include a `message` field
  intended for display in the frontend UI.
- Success example:
  { "success": true, "message": "User created successfully", "data": {...} }
- Error example:
  { "success": false, "message": "Email already exists", "error": {...} }
- Never return a raw error/exception without a human-readable `message`.
- Keep messages short, user-friendly, and free of internal stack traces or
  technical jargon — those go in a separate `error`/`details` field, not `message`.

# CLAUDE.md — ParkPD

## Audience

Primary users are older adults (60+), many with age-related vision, motor,
and cognitive changes. This governs every UI/UX decision in this repo.
Apply these rules automatically to any component, page, or style you write —
don’t wait to be asked. If a request conflicts with a rule below, follow the
rule and say why instead of silently prioritizing visual trend.

## Typography

- Body text minimum 16px, ideally 18px. Never below 14px, even for captions/labels.
- Line height 1.5–1.6 for body text.
- Font weight 400 minimum for body, 600+ for buttons/errors/critical text — avoid thin/light weights.
- Avoid all-caps for anything longer than a short label.
- Left-align body text; never justify.

## Color & contrast

- WCAG AA minimum (4.5:1 body text, 3:1 large text/icons); AAA (7:1) for critical text — OTP codes, prices, errors.
- Never convey meaning with color alone — pair with an icon or text label.
- Avoid low-contrast “muted gray on white” (e.g. `#6B7280`-on-white body text) — too low-contrast for this audience.
- Avoid pure black (`#000`) on pure white (`#FFF`) for large text blocks — use near-black (`~#1A1A1A`) on off-white instead.

## Touch targets & spacing

- Minimum 44×44px touch targets, 48×48px preferred.
- Minimum 8px spacing between adjacent interactive elements.
- No icon-only buttons without a label, unless the icon is universally understood (e.g. a close “X”).

## Layout & structure

- One primary action per screen — avoid competing CTAs.
- Never make a gesture (swipe, long-press, pinch) the _only_ way to do something critical — always provide a visible tappable alternative.
- No auto-advancing/auto-dismissing UI (toasts vanishing in 3s, instant-submit OTP) without a way to review or undo — prefer manual confirm or a generous timeout.
- Chunk information; avoid dense multi-field screens or long unbroken text blocks.

## Motion & feedback

- Animations under 300ms, non-essential, and respect `prefers-reduced-motion`.
- Never let animation alone signal an outcome — pair with a text confirmation.
- Every action needs immediate, visible feedback (pressed states, loading states, plain-language success/error).

## Forms & errors

- Persistent labels on every input — not placeholder-only text that disappears on focus.
- Errors state what went wrong and how to fix it in plain language, not just color/icon.
- Generous timers (OTP, session timeout) with an easy retry/extend path.

## Language & tone

- Plain, direct language — no jargon, abbreviations, or idioms.
- Confirm destructive actions in plain terms: “This will cancel your parking session,” not “Are you sure?”

## When proposing options

Flag any tradeoff between accessibility and visual trend explicitly (e.g.
“this uses lighter gray text than the a11y bar for this project — want me to
darken it?”) rather than picking the trendier option silently.
