import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { formatHoursMinutes, formatTime } from "@/utils/formatTime";
import { relativeDate } from "@/utils/dateHelpers";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Pause, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface Task {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "inprogress" | "done";
  due_date: string | null;
  time_estimate: number | null;
  time_spent: number;
  timer_running: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

interface TodaySummary {
  tasks_today: Task[];
  tasks_done: number;
  tasks_total: number;
  total_time_tracked: number;
  running_task_id: number | null;
}

function ProgressRing({ percent, size = 80, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="hsl(var(--primary))"
        strokeWidth={stroke} fill="none"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function RunningTaskBanner({ task, onStop }: { task: Task; onStop: () => void }) {
  const [secs, setSecs] = useState(task.time_spent);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSecs(task.time_spent);
    ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [task.time_spent]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const display = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div className="mx-8 mb-0 mt-4 flex items-center gap-4 bg-emerald-500/8 border border-emerald-500/25 rounded-2xl px-5 py-3.5">
      <span className="relative flex h-3 w-3 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Now tracking</p>
        <p className="text-sm font-semibold text-foreground truncate leading-tight mt-0.5">{task.title}</p>
      </div>
      <span className="font-mono text-lg font-bold text-emerald-500 tabular-nums flex-shrink-0">{display}</span>
      <button
        onClick={onStop}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors text-xs font-semibold flex-shrink-0"
      >
        <Pause size={12} fill="currentColor" />
        Stop
      </button>
    </div>
  );
}

export default function Today() {
  const qc = useQueryClient();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const { data: summary, isLoading } = useQuery<TodaySummary>({
    queryKey: ["summary-today"],
    queryFn: () => api.get("/summary/today"),
    refetchInterval: 30000,
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks"),
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["summary-today"] });
    },
  });

  const stopTimer = useMutation({
    mutationFn: (id: number) => api.post(`/tasks/${id}/timer/stop`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["summary-today"] });
    },
  });

  const tasks = (summary?.tasks_today ?? []) as Task[];
  const pct = (summary?.tasks_total ?? 0) > 0
    ? Math.round(((summary?.tasks_done ?? 0) / (summary?.tasks_total ?? 1)) * 100) : 0;

  const runningTask = (allTasks as Task[]).find(t => t.timer_running) ?? null;
  const totalTracked = (allTasks as Task[]).reduce((sum, t) => sum + (t.time_spent ?? 0), 0);

  useKeyboardShortcuts([{
    key: "r",
    handler: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["summary-today"] });
    },
    description: "Refresh today",
  }]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-8 pt-10 pb-6 border-b border-border/60">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
          {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{getGreeting()}</h1>
      </div>

      {runningTask && <RunningTaskBanner task={runningTask} onStop={() => stopTimer.mutate(runningTask.id)} />}

      <div className="px-8 py-8 space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative bg-card border border-border rounded-2xl p-5 overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5">
              <ProgressRing percent={pct} size={100} stroke={10} />
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Progress</p>
            <div className="flex items-end gap-4">
              <ProgressRing percent={pct} size={64} stroke={5} />
              <div>
                <p className="text-3xl font-bold font-mono text-foreground leading-none">
                  {pct}<span className="text-lg text-muted-foreground">%</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{summary?.tasks_done ?? 0} of {summary?.tasks_total ?? 0} done</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Due today</p>
            <p className="text-4xl font-bold font-mono text-foreground leading-none">{summary?.tasks_total ?? 0}</p>
            <div className="mt-3 flex gap-1">
              {(summary?.tasks_total ?? 0) > 0 && Array.from({ length: Math.min(summary?.tasks_total ?? 0, 8) }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < (summary?.tasks_done ?? 0) ? "bg-emerald-500" : "bg-muted"}`}
                  style={{ transitionDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Time tracked</p>
            <p className="text-3xl font-bold font-mono text-foreground leading-none">{formatHoursMinutes(totalTracked)}</p>
            {runningTask ? (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Timer running</p>
              </div>
            ) : totalTracked > 0 && (
              <p className="text-xs text-muted-foreground mt-2">across all tasks</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              {tasks.length > 0 ? `${tasks.length} task${tasks.length !== 1 ? "s" : ""} due today` : "No tasks due today"}
            </h2>
            <kbd className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">R to refresh</kbd>
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <span className="text-2xl">🌤</span>
              </div>
              <p className="text-sm font-medium text-foreground">Clear for today</p>
              <p className="text-xs text-muted-foreground mt-1">No tasks are due today. Enjoy!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const estimateSecs = (task.time_estimate ?? 0) * 60;
                const isOver = estimateSecs > 0 && task.time_spent > estimateSecs;
                return (
                  <div
                    key={task.id}
                    onClick={() => updateStatus.mutate({ id: task.id, status: task.status === "done" ? "todo" : "done" })}
                    className={`flex items-center gap-4 bg-card border rounded-xl px-5 py-3.5 cursor-pointer transition-all group ${
                      task.status === "done" ? "border-border/40 opacity-60"
                        : task.timer_running ? "border-emerald-500/30 bg-emerald-500/3 hover:shadow-sm"
                        : "border-border hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      task.status === "done" ? "border-emerald-500 bg-emerald-500" : "border-border group-hover:border-primary"
                    }`}>
                      {task.status === "done" && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm flex-1 font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.due_date && <span>{relativeDate(task.due_date)}</span>}
                      {task.status === "done" && estimateSecs > 0 && (
                        <span className={`flex items-center gap-1 font-mono text-[11px] ${isOver ? "text-rose-500" : "text-emerald-500"}`}>
                          {isOver ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {formatTime(task.time_spent)}
                        </span>
                      )}
                      {task.status !== "done" && (
                        <span className={`font-mono flex items-center gap-1 ${task.timer_running ? "text-emerald-500" : ""}`}>
                          {task.timer_running && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          <Clock size={10} />
                          {formatTime(task.time_spent)}
                        </span>
                      )}
                      <span className={`w-1.5 h-1.5 rounded-full ${task.priority === "high" ? "bg-rose-500" : task.priority === "medium" ? "bg-amber-400" : "bg-emerald-500"}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
