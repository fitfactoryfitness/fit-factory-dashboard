// DEPRECATED / UNUSED: the top-right overall-status tag (e.g. "OFF TRACK")
// was removed from Header.tsx per product feedback. Kept in place rather
// than deleted (this environment can't delete files); safe to delete this
// file on a normal machine if nothing else starts importing it.
import { OverallStatus } from "@/types/dashboard";
import { OVERALL_STATUS_META } from "@/lib/format";

const COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  red: "bg-red-500/15 text-red-300 border-red-500/40",
};

export function StatusBadge({ status }: { status: OverallStatus }) {
  const meta = OVERALL_STATUS_META[status];
  const cls = COLOR_CLASSES[meta.color];
  return (
    <div className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-xl border ${cls} font-bold text-2xl tracking-wide`}>
      <span className="text-3xl leading-none">{meta.icon}</span>
      <span>{meta.label}</span>
    </div>
  );
}
