// Standalone connectivity check for the Google Sheets service account,
// independent of the Next.js app. Run with: node verify-sheets.mjs
//
// Useful because it isolates "does the credential actually work" from
// "does the Next.js dev server start" — run this first if the dashboard
// isn't showing live data.
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env.local");
const envText = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) {
    let val = m[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[m[1]] = val;
  }
}

const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: email, private_key: privateKey },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

try {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs = (meta.data.sheets || []).map((s) => s.properties.title);
  console.log("CONNECTED OK. Tabs found:", tabs.join(", "));

  const jul = await sheets.spreadsheets.values.get({ spreadsheetId, range: "JUL", valueRenderOption: "FORMATTED_VALUE" });
  const grid = jul.data.values || [];
  console.log("JUL grid rows:", grid.length);
  console.log("Row 19 (day 5, first 10 cells):", JSON.stringify(grid[18]?.slice(0, 10)));
} catch (err) {
  console.error("CONNECTION FAILED:", err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data));
  console.error(
    "\nIf this says 'The caller does not have permission', the sheet hasn't been shared with the service account email yet (share it as Viewer)."
  );
}
