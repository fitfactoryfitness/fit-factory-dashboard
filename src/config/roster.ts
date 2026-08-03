// Manually maintained roster for the Vacations card. The vacation tracker
// app (fit-factory-vacation-tracker.vercel.app) only exposes a public JSON
// endpoint for the raw time-off entries themselves (id, employeeId,
// startDate, endDate) — there is no public API for names/teams, that data
// is rendered server-side on the tracker's own pages. This list was copied
// from that app's /team page on 2026-08-03 (13 people: 2 Leads, 3 Front
// Desk, 8 Coaches). employeeId here is inferred as the lowercased first
// name — confirmed for "lucas" and "stephanie" against real entries in
// /api/time-off; the rest are unverified since nobody else has logged time
// off yet. If a new hire or a name collision ever breaks this pattern,
// update this table — an id that doesn't match anything here still renders
// (falls back to the raw id, title-cased) rather than disappearing.
export type RosterEntry = { name: string; team: "Leads" | "Front Desk" | "Coaches" | "Unknown" };

export const ROSTER: Record<string, RosterEntry> = {
  lucas: { name: "Lucas", team: "Leads" },
  stephanie: { name: "Stephanie", team: "Leads" },
  harley: { name: "Harley", team: "Front Desk" },
  kateryna: { name: "Kateryna", team: "Front Desk" },
  alexa: { name: "Alexa", team: "Front Desk" },
  stefan: { name: "Stefan", team: "Coaches" },
  mikey: { name: "Mikey", team: "Coaches" },
  amanda: { name: "Amanda", team: "Coaches" },
  charlotte: { name: "Charlotte", team: "Coaches" },
  adrian: { name: "Adrian", team: "Coaches" },
  patrick: { name: "Patrick", team: "Coaches" },
  kat: { name: "Kat", team: "Coaches" },
  jenny: { name: "Jenny", team: "Coaches" },
};

export function resolveEmployee(employeeId: string): RosterEntry {
  return ROSTER[employeeId] ?? { name: employeeId.charAt(0).toUpperCase() + employeeId.slice(1), team: "Unknown" };
}
