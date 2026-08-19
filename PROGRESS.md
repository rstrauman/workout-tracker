# Progress Notes

Working doc for picking this project back up. See `README.md` for the portfolio-style overview; this is the "where did we leave off" version.

## Where we're at

Auth, the Dashboard home screen, and workout logging are all functional end-to-end against real Firestore data. The app isn't deployed anywhere yet — it only runs via `npm run dev`. No automated tests exist. Tech stack: React 19 + Vite 8, Firebase 12 (Auth + Firestore), react-router-dom 7.18.2, FontAwesome icons, wger.de's free public exercise API.

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

## What needs to be done / known gaps

- **Root redirect is stale**: `App.jsx` sends verified users to `/workout` on login, not `/dashboard` — probably a leftover from before Dashboard existed as the real home screen. Quick fix.
- **Onboarding isn't actually enforced**: signup sets `isProfileComplete: false`, but nothing in the routing ever checks it or routes new users through `/onboarding`. `Verification.jsx` sends freshly-verified users to `/profile` (view mode, `isOnboarding={false}`) rather than `/onboarding` (edit mode) — new users likely land on a mostly-empty read-only profile page.
- **Meals & Progress** are nav placeholders only — no pages, no data model.
- **Macro tracking** is explicitly deferred (the Dashboard tile says so) — no design work started.
- **Recent Activity is view-only** — no way to edit or delete a past workout from the Dashboard.
- **Exercise picker is name-search only** — the wger data includes category/equipment/muscle group, but there's no filter/browse UI for it yet, just typeahead.
- **Unoptimized image assets** — `Gym_Background.png` (~1.8MB), `Light-Gym.png` (~2MB), and the logo (~2.2MB) are the bulk of the build size.
- **No code splitting** — single ~686KB JS chunk (~212KB gzip), Vite warns about it on every build.
- **No tests** — no unit/integration coverage anywhere.
- **Not deployed** — no Firebase Hosting config, no live URL to test on a phone yet.
- **Firestore rules don't validate write shape** — a user can write arbitrary fields/types to their own documents (low priority — it only affects their own data integrity, not other users).

## What I'd move forward with next

1. **Fix the two routing gaps above** (stale `/workout` redirect, unenforced onboarding) — small, closes a real UX hole, good first task next session.
2. **Deploy to Firebase Hosting.** Right now this only exists as `npm run dev` on your machine — a real URL means you can actually test it on your phone, which matters a lot once mobile is on the table.
3. **Decide Meals/Progress scope** (or hide those nav tabs until they're real) rather than leaving dead placeholder taps in the nav indefinitely.
4. **Image optimization + code splitting** — cheap performance wins whenever you have a slow afternoon, not urgent.
5. Once the above feels solid: revisit the **Expo/React Native** path we talked about for a real mobile app — the Firebase backend already works as-is for that, no backend changes needed, just a new UI layer that can reuse the existing service files (`authService.js`, `exerciseApi.js`).
