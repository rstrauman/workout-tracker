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
- Navbar wired to real routes with active-state highlighting; Meals/Progress tabs are present but inert (no pages exist yet).

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

**Routing fixes**
- `App.jsx`'s root route now checks `isProfileComplete` from Firestore and sends users to `/onboarding` or `/dashboard` accordingly (previously always sent verified users to `/workout`, and never checked onboarding status).
- `Verification.jsx`'s "I've Verified" button now checks `isProfileComplete` itself and navigates directly to `/onboarding` or `/dashboard` — it can't rely on `App.jsx`'s state because `auth.currentUser.reload()` doesn't trigger `onAuthStateChanged`, so the root route's cached user object would still look unverified right after clicking.

**Deployment**
- Added `hosting` config to `firebase.json` (`public: dist`, SPA rewrite to `index.html`) and deployed via `firebase deploy --only hosting`.
- Live at https://workout-tracker-7dd87.web.app. It's an unlisted default `*.web.app` subdomain — fine for testing on your phone, but the site isn't polished for sharing yet (dead nav tabs, unoptimized images).
- To redeploy after future changes: `npm run build` then `npx firebase deploy --only hosting`.

## What needs to be done / known gaps

- **Meals & Progress** are nav placeholders only — no pages, no data model.
- **Macro tracking** is explicitly deferred (the Dashboard tile says so) — no design work started.
- **Recent Activity is view-only** — no way to edit or delete a past workout from the Dashboard.
- **Exercise picker is name-search only** — the wger data includes category/equipment/muscle group, but there's no filter/browse UI for it yet, just typeahead.
- **Unoptimized image assets** — `Gym_Background.png` (~1.8MB), `Light-Gym.png` (~2MB), and the logo (~2.2MB) are the bulk of the build size.
- **No code splitting** — single ~686KB JS chunk (~212KB gzip), Vite warns about it on every build.
- **No tests** — no unit/integration coverage anywhere.
- **Firestore rules don't validate write shape** — a user can write arbitrary fields/types to their own documents (low priority — it only affects their own data integrity, not other users).

## What I'd move forward with next

1. **Decide Meals/Progress scope** (or hide those nav tabs until they're real) rather than leaving dead placeholder taps in the nav indefinitely — matters more now that there's a live URL you might share.
2. **Image optimization + code splitting** — cheap performance wins whenever you have a slow afternoon, not urgent.
3. Once the above feels solid: revisit the **Expo/React Native** path we talked about for a real mobile app — the Firebase backend already works as-is for that, no backend changes needed, just a new UI layer that can reuse the existing service files (`authService.js`, `exerciseApi.js`).
