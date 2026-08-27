# Progress Notes

Working doc for picking this project back up. See `README.md` for the portfolio-style overview; this is the "where did we leave off" version.

## Where we're at

Auth, the Dashboard home screen, and workout logging are all functional end-to-end against real Firestore data. Live at https://workout-tracker-7dd87.web.app (Firebase Hosting) as of 2026-08-25 — unlisted URL, not shared anywhere. No automated tests exist. Tech stack: React 19 + Vite 8, Firebase 12 (Auth + Firestore), react-router-dom 7.18.2, FontAwesome icons, wger.de's free public exercise API.

## What's been done

**Auth & account**
- Email/password auth via Firebase, with required email verification before reaching the app.
- Password reset now actually works (`sendPasswordResetEmail`) — it used to just toggle to the signup form.
- All authenticated routes (`/dashboard`, `/workout`, `/profile`, `/onboarding`, `/verify`) are gated by a `ProtectedRoute` wrapper that redirects signed-out visitors to `/`, instead of relying on each page to self-check.

**Dashboard (`/dashboard`)**
- Real data from `users/{uid}/workouts`: today's workout (or an empty-state CTA), a 7-day bar graph of workout days, a day-streak counter, and a Recent Activity list of the last 3 workouts.
- Stat tiles for workouts-this-week / day-streak / a locked "Macro Tracking — Coming Soon" tile.
- Loading and empty states for brand-new users with no logged workouts.
- Visual pass: blue/purple color-coded cards instead of one repeated accent, tightened spacing so it fits the viewport without scrolling.
- Navbar wired to real routes with active-state highlighting, including Meals/Progress (see "Pages & polish" below).

**Workout logging (`/workout`)**
- Per-exercise cards with per-set rows (weight, reps, RIR, a complete checkbox), add/remove sets and exercises freely, optional notes per exercise.
- Elapsed workout timer and a live sets-completed counter.
- "Add Exercise" is a live-search autocomplete backed by `src/services/exerciseApi.js`, which fetches wger.de's public exercise database (~860 exercises, free, no API key, CORS-open) once per session and caches it. Falls back to free-text entry if the API is slow/unavailable.
- Saves sets, notes, category, and equipment to Firestore; navigates back to `/dashboard` on save.

**Security pass**
- Reviewed live Firestore rules — confirmed they correctly scope all reads/writes to `request.auth.uid == userId` under `users/{uid}/**`, nothing was left open.
- Versioned those rules into the repo (`firestore.rules`, `firebase.json`, `.firebaserc`) so future changes go through `firebase deploy --only firestore:rules` instead of being edited live in the console.
- Bumped `react-router-dom` 7.14.2 → 7.18.2 (patches an open-redirect and a DoS advisory that were actually in the shipped bundle — traced the rest of `npm audit`'s findings to dev-only/unshipped code, no action needed there).
- Removed dead `registerUser` export and unused imports from the auth layer.
- Checked full git history for leaked secrets (private keys, service account files, `.env`, Stripe/AWS-style keys) — found nothing. The Firebase Web SDK config (`apiKey` etc. in `firebase.js`) is not a secret; Google documents it as safe to ship client-side. Real access control is the Firestore rules above, not that key.
- Added write-shape validation to `firestore.rules`: `users/{uid}` and `users/{uid}/workouts/{id}` now reject unknown top-level fields and wrong types (e.g. `weight` must be a number, can't add junk fields like `isAdmin`), on top of the existing per-owner access scoping. Can't validate individual array items (e.g. each set inside `exercises`) — Firestore rules have no loop/iteration construct, so that's validated at the top level (`exercises is list`) only. Tested against the Firestore emulator with `@firebase/rules-unit-testing` (installed temporarily, not a project dependency) covering both the app's real write shapes and rejected cases (cross-user writes, junk fields, wrong types) — all 10 cases passed before deploying.
- Added an `emulators.firestore` block to `firebase.json` (port 8080) so future rules changes can be tested locally via `firebase emulators:exec` instead of trusting a dry-run compile alone.
- Went through a second security checklist (server-side auth, session revocation, field tampering, session cookies, password hashing, login rate limiting) and checked each against this app's actual architecture rather than assuming a generic checklist applies: password hashing, login rate-limiting, and server-side auth enforcement are already fully handled by Firebase Auth itself (no custom backend exists — confirmed no `functions/` dir, and `authService.js` passes credentials straight to the Firebase SDK, never touching app code otherwise). "Secure session cookies" doesn't apply — this is a pure SPA with no server issuing cookies; the Firebase JS SDK persists tokens in IndexedDB instead. The one real gap found: `firestore.rules` checked `email is string` but never verified it matched the signed-in account — tightened to `data.email == request.auth.token.email`, closing a path where a valid-but-tampering client could write an arbitrary email into their own profile doc via a direct API call (the UI never allowed this, but rules are the actual enforcement boundary, not the UI). Verified via emulator: real writes still succeed, a spoofed email is rejected.

**Third security pass**
- Ran `npm audit`: 10 findings (1 critical, 7 high). Traced each to its actual dependency chain before deciding what mattered — `@grpc/grpc-js`, `protobufjs`, `websocket-driver` are Node-only code paths pulled in by the Firebase SDK's dependency tree but never bundled for the browser (confirmed by grepping the built `dist` output — none of those strings appear in it); the rest (`vite`, `postcss`, `nanoid`, `js-yaml`, `brace-expansion`, `@babel/core`) are pure dev-tooling deps, never shipped. Ran `npm audit fix` anyway since all fixes were non-breaking — now at 0 vulnerabilities, build still passes.
- Checked "parameterize queries" and "escape user content" against the actual code: not applicable / already covered. Firestore's query API is typed (field/operator/value as separate arguments, not string concatenation), so there's no SQL-injection-shaped surface here, and the only query in the app (`Dashboard.jsx`'s date-range fetch) filters on an app-computed date, never raw user text. React auto-escapes all JSX text content by default, and there's no `dangerouslySetInnerHTML`/`innerHTML`/`eval` anywhere in the app.
- "Restrict file uploads" — not applicable, the app has no file upload feature or Firebase Storage usage at all.
- Fixed a real gap: the signup form displays "password must be 8+ characters, 1 capital, 1 lowercase, 1 number, 1 special character" but nothing ever enforced it — `handleSignup` called Firebase Auth directly with zero validation, so any 6-character password (Firebase's own default minimum) would succeed despite the UI's claim. Added real client-side enforcement matching the stated policy in `Login.jsx`.
- Confirmed "force HTTPS" is already true by default — Firebase Hosting auto-redirects HTTP to HTTPS on `*.web.app` and already sends `Strict-Transport-Security`, verified directly against the live site.
- Added security headers via `firebase.json` (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` disabling camera/mic/geolocation since the app uses none of them) plus a CSP. Verified it live via a real authenticated Chrome session first (login, Dashboard, Workout's exercise search from wger.de — zero violations), then switched it from `Content-Security-Policy-Report-Only` to enforcing `Content-Security-Policy`.
- "Add bot protection" — the real mechanism here is Firebase App Check (reCAPTCHA-gated access to Auth/Firestore), but setting it up requires creating a reCAPTCHA site key and enabling enforcement in the Firebase/Google Cloud console — an account-level action, not something deployable via code alone. Flagged, not implemented; ask if you want to set this up.
- "Trim API responses" — already done. `exerciseApi.js`'s `trimExercise()` reduces the raw wger.de response to exactly `{id, name, category, equipment, image}` before it ever touches cache or state; confirmed it's the only `fetch()` call in the app.

**Fixed a real sign-in race condition (found via live browser testing)**
- While verifying the CSP fix in a real Chrome session, found that a fully-onboarded account (`isProfileComplete: true` in Firestore) still landed on `/onboarding` right after signing in — even though reloading the page afterward correctly landed on `/dashboard`. Root cause: `App.jsx`'s `onAuthStateChanged` callback set `user` synchronously but fetched `isProfileComplete` from Firestore asynchronously, and `loading` was never reset to `true` for that transition (only on the initial page mount). On a live sign-in, React re-rendered with `user` truthy but `profileComplete` still at its stale default (`false`) before the Firestore read resolved, and root route logic immediately committed a navigation to `/onboarding` based on that stale value — by the time the real value loaded, the app had already left `/` and never re-checked.
- Fixed by setting `loading` back to `true` at the start of every `onAuthStateChanged` invocation, not just the initial one, so the skeleton shows during the async check on sign-in too, exactly like it already did on page reload.
- Also found (unrelated) that `riley.s2003@hotmail.com` has leftover data from a version of the app that predates `isProfileComplete` entirely (`name`, `goal: "Lose Weight"`, string height/weight like `"5'11"`) — landing on onboarding for that account is actually correct given its data, but the stray `name` field would make Firestore reject any future save to it (not in the rules' allowlist, and `merge: true` never removes it). Not yet cleaned up — ask if that account still matters or can be ignored/reset.

**Profile bug fixes & unit preferences**
- Fixed a real bug where entering weight/height on the profile always corrupted to `NaN`: the input's displayed `value` was a formatted string with a unit suffix baked in (e.g. `"180 lbs"`), but `onChange` wrote whatever got typed straight back into state — one keystroke landing inside the suffix text and every future render did `"180 lbs" * 2.20462` → `NaN`, permanently. Combined with `NaN` being falsy, this also made the field look blank/unsaved on every reload even though a (corrupted) value had actually been written — that's what looked like "profile info isn't linking to my account."
- Replaced it with a real imperial/metric toggle, persisted per-user (`unitSystem: 'imperial' | 'metric'` on the profile doc, added to the Firestore rules allowlist). Weight and height are edited in whichever unit is currently selected — conversion only happens on toggle or save, never per-keystroke, which is what avoids reintroducing the same class of bug. Height in imperial mode is two fields (ft/in) instead of one.
- Weight/height inputs now show a persistent unit label (`lbs`/`kg`, `ft`/`in`/`cm`) next to the field instead of unit text living inside the editable value.
- Email field is no longer a free-text copy that could drift from the real account — it now always displays `auth.currentUser.email` and can't be edited (changing your actual sign-in email is a Firebase Auth operation, not a profile field).

**Routing fixes**
- `App.jsx`'s root route now checks `isProfileComplete` from Firestore and sends users to `/onboarding` or `/dashboard` accordingly (previously always sent verified users to `/workout`, and never checked onboarding status).
- `Verification.jsx`'s "I've Verified" button now checks `isProfileComplete` itself and navigates directly to `/onboarding` or `/dashboard` — it can't rely on `App.jsx`'s state because `auth.currentUser.reload()` doesn't trigger `onAuthStateChanged`, so the root route's cached user object would still look unverified right after clicking.

**Deployment**
- Added `hosting` config to `firebase.json` (`public: dist`, SPA rewrite to `index.html`) and deployed via `firebase deploy --only hosting`.
- Live at https://workout-tracker-7dd87.web.app. It's an unlisted default `*.web.app` subdomain — fine for testing on your phone.
- To redeploy after future changes: `npm run build` then `npx firebase deploy --only hosting`.

**Pages & polish**
- Meals/Progress nav tabs now link to real (placeholder) `/meals` and `/progress` routes rendering a shared `ComingSoon` component, instead of being inert.
- Unmatched routes now hit a proper branded 404 page (`NotFound.jsx`) instead of silently redirecting to `/`.
- Replaced plain "Loading..." text with shimmer skeleton placeholders — one for the app-startup auth check (`AppSkeleton.jsx`), one for the Dashboard's Firestore fetch (matches the real card layout so nothing jumps into place).

**Performance**
- Re-encoded the three oversized PNGs (logo, two hero/background photos) to WebP — went from ~6.1MB combined to ~196KB, no visible quality loss at their actual display sizes. Logo was also downscaled from 1536x1024 (needed at ~100px tall) to 449x299.
- Deleted unused leftover image assets (old jpg drafts, a stray `Login.png`, Vite's default `react.svg`/`vite.svg`) that weren't imported anywhere — didn't affect the build, but decluttered the repo.
- Route-level code splitting via `React.lazy` + `Suspense` (fallback: `AppSkeleton`) — each page is now its own small chunk instead of one ~690KB bundle loaded upfront regardless of which page you land on.

## What needs to be done / known gaps

- **Meals & Progress have no real scope yet** — they're a shared "Coming Soon" placeholder page, no actual data model or features designed.
- **Macro tracking** is explicitly deferred (the Dashboard tile says so) — no design work started.
- **Recent Activity is view-only** — no way to edit or delete a past workout from the Dashboard.
- **Exercise picker is name-search only** — the wger data includes category/equipment/muscle group, but there's no filter/browse UI for it yet, just typeahead.
- **Not mobile-responsive yet** — works fine on desktop viewports, needs a real pass for phone screens.
- **No tests** — no unit/integration coverage anywhere (the new Firestore rules test is a one-off script, not a checked-in suite).
- **Firebase API key isn't restricted in Google Cloud Console** — not a secret, so this is a "reduce blast radius" item rather than a real vulnerability. Restricting it to your domain + specific APIs (Cloud Console → APIs & Services → Credentials) means nobody could reuse a copied key against unrelated Google APIs on your billing account. This is a console action on your account, not something doable via CLI/code.
- Workout set fields (`weight`, `reps`, `rir` in `Workout.jsx`) are saved as strings, not numbers — `updateSet` never casts the input value. Not a security issue (rules now correctly require `is string` to match reality), but worth knowing if you ever want to do numeric aggregation/sorting on set data.
- The big remaining vendor JS chunk (~594KB, ~185KB gzip — React, react-router, Firebase, FontAwesome) still loads on every page since auth needs Firebase immediately; further splitting that would have diminishing returns for this app's size.

## What I'd move forward with next

1. **Decide Meals/Progress scope** — what they'll actually track and how, now that the placeholder page exists.
2. **Mobile responsiveness pass** now that there's a live URL to test on your phone.
3. Once the above feels solid: revisit the **Expo/React Native** path we talked about for a real mobile app — the Firebase backend already works as-is for that, no backend changes needed, just a new UI layer that can reuse the existing service files (`authService.js`, `exerciseApi.js`).
