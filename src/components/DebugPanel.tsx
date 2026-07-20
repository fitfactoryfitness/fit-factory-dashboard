import { DashboardPayload } from "@/types/dashboard";

export function DebugPanel({ payload, error }: { payload: DashboardPayload; error: string | null }) {
  return (
    <div className="fixed bottom-4 right-4 max-w-md max-h-[70vh] overflow-auto rounded-xl border border-bg-border bg-black/90 p-4 text-xs text-slate-300 z-50 shadow-2xl">
      <div className="font-bold text-white mb-2">DIAGNOSTICS (?debug=1)</div>
      <div>Data source: <span className="text-emerald-400">{payload.dataSource}</span></div>
      <div>Spreadsheet ID: {payload.spreadsheetId}</div>
      <div>Tab: {payload.summary.tabName} {payload.summary.usedFallbackTab && <span className="text-amber-400">(fallback)</span>}</div>
      <div>Timezone: {payload.timezone}</div>
      <div>Generated at: {payload.generatedAt}</div>
      {error && <div className="text-red-400 mt-1">Refresh error: {error}</div>}
      {payload.warnings.length > 0 && (
        <div className="mt-2">
          <div className="font-semibold text-amber-400">Warnings</div>
          <ul className="list-disc list-inside">
            {payload.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-2">
        <div className="font-semibold text-white">Resolved metrics</div>
        <ul className="list-disc list-inside">
          {payload.diagnostics.map((d, i) => (
            <li key={i}>
              <span className="text-slate-400">{d.metric}</span>: {d.resolvedVia}
              {d.sourceCell ? ` @ ${d.sourceCell}` : ""}
              {d.warning ? <span className="text-amber-400"> — {d.warning}</span> : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
