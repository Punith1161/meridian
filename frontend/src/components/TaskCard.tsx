import { useState, useEffect, useRef } from "react";
import {
  Play, Pause, Trash2, Calendar, Clock, GripVertical,
  CheckCircle2, Timer, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { formatTime } from "@/utils/formatTime";
import { relativeDate } from "@/utils/dateHelpers";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";

export interface Task {
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

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

const priorityDot    = { high: "bg-rose-500",   medium: "bg-amber-400",  low: "bg-emerald-500" };
const priorityLabel  = { high: "High",           medium: "Med",           low: "Low" };
const priorityAccent = { high: "border-l-rose-500/60", medium: "border-l-amber-400/60", low: "border-l-emerald-500/60" };

function fmtSecs(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

export function TaskCard({ task, isDragging }: TaskCardProps) {
  const qc = useQueryClient();
  const [liveSeconds, setLiveSeconds] = useState(task.time_spent);
  const [sheetOpen, setSheetOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setLiveSeconds(task.time_spent);
    if (task.timer_running) {
      intervalRef.current = setInterval(() => setLiveSeconds(s => s + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [task.time_spent, task.timer_running]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const startTimer = useMutation({ mutationFn: () => api.post(`/tasks/${task.id}/timer/start`), onSuccess: invalidate });
  const stopTimer  = useMutation({ mutationFn: () => api.post(`/tasks/${task.id}/timer/stop`),  onSuccess: invalidate });
  const deleteTask = useMutation({ mutationFn: () => api.delete(`/tasks/${task.id}`),            onSuccess: invalidate });

  const handleTimerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.timer_running) stopTimer.mutate();
    else startTimer.mutate();
  };
  const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); deleteTask.mutate(); };
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setSheetOpen(true);
  };

  const pri = task.priority as keyof typeof priorityDot;
  const estimateSecs = (task.time_estimate ?? 0) * 60;
  const progress = estimateSecs > 0 ? Math.min(1, liveSeconds / estimateSecs) : 0;
  const isOvertime = estimateSecs > 0 && liveSeconds > estimateSecs;
  const diffSecs = liveSeconds - estimateSecs;

  if (task.status === "done") {
    return (
      <>
        <div
          onClick={handleCardClick}
          className={`group relative bg-card/60 border border-border/50 border-l-2 ${priorityAccent[pri] ?? "border-l-border"} rounded-lg p-3 transition-all duration-150 cursor-pointer ${isDragging ? "shadow-xl scale-[1.02] rotate-1 ring-1 ring-primary/20 opacity-90" : "hover:shadow-sm opacity-80 hover:opacity-95"}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex items-start gap-1.5 flex-1 min-w-0">
              <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] font-medium text-card-foreground/60 line-through leading-snug">{task.title}</p>
            </div>
            <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive p-0.5 rounded hover:bg-destructive/10 flex-shrink-0">
              <Trash2 size={11} />
            </button>
          </div>

          {estimateSecs > 0 ? (
            <div className={`rounded-lg border px-3 py-2 space-y-1.5 ${isOvertime ? "bg-rose-500/5 border-rose-500/20" : "bg-emerald-500/5 border-emerald-500/20"}`}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground"><Timer size={9} /> Estimated</span>
                <span className="font-mono font-medium text-foreground">{fmtSecs(estimateSecs)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground"><Clock size={9} /> Actual</span>
                <span className={`font-mono font-medium ${isOvertime ? "text-rose-500" : "text-emerald-500"}`}>{fmtSecs(liveSeconds)}</span>
              </div>
              <div className="h-1 bg-muted/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isOvertime ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(progress * 100, 100)}%` }} />
              </div>
              <div className={`flex items-center gap-1 text-[9px] font-semibold ${isOvertime ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                {isOvertime ? (<><TrendingUp size={9} /> +{fmtSecs(diffSecs)} over</>) : diffSecs < 0 ? (<><TrendingDown size={9} /> {fmtSecs(Math.abs(diffSecs))} saved</>) : (<><Minus size={9} /> Exactly on estimate</>)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock size={9} /><span className="font-mono">{fmtSecs(liveSeconds)} tracked</span>
            </div>
          )}
        </div>
        <TaskDetailSheet task={task} open={sheetOpen} onClose={() => setSheetOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`group relative bg-card border border-border border-l-2 ${priorityAccent[pri] ?? "border-l-border"} rounded-lg p-3.5 transition-all duration-150 cursor-pointer ${isDragging ? "shadow-xl scale-[1.02] rotate-1 ring-1 ring-primary/20" : "hover:shadow-md hover:border-border"}`}
      >
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-25 transition-opacity text-foreground cursor-grab active:cursor-grabbing">
          <GripVertical size={13} />
        </div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <p className="text-[13px] font-medium text-card-foreground leading-snug flex-1 pr-1">{task.title}</p>
          <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive p-0.5 rounded hover:bg-destructive/10 flex-shrink-0">
            <Trash2 size={12} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[pri] ?? "bg-muted-foreground"}`} />
            {priorityLabel[pri] ?? "Med"}
          </span>
          {task.due_date && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar size={10} />{relativeDate(task.due_date)}
            </span>
          )}
        </div>
        {task.time_estimate != null && task.time_estimate > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1 text-[10px] text-muted-foreground">
              <span>{Math.round(progress * 100)}%</span>
              <span className="font-mono">{fmtSecs(liveSeconds)} / {fmtSecs(estimateSecs)}</span>
            </div>
            <div className="h-0.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${progress >= 1 ? "bg-rose-500" : task.timer_running ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${Math.min(progress * 100, 100)}%` }} />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className={`font-mono text-[11px] flex items-center gap-1 transition-colors ${task.timer_running ? "text-emerald-500" : "text-muted-foreground"}`}>
            <Clock size={10} />
            {formatTime(liveSeconds)}
            {task.timer_running && <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />}
          </span>
          <button
            onClick={handleTimerToggle}
            disabled={startTimer.isPending || stopTimer.isPending}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${task.timer_running ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
          >
            {task.timer_running ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
          </button>
        </div>
      </div>
      <TaskDetailSheet task={task} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
