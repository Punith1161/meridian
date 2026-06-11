import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { RefreshCw, Filter, Clock, CheckSquare, Play, Square, Trash2, Edit2, ArrowRight, Download } from "lucide-react";

interface ActivityEntry {
  id: number;
  task_id: number;
  task_title: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  metadata: string | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  created:        { label: "Created",        icon: <CheckSquare size={12} />, color: "text-emerald-500",         bg: "bg-emerald-500/10" },
  status_changed: { label: "Status changed", icon: <ArrowRight size={12} />,  color: "text-primary",             bg: "bg-primary/10" },
  timer_started:  { label: "Timer started",  icon: <Play size={12} />,         color: "text-amber-500",           bg: "bg-amber-500/10" },
  timer_stopped:  { label: "Timer stopped",  icon: <Square size={12} />,       color: "text-blue-500",            bg: "bg-blue-500/10" },
  updated:        { label: "Updated",        icon: <Edit2 size={12} />,        color: "text-muted-foreground",    bg: "bg-muted/60" },
  deleted:        { label: "Deleted",        icon: <Trash2 size={12} />,       color: "text-destructive",         bg: "bg-destructive/10" },
};

const STATUS_LABELS: Record<string, string> = { todo: "To do", inprogress: "In progress", done: "Done" };

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    full: d.toISOString(),
    relative: relativeTime(d),
  };
}

function parseMetadata(meta: string | null): Record<string, unknown> | null {
  if (!meta) return null;
  try { return JSON.parse(meta); } catch { return null; }
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const [showFull, setShowFull] = useState(false);
  const cfg = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.updated;
  const ts = formatTimestamp(entry.created_at);
  const meta = parseMetadata(entry.metadata);

  return (
    <div className="group flex items-start gap-4 px-6 py-3.5 border-b border-border/40 hover:bg-muted/20 transition-colors">
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
        <div className={`w-6 h-6 rounded-full ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
          {cfg.icon}
        </div>
        <div className="w-px flex-1 bg-border/40 min-h-[8px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
              <span className="text-[11px] text-muted-foreground/60">·</span>
              <span className="text-sm font-medium text-foreground truncate max-w-xs">{entry.task_title}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {entry.action === "status_changed" && entry.from_value && entry.to_value && (
                <span className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-muted text-[11px]">{STATUS_LABELS[entry.from_value] ?? entry.from_value}</span>
                  <ArrowRight size={10} />
                  <span className="px-1.5 py-0.5 rounded bg-muted text-[11px]">{STATUS_LABELS[entry.to_value] ?? entry.to_value}</span>
                  {entry.metadata && <span className="text-muted-foreground/60 text-[11px]">{entry.metadata}</span>}
                </span>
              )}
              {entry.action === "timer_stopped" && meta && typeof meta.elapsed_seconds === "number" && (
                <span className="flex items-center gap-1 font-mono">
                  <Clock size={10} />
                  +{formatSeconds(meta.elapsed_seconds as number)} · total {formatSeconds(meta.total_spent as number)}
                </span>
              )}
              {entry.action === "created" && meta && (
                <span>priority: {String(meta.priority)}{meta.time_estimate ? ` · estimate: ${meta.time_estimate}m` : ""}</span>
              )}
              {entry.action === "updated" && entry.metadata && (
                <span className="text-muted-foreground/80">{entry.metadata}</span>
              )}
              {entry.action === "deleted" && entry.from_value && (
                <span>was in <span className="font-medium">{STATUS_LABELS[entry.from_value] ?? entry.from_value}</span></span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <button
              onClick={() => setShowFull(!showFull)}
              className="text-[11px] text-muted-foreground/60 hover:text-foreground font-mono transition-colors"
              title={ts.full}
            >
              {ts.relative}
            </button>
            {showFull && (
              <div className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                <div>{ts.date}</div>
                <div>{ts.time}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type ActionFilter = "all" | "status_changed" | "timer_stopped" | "created" | "deleted" | "updated";

export default function Activity() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ActionFilter>("all");

  const { data: entries = [], isLoading } = useQuery<ActivityEntry[]>({
    queryKey: ["activity"],
    queryFn: () => api.get("/activity"),
  });

  useKeyboardShortcuts([
    { key: "r", handler: () => qc.invalidateQueries({ queryKey: ["activity"] }), description: "Refresh activity" },
  ]);

  const filtered = entries.filter((e) => filter === "all" || e.action === filter);

  const exportCSV = () => {
    const rows = [
      ["ID", "Task", "Action", "From", "To", "Metadata", "Timestamp"],
      ...entries.map((e) => [e.id, e.task_title, e.action, e.from_value ?? "", e.to_value ?? "", e.metadata ?? "", e.created_at]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `meridian-activity-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const FILTERS: { key: ActionFilter; label: string }[] = [
    { key: "all",           label: "All" },
    { key: "status_changed",label: "Status" },
    { key: "timer_stopped", label: "Timers" },
    { key: "created",       label: "Created" },
    { key: "deleted",       label: "Deleted" },
    { key: "updated",       label: "Edits" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Activity Log</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {entries.length} events · full audit trail with timestamps
          </p>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">R to refresh</kbd>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["activity"] })}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border"
            title="Export CSV"
          >
            <Download size={12} />
            Export
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-6 py-2.5 border-b border-border/40 bg-muted/10">
        <Filter size={12} className="text-muted-foreground mr-1" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1.5 text-[10px] opacity-60">
                {entries.filter((e) => e.action === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
              <Clock size={20} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground">Actions on tasks will appear here with full timestamps</p>
          </div>
        ) : (
          <div className="pb-8">
            {filtered.map((entry) => <ActivityRow key={entry.id} entry={entry} />)}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="px-6 py-2 border-t border-border/40 bg-muted/10 flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span>Showing {filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
          <span className="font-mono">All times in local timezone</span>
        </div>
      )}
    </div>
  );
}
