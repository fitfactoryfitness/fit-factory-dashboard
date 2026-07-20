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
  // Normalize the private key defensively — it reaches this code through
  // several different paste/storage paths (.env file, Vercel's env var UI,
  // copy/paste through a terminal or chat), any of which can mangle line
  // endings in ways that produce a cryptic OpenSSL "DECODER routines::
  // unsupported" error instead of a clear one:
  //   - .env files store it with LITERAL two-character "\n" sequences,
  //     which need converting to real newlines.
  //   - Some paste paths introduce real "\r\n" (Windows-style) endings,
  //     which OpenSSL's PEM decoder rejects even though the key content
  //     itself is valid — this was the actual cause of a prior deploy
  //     failure, confirmed via Vercel's runtime logs.
  //   - Surrounding quote characters can get included if copied with the
  //     quotes that wrap the value in a .env file.
  let privateKey = rawKey.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey
    .replace(/\\r\\n/g, "\n") // literal "\r\n" as text
    .replace(/\\n/g, "\n") // literal "\n" as text
    .replace(/\r\n/g, "\n") // real Windows line endings
    .replace(/\r/g, "\n"); // lone real carriage returns

  // Fail with a clear, actionable message rather than letting an opaque
  // OpenSSL decoder error reach the API route as an unhandled 500.
  try {
    const { createPrivateKey } = await import("crypto");
    createPrivateKey(privateKey);
  } catch (err) {
    throw new Error(
      `GOOGLE_PRIVATE_KEY does not parse as a valid PEM private key after normalization (${
        err instanceof Error ? err.message : String(err)
      }). Re-copy it from the service account JSON key file directly into the env var, without extra quoting.`
    );
  }

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
