# Handover — Fit Factory Downtown Performance Dashboard

**In plain terms:** a TV screen showing Fit Factory Downtown's daily numbers — are we
winning this month, are we on pace, what should the team focus on today. It pulls
automatically from a Google Sheet, nobody has to update it by hand.

**Owner until 2026-09-29:** Lucas Rietsch (lucas@fitfactoryfitness.com).

## Do you need to touch any code?

**No.** This is just a web page. Nobody using it day-to-day needs to see any code.

## How to actually use it

Open this link: **https://fit-factory-dashboard.vercel.app/**

No login needed — it's set up that way on purpose. Nothing to install. If it's showing on a
TV via AbleSign, that device just has this page open in a browser, left running.

## Setting up access (do this before 2026-09-29)

### 1. Vercel (this is what actually hosts the web page)
1. Go to **vercel.com** and sign in (or ask Lucas whether you already have access under an
   existing team).
2. Someone with access to the account currently hosting this needs to invite the new owner:
   click the **team/account name** (top left) → **Settings** → **Members** → **Invite Member**.
3. Enter the new owner's email, choose a role (Owner if they're taking over responsibility
   for this site), and send the invite.
4. The new owner checks their email and clicks **Accept** — that's it, no setup needed on
   their end beyond that.

*Note: this project's Vercel account/team wasn't identifiable from the files on Lucas's
laptop — log into vercel.com to confirm which account it's actually under before inviting anyone.*

### 2. The Google Sheet this reads from
The dashboard reads (never writes to) the `DAILY REPORT 2026 - Fit Factory` Google Sheet
through a dedicated Google service account — not anyone's personal Google login. Whoever
becomes the technical contact should confirm that service account still has "Viewer" access
to the sheet, and that its login key (a `GOOGLE_PRIVATE_KEY` value) is stored in Vercel's
Environment Variables, not just on Lucas's laptop.

### 3. GitHub (where the code itself lives)
Done — this repository now lives at https://github.com/fitfactoryfitness/fit-factory-dashboard,
no longer tied to Lucas's personal account. You just need to be added as a member of the
`fitfactoryfitness` GitHub organization if you'll ever edit code yourself.

## For whoever becomes the technical contact

[README.md](README.md) has the tech stack and local setup instructions.
[MAPPING_REPORT.md](MAPPING_REPORT.md) explains exactly how spreadsheet cells map to what's
shown on screen — read this before the underlying sheet's layout ever changes.
