import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek,
         addWeeks, subWeeks, isToday, parseISO, getDay, startOfMonth,
         endOfMonth, eachWeekOfInterval } from "date-fns";
import {
  Plus, Flame, Trophy, TrendingUp, Settings2, Archive,
  ArchiveRestore, Trash2, X, Check, ChevronLeft, ChevronRight,
  BarChart3, CalendarDays, Grid3X3, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Habit = {
  id: number; name: string; description?: string | null;
  color: string; icon: string; frequency: string;
  frequency_days?: number[] | null; target_count: number;
  position: number; archived: boolean;
  created_at: string; updated_at: string;
};
type HabitEntry = { id: number; habit_id: number; date: string; count: number; created_at: string };
type HabitStats = {
  habit_id: number; current_streak: number; longest_streak: number;
  completion_rate_30d: number; total_completions: number;
  entries_last_365: Record<string, number>;
};
type HabitWithStats = { habit: Habit; stats: HabitStats; today_entry: HabitEntry | null };

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#7c3aed","#2563eb","#0d9488","#16a34a",
  "#ca8a04","#ea580c","#dc2626","#db2777","#4b5563",
];

const PRESET_ICONS = [
  "⭐","💪","🏃","🧘","📚","💧","🥗","😴","🎯",
  "✍️","🎵","🧹","💊","🌿","🧠","❤️","🚴","🏋️",
];

const FREQ_OPTIONS = [
  { value: "daily",    label: "Every day" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "weekends", label: "Weekends" },
  { value: "custom",   label: "Custom days" },
];

const WEEKDAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const QUERY_KEY = ["habits-with-stats"] as const;

// ─── API helper ───────────────────────────────────────────────────────────────

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const h = new Headers(options?.headers);
  const token = localStorage.getItem("meridian_token");
  if (token) h.set("Authorization", `Bearer ${token}`);
  if (options?.body && !h.has("Content-Type")) h.set("Content-Type", "application/json");
  const res = await fetch(url, { ...options, headers: h });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error((msg as any).detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Milestone badges ─────────────────────────────────────────────────────────

const MILESTONES = [7, 14, 21, 30, 60, 100, 200, 365];

function MilestoneBadge({ streak }: { streak: number }) {
  const earned = MILESTONES.filter(m => streak >= m);
  if (!earned.length) return null;
  const top = earned[earned.length - 1];
  return (
    <span title={`${top}-day milestone!`}
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25 ml-1">
      {top}d 🏆
    </span>
  );
}

// ─── Heatmap (GitHub-style yearly) ───────────────────────────────────────────

function YearHeatmap({ entries, color }: { entries: Record<string, number>; color: string }) {
  const today = new Date();
  const start = subDays(today, 364);

  // Build week columns
  const weeks: Date[][] = [];
  let cursor = startOfWeek(start, { weekStartsOn: 0 });
  while (cursor <= endOfWeek(today, { weekStartsOn: 0 })) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() + d);
      week.push(day);
    }
    weeks.push(week);
    cursor = addWeeks(cursor, 1);
  }

  const maxCount = Math.max(1, ...Object.values(entries));

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              const ds = format(day, "yyyy-MM-dd");
              const count = entries[ds] ?? 0;
              const intensity = count > 0 ? Math.max(0.2, count / maxCount) : 0;
              const isPast = day <= today;
              const isFuture = day > today;
              return (
                <div
                  key={di}
                  title={`${format(day, "MMM d, yyyy")}${count > 0 ? ` · ${count}×` : ""}`}
                  className="w-3 h-3 rounded-sm transition-all"
                  style={{
                    background: isFuture
                      ? "transparent"
                      : count > 0
                      ? `${color}${Math.round(intensity * 255).toString(16).padStart(2,"0")}`
                      : "hsl(var(--muted))",
                    border: isToday(day) ? `1px solid ${color}` : "none",
                    opacity: isFuture ? 0 : 1,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground px-0.5">
        <span>{format(start, "MMM yyyy")}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// ─── Weekly grid row (main check-in view) ─────────────────────────────────────

function WeekRow({
  hw, weekDays, onToggle, toggling,
}: {
  hw: HabitWithStats;
  weekDays: Date[];
  onToggle: (habitId: number, date: string) => void;
  toggling: Set<string>;
}) {
  const { habit, stats, today_entry } = hw;
  const entries = stats.entries_last_365;
  const pct = Math.round(stats.completion_rate_30d * 100);

  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-border/50 last:border-0 group hover:bg-muted/20 transition-colors">
      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-30 transition-opacity cursor-grab text-foreground flex-shrink-0">
        <GripVertical size={14} />
      </div>

      {/* Icon + name */}
      <div className="flex items-center gap-2.5 w-44 flex-shrink-0 min-w-0">
        <span className="text-xl flex-shrink-0 w-7 text-center leading-none">{habit.icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">{habit.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {stats.current_streak > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-500">
                <Flame size={9} />{stats.current_streak}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">{pct}%</span>
            <MilestoneBadge streak={stats.current_streak} />
          </div>
        </div>
      </div>

      {/* Day cells */}
      <div className="flex gap-2 flex-1 justify-center">
        {weekDays.map(day => {
          const ds = format(day, "yyyy-MM-dd");
          const done = (entries[ds] ?? 0) >= habit.target_count;
          const isTodayDay = isToday(day);
          const isFuture = day > new Date();
          const key = `${habit.id}-${ds}`;
          const isToggling = toggling.has(key);

          return (
            <button
              key={ds}
              onClick={() => !isFuture && onToggle(habit.id, ds)}
              disabled={isFuture || isToggling}
              title={`${habit.name} · ${format(day, "MMM d")}`}
              className={`
                w-9 h-9 rounded-xl flex items-center justify-center transition-all select-none
                ${isFuture ? "opacity-20 cursor-default" : "cursor-pointer"}
                ${done
                  ? "shadow-sm scale-105"
                  : isTodayDay
                  ? "ring-2 ring-offset-1 ring-offset-background hover:bg-muted"
                  : "hover:bg-muted/60"
                }
                ${isToggling ? "opacity-50" : ""}
              `}
              style={done ? { background: `${habit.color}22`, border: `1.5px solid ${habit.color}66` } : {}}
            >
              {done ? (
                <Check size={14} style={{ color: habit.color }} strokeWidth={2.5} />
              ) : (
                <span className={`w-2 h-2 rounded-full ${
                  isTodayDay ? "bg-muted-foreground/40" : "bg-muted-foreground/20"
                }`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 30d bar */}
      <div className="w-16 flex-shrink-0 hidden lg:block">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: habit.color }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{pct}%</p>
      </div>
    </div>
  );
}

// ─── Stats panel for a single habit ──────────────────────────────────────────

function HabitStatsPanel({ hw, onClose }: { hw: HabitWithStats; onClose: () => void }) {
  const { habit, stats } = hw;

  // Monthly completion bars (last 6 months)
  const months = useMemo(() => {
    const result: { label: string; pct: number }[] = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - m);
      const start = startOfMonth(d);
      const end   = endOfMonth(d);
      const days  = eachDayOfInterval({ start, end });
      const done  = days.filter(day =>
        (stats.entries_last_365[format(day, "yyyy-MM-dd")] ?? 0) >= habit.target_count
      ).length;
      result.push({
        label: format(d, "MMM"),
        pct: Math.round((done / days.length) * 100),
      });
    }
    return result;
  }, [habit, stats]);

  const maxPct = Math.max(1, ...months.map(m => m.pct));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border"
          style={{ background: `${habit.color}12` }}>
          <span className="text-3xl">{habit.icon}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground">{habit.name}</h2>
            {habit.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{habit.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: <Flame size={14} className="text-orange-500" />, val: stats.current_streak, label: "Streak" },
              { icon: <Trophy size={14} className="text-amber-500" />, val: stats.longest_streak, label: "Best" },
              { icon: <TrendingUp size={14} className="text-emerald-500" />, val: `${Math.round(stats.completion_rate_30d * 100)}%`, label: "30d rate" },
              { icon: <Check size={14} className="text-primary" />, val: stats.total_completions, label: "Total" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-muted/40 rounded-xl p-3 text-center border border-border/50">
                <div className="flex justify-center mb-1">{kpi.icon}</div>
                <p className="text-lg font-bold font-mono text-foreground leading-none">{kpi.val}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Monthly bars */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Monthly completion
            </p>
            <div className="flex items-end gap-2 h-20">
              {months.map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: "60px" }}>
                    <div
                      className="w-full rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${Math.max(4, (m.pct / maxPct) * 60)}px`,
                        background: m.pct > 0 ? habit.color : "hsl(var(--muted))",
                        opacity: m.pct > 0 ? 0.8 : 1,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Yearly heatmap */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Last 365 days
            </p>
            <YearHeatmap entries={stats.entries_last_365} color={habit.color} />
          </div>

          {/* Milestone badges */}
          {stats.current_streak > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Milestones</p>
              <div className="flex flex-wrap gap-1.5">
                {MILESTONES.map(m => (
                  <span
                    key={m}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      stats.current_streak >= m
                        ? "bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30"
                        : "bg-muted/40 text-muted-foreground/50 border border-border/30"
                    }`}
                  >
                    {m}d {stats.current_streak >= m ? "🏆" : "🔒"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────

type HabitDraft = {
  name: string; description: string; color: string; icon: string;
  frequency: string; frequency_days: number[]; target_count: number;
};

const emptyDraft = (): HabitDraft => ({
  name: "", description: "", color: PRESET_COLORS[0], icon: PRESET_ICONS[0],
  frequency: "daily", frequency_days: [0,1,2,3,4], target_count: 1,
});

function HabitFormModal({
  initial, onSave, onClose, title,
}: {
  initial?: HabitDraft;
  onSave: (d: HabitDraft) => Promise<void>;
  onClose: () => void;
  title: string;
}) {
  const [draft, setDraft] = useState<HabitDraft>(initial ?? emptyDraft());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const toggleDay = (d: number) =>
    setDraft(prev => ({
      ...prev,
      frequency_days: prev.frequency_days.includes(d)
        ? prev.frequency_days.filter(x => x !== d)
        : [...prev.frequency_days, d],
    }));

  const handleSubmit = async () => {
    if (!draft.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try { await onSave(draft); onClose(); }
    catch (e) { toast({ title: (e as Error).message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{draft.icon}</span>{title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Name */}
          <Input
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Habit name"
            autoFocus
            className="h-9"
          />

          {/* Description */}
          <Textarea
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            placeholder="Description (optional)"
            className="resize-none min-h-[60px] text-sm"
          />

          {/* Icon picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setDraft(d => ({ ...d, icon: ic }))}
                  className={`w-9 h-9 text-lg rounded-lg flex items-center justify-center transition-all ${
                    draft.icon === ic
                      ? "ring-2 ring-primary scale-110 bg-primary/10"
                      : "hover:bg-muted hover:scale-105"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setDraft(d => ({ ...d, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${
                    draft.color === c ? "scale-125 ring-2 ring-offset-2 ring-offset-background" : "hover:scale-110"
                  }`}
                  style={{ background: c, outlineColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Frequency</label>
              <Select value={draft.frequency} onValueChange={v => setDraft(d => ({ ...d, frequency: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQ_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Target / day</label>
              <Input
                type="number" min={1} max={99}
                value={draft.target_count}
                onChange={e => setDraft(d => ({ ...d, target_count: Math.max(1, Number(e.target.value)) }))}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Custom days */}
          {draft.frequency === "custom" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Days</label>
              <div className="flex gap-1.5">
                {WEEKDAY_LABELS.map((label, idx) => (
                  <button
                    key={label}
                    onClick={() => toggleDay(idx)}
                    className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all ${
                      draft.frequency_days.includes(idx)
                        ? "text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    style={draft.frequency_days.includes(idx) ? { background: draft.color } : {}}
                  >
                    {label.slice(0,2)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : "Save habit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Habits() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: habitsData = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api<HabitWithStats[]>("/api/habits/with-stats"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ habitId, date }: { habitId: number; date: string }) =>
      api(`/api/habits/${habitId}/toggle`, { method: "POST", body: JSON.stringify({ date, count: 1 }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const createMutation = useMutation({
    mutationFn: (d: HabitDraft) => api<Habit>("/api/habits", { method: "POST", body: JSON.stringify({ ...d, frequency_days: d.frequency === "custom" ? d.frequency_days : null }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Habit created" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: HabitDraft }) =>
      api<Habit>(`/api/habits/${id}`, { method: "PUT", body: JSON.stringify({ ...d, frequency_days: d.frequency === "custom" ? d.frequency_days : null }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Habit updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/api/habits/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast({ title: "Habit deleted" }); },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      api(`/api/habits/${id}`, { method: "PUT", body: JSON.stringify({ archived }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"daily" | "stats">("daily");
  const [weekOffset, setWeekOffset] = useState(0);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStats | null>(null);
  const [statsHabit, setStatsHabit] = useState<HabitWithStats | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [menuHabitId, setMenuHabitId] = useState<number | null>(null);

  // ── Compute week days ─────────────────────────────────────────────────────────
  const refDay = useMemo(() => {
    const d = new Date();
    // weekOffset: 0 = this week, -1 = last week, etc.
    return weekOffset === 0 ? d : new Date(d.getTime() + weekOffset * 7 * 86400_000);
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(refDay, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [refDay]);

  const weekLabel = useMemo(() => {
    const s = weekDays[0];
    const e = weekDays[6];
    if (weekOffset === 0) return "This week";
    if (weekOffset === -1) return "Last week";
    return `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
  }, [weekDays, weekOffset]);

  // ── Toggle handler ────────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (habitId: number, date: string) => {
    const key = `${habitId}-${date}`;
    setToggling(prev => new Set(prev).add(key));
    try {
      await toggleMutation.mutateAsync({ habitId, date });
    } finally {
      setToggling(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  }, [toggleMutation]);

  // ── Visible habits ────────────────────────────────────────────────────────────
  const visible = (habitsData as HabitWithStats[]).filter(hw => hw.habit.archived === showArchived);

  // ── Today stats summary ───────────────────────────────────────────────────────
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTotal  = visible.filter(hw => !hw.habit.archived).length;
  const todayDone   = visible.filter(hw =>
    !hw.habit.archived &&
    (hw.stats.entries_last_365[todayStr] ?? 0) >= hw.habit.target_count
  ).length;
  const todayPct    = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const avgStreak   = visible.length
    ? Math.round(visible.reduce((s, hw) => s + hw.stats.current_streak, 0) / visible.length)
    : 0;
  const bestStreak  = visible.length
    ? Math.max(...visible.map(hw => hw.stats.current_streak))
    : 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* ── Top toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground">Habit Tracker</h1>
          <Tabs value={tab} onValueChange={v => setTab(v as any)}>
            <TabsList className="h-7">
              <TabsTrigger value="daily" className="text-xs h-6 px-3 gap-1.5">
                <Grid3X3 size={11} /> Daily
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs h-6 px-3 gap-1.5">
                <BarChart3 size={11} /> Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(a => !a)}
            className={`h-7 px-3 text-xs rounded-md border transition-colors font-medium ${
              showArchived ? "bg-muted text-foreground border-border" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {showArchived ? "Active" : "Archived"}
          </button>
          <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setCreating(true)}>
            <Plus size={13} /> New habit
          </Button>
        </div>
      </div>

      {/* ── Summary strip ────────────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 border-b border-border/40 bg-muted/20 flex-shrink-0">
        {[
          {
            label: "Today",
            value: `${todayDone}/${todayTotal}`,
            sub: `${todayPct}% complete`,
            icon: <Check size={13} className="text-emerald-500" />,
            accent: todayPct === 100 && todayTotal > 0,
          },
          {
            label: "Avg streak",
            value: `${avgStreak}d`,
            sub: "across all habits",
            icon: <Flame size={13} className="text-orange-500" />,
            accent: false,
          },
          {
            label: "Best streak",
            value: `${bestStreak}d`,
            sub: "current leader",
            icon: <Trophy size={13} className="text-amber-500" />,
            accent: false,
          },
          {
            label: "Active habits",
            value: String(todayTotal),
            sub: "being tracked",
            icon: <TrendingUp size={13} className="text-primary" />,
            accent: false,
          },
        ].map(stat => (
          <div key={stat.label} className={`flex-1 px-5 py-3 flex items-center gap-3 border-r border-border/40 last:border-0 ${stat.accent ? "bg-emerald-500/5" : ""}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.accent ? "bg-emerald-500/15" : "bg-muted"}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
              <p className="text-base font-bold font-mono text-foreground leading-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Daily check-in tab ────────────────────────────────────────────────── */}
      {tab === "daily" && (
        <div className="flex-1 overflow-y-auto">
          {/* Week navigator */}
          <div className="flex items-center justify-between px-6 py-2.5 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              <ChevronLeft size={15} className="text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">{weekLabel}</span>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-xs text-primary hover:underline"
                >
                  Back to today
                </button>
              )}
            </div>
            <button
              onClick={() => setWeekOffset(o => Math.min(0, o + 1))}
              disabled={weekOffset >= 0}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronRight size={15} className="text-muted-foreground" />
            </button>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border/20 bg-muted/10">
            <div className="w-5 flex-shrink-0" /> {/* drag handle space */}
            <div className="w-44 flex-shrink-0" /> {/* habit name space */}
            <div className="flex gap-2 flex-1 justify-center">
              {weekDays.map(day => (
                <div key={day.toISOString()} className={`w-9 text-center ${isToday(day) ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold">{format(day, "EEE")}</p>
                  <p className={`text-xs mt-0.5 w-6 h-6 mx-auto flex items-center justify-center rounded-full ${isToday(day) ? "bg-primary text-primary-foreground text-[11px] font-bold" : ""}`}>
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>
            <div className="w-16 flex-shrink-0 hidden lg:block text-[9px] uppercase tracking-wider text-muted-foreground text-right">30d</div>
          </div>

          {/* Habit rows */}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-3xl">
                {showArchived ? "📦" : "✨"}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {showArchived ? "No archived habits" : "No habits yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {showArchived ? "Archived habits appear here" : "Create your first habit to start tracking"}
              </p>
              {!showArchived && (
                <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreating(true)}>
                  <Plus size={13} /> New habit
                </Button>
              )}
            </div>
          ) : (
            <div>
              {visible.map(hw => (
                <div key={hw.habit.id} className="relative group/row">
                  <WeekRow
                    hw={hw}
                    weekDays={weekDays}
                    onToggle={handleToggle}
                    toggling={toggling}
                  />
                  {/* Row action menu */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => setStatsHabit(hw)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="View stats"
                    >
                      <BarChart3 size={13} />
                    </button>
                    <button
                      onClick={() => setEditingHabit(hw)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Edit habit"
                    >
                      <Settings2 size={13} />
                    </button>
                    <button
                      onClick={() => archiveMutation.mutate({ id: hw.habit.id, archived: !hw.habit.archived })}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title={hw.habit.archived ? "Restore" : "Archive"}
                    >
                      {hw.habit.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${hw.habit.name}"?`)) deleteMutation.mutate(hw.habit.id); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Analytics tab ────────────────────────────────────────────────────── */}
      {tab === "stats" && (
        <div className="flex-1 overflow-y-auto p-6">
          {visible.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No habits to show analytics for.</div>
          ) : (
            <div className="space-y-4">
              {visible.map(hw => (
                <div key={hw.habit.id}
                  className="bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setStatsHabit(hw)}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50"
                    style={{ background: `${hw.habit.color}0d` }}>
                    <span className="text-2xl">{hw.habit.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{hw.habit.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-orange-500 font-semibold">
                        <Flame size={11} /> {hw.stats.current_streak}d
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Trophy size={11} className="text-amber-500" /> {hw.stats.longest_streak}d best
                      </span>
                      <span className="font-medium text-foreground">
                        {Math.round(hw.stats.completion_rate_30d * 100)}% / 30d
                      </span>
                    </div>
                  </div>
                  {/* Compact heatmap */}
                  <div className="px-4 py-3">
                    <YearHeatmap entries={hw.stats.entries_last_365} color={hw.habit.color} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {creating && (
        <HabitFormModal
          title="New habit"
          onSave={async d => { await createMutation.mutateAsync(d); }}
          onClose={() => setCreating(false)}
        />
      )}

      {editingHabit && (
        <HabitFormModal
          title="Edit habit"
          initial={{
            name: editingHabit.habit.name,
            description: editingHabit.habit.description ?? "",
            color: editingHabit.habit.color,
            icon: editingHabit.habit.icon,
            frequency: editingHabit.habit.frequency,
            frequency_days: editingHabit.habit.frequency_days ?? [0,1,2,3,4],
            target_count: editingHabit.habit.target_count,
          }}
          onSave={async d => { await updateMutation.mutateAsync({ id: editingHabit.habit.id, d }); }}
          onClose={() => setEditingHabit(null)}
        />
      )}

      {statsHabit && (
        <HabitStatsPanel hw={statsHabit} onClose={() => setStatsHabit(null)} />
      )}
    </div>
  );
}
