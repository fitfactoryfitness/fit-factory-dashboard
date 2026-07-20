import { google } from "googleapis";

// Server-side only. Never import this module from a client component.
// Credentials are read from environment variables and never sent to the browser.

export type SheetGrid = string[][];

let sheetsClientPromise: ReturnType<typeof buildClient> | null = null;

async function buildClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY. Set DASHBOARD_DATA_SOURCE=mock to run without Google credentials."
    );
  }
  // .env files store the private key with literal \n sequences; convert them
  // back to real newlines, since PEM keys require actual line breaks.
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

async function getClient() {
  if (!sheetsClientPromise) sheetsClientPromise = buildClient();
  return sheetsClientPromise;
}

export async function listTabNames(spreadsheetId: string): Promise<string[]> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return (res.data.sheets || [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));
}

// Reads a whole sheet's used range as a 2D array of display strings so
// downstream parsing logic works uniformly whether cells are numbers,
// currency-formatted numbers, or formula results.
export async function readSheetGrid(spreadsheetId: string, tabName: string): Promise<SheetGrid> {
  const sheets = await getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  return (res.data.values as SheetGrid) || [];
}
