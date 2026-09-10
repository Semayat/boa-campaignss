# BoA Campaigns (v5) — Campaign Management System

Bank of Abyssinia · a general-purpose campaign platform: **any Branch, District,
or Head Office can start its own campaign** — with its own name, custom KPIs,
duration, and (optional) reward — instead of the system being built around one
fixed national campaign.

This is a full architectural rewrite from the earlier "Dare to Serve" system
(v4). The org chart (districts, branches) is unchanged, but campaigns, targets,
and entries all use a new data model. **Do not point this at your v4
database** — see "Upgrading from v4" below.

## What's new in v5 — a genuine multi-campaign platform

### Campaigns can start anywhere
- **Head Office, a District, or a Branch** can each start a campaign.
  Whoever starts it sets the name, KPIs (fully custom — any name + unit +
  weight, weights must total 100%), start/end dates, optional reward, and the
  overall target for each KPI.
- The hierarchy that takes part depends on who starts it:
  - **Branch-started** → just that branch and its staff.
  - **District-started** → that district, its branches, and their staff.
  - **HO-started** → everyone: all districts, all branches, all staff.
- **Multiple campaigns run at once.** A branch might be entering data for a
  national HO campaign and its own local campaign in the same week — each
  dashboard now starts with a campaign list, and you drill into one at a time.

### Targets always cascade from the immediate level above
Whoever holds a target distributes it to the level below:
HO → District → Branch → Staff, or District → Branch → Staff, or straight to
Branch → Staff, depending on who started the campaign. Each "Set Targets"
screen shows a running sum against the parent target per KPI and tells you
clearly whether it matches — it won't block you from saving a work-in-progress,
but it won't let a mismatch pass silently either. If a branch/district hasn't
explicitly set a breakdown yet, staff/branches default to an even split so
work isn't blocked while a manager gets around to it.

### Every role can change its own password; the level above can reset it
Previously only Staff had individual logins. Now **HO, District, Branch,
Staff, and District Officer** each have their own password and a "Change
Password" button (key icon, top right of every page). The hierarchy resets
the level below: HO resets a District's password, a District resets a
Branch's or a District Officer's, a Branch resets a Staff member's — each
generates a new temporary password shown once, and the affected account must
change it on next sign-in.

### District Officers — a new audit role
A District can create **District Officer** accounts (District Officers tab)
and assign each one to specific branches. An officer signs in with
District + Name/ID + password (5th tile on the sign-in page) and sees only
their assigned branches, with pace color-coded and **branches below 35% pace
automatically flagged "Needs justification."** Officers post feedback
(general or aimed at one staff member); the branch or that staff member can
reply, building a threaded conversation. Districts see every thread from
their officers on the Feedback tab.

### Notifications
A bell icon (top right, every page) shows unread notifications: a new
campaign started, your target was set, a submission was rejected, feedback
was posted or replied to, or your password was reset. Click to mark read.

### Color-coded KPI percentages everywhere
Every dashboard now shows each KPI's pace-to-date as a colored chip:
**green above 100%, yellow 50–100%, red below 50%** — HO, District, Branch,
and Staff dashboards all use the same coding.

### Carried over from v4
- Staff accounts with manager approval (pending → approved/rejected →
  resubmit); nothing counts anywhere until approved.
- Two percentages: **Achieved** (vs. full target) and **Pace** (vs. plan to
  date) — league tables rank by Pace.
- Structured field visits, weekly/monthly/daily reports with Excel & PDF
  export.

## Testing

The full backend (campaign creation and scoping at all three initiator
levels, target cascading and validation at every level, the staff
submit/approve/reject/resubmit cycle, password self-service and the full
hierarchical reset chain, district officer creation/assignment/audit,
feedback threading and reply permissions, and notifications) was verified
with 66 automated checks against a real Postgres-compatible engine
(pg-mem) — all passing. Key screens (5-role sign-in, campaign creation with
dynamic KPI rows, the HO→District target-cascade screen with live
validation, and the district officer audit dashboard with the 35%
justification flag) were visually rendered and confirmed correct.

## Deploy on Render — Blueprint (recommended, one click)

1. Push this repo to GitHub, with `render.yaml` at the **top level** (next to
   `server.js` and `package.json` — not nested in a subfolder; if it ends up
   nested after upload, add `rootDir: <folder-name>` under the service in
   `render.yaml`).
2. Render dashboard → **New + → Blueprint** → connect the repo.
3. Render asks you to fill in `HO_PASSWORD`, `DISTRICT_PASSWORD`, and
   `BRANCH_PASSWORD` before deploying — **set real passwords here** rather
   than leaving them blank, so they're never sitting in your repo. Leave
   blank to use the defaults below for now; you can change them later from
   inside the app anyway (every role can change its own password once
   signed in).
4. Click **Deploy Blueprint**. Render creates the database and web service
   together, already wired — no manual `DATABASE_URL` copying.
5. First boot seeds the org chart (12 districts, 103 sample branches) and one
   sample HO campaign ("4th Dare to Serve Campaign") so the system isn't
   empty on first look.

### Default passwords (if you left the Blueprint prompts blank)
- **Head Office:** `BoA-HO-2026`
- **District:** `BoA-District-<district-id>` — e.g. `BoA-District-east_addis`
  (district IDs are shown on the district picker on the sign-in page)
- **Branch:** `BoA-Branch-2026` (shared starting password for every branch —
  each branch should change it after first sign-in; a District can reset an
  individual branch's password at any time from then on)
- **Staff** and **District Officer** accounts are always created individually
  by their manager, with a generated temporary password shown once.

## Upgrading from v4

This is a genuinely different data model (campaigns are now separate,
plural, and cascading, rather than one fixed set of KPIs). **Existing v4
staff accounts and entries will not carry over.** Recommended path: deploy
this as a **new** Render Blueprint (new service name, new database) rather
than pointing it at your existing v4 database. Once you've moved traffic
over, you can retire the old v4 service.

## Project structure
```
server.js           Express app — all routes, campaign engine, target cascading,
                     password/reset logic, district officers, feedback, notifications
lib/campaign.js      Auth/crypto helpers + bank org chart (districts, sample branches)
lib/store.js         Postgres key-value data layer
public/index.html    Sign-in (5 roles: HO, District, Branch, Staff, District Officer)
public/ho.html       HO: campaign list/creation, national dashboard, district targets, reports
public/district.html District: campaigns, branch dashboard, branch targets, officers, feedback
public/branch.html   Branch: campaigns, approvals, staff ranking, staff targets, staff mgmt, feedback
public/staff.html    Staff: campaign picker, daily entry, submissions, feedback
public/officer.html  District Officer: assigned branches, audit feedback, my threads
public/app.js        Shared client helpers (API calls, notifications, KPI color-coding, campaign cards)
public/app.css       Shared styling
render.yaml          Render Blueprint (web service + Postgres, wired together)
railway.json         Railway deploy config (alternative to Render)
```
