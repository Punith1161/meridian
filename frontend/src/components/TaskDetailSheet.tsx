import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utils/api";
import type { Task } from "@/components/TaskCard";
import {
  Play, Pause, Trash2, Clock, Flag,
  CheckCircle2, Timer, TrendingDown, TrendingUp, Minus,
} from "lucide-react";

function fmtSecs(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TimeDelta({ estimateMins, spentSecs }: { estimateMins: number; spentSecs: number }) {
  const estimateSecs = estimateMins * 60;
  const diff = spentSecs - estimateSecs;
  const pct = estimateSecs > 0 ? Math.round((spentSecs / estimateSecs) * 100) : 0;
  if (estimateSecs === 0) return null;
  const isOver = diff > 0;
  const isUnder = diff < 0;
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3.5 ${isOver ? "bg-rose-500/5 border-rose-500/20" : isUnder ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/40 border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time analysis</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOver ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : isUnder ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{pct}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Timer size={9} /> Estimated</span>
          <span className="text-sm font-mono font-semibold text-foreground">{fmtEstimate(estimateMins)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={9} /> Actual</span>
          <span className={`text-sm font-mono font-semibold ${isOver ? "text-rose-500" : isUnder ? "text-emerald-500" : "text-foreground"}`}>{fmtSecs(spentSecs)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isOver ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${isOver ? "text-rose-500" : isUnder ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
        {isOver ? (<><TrendingUp size={11} /> {fmtSecs(Math.abs(diff))} over estimate</>) : isUnder ? (<><TrendingDown size={11} /> {fmtSecs(Math.abs(diff))} under estimate</>) : (<><Minus size={11} /> Exactly on estimate</>)}
      </div>
    </div>
  );
}

const PRIORITY_CONFIG = {
  high:   { dot: "bg-rose-500",    label: "High",   badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  medium: { dot: "bg-amber-400",   label: "Medium", badge: "bg-amber-400/10 text-amber-600 dark:text-amber-400" },
  low:    { dot: "bg-emerald-500", label: "Low",    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailSheet({ task, open, onClose }: TaskDetailSheetProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle]       = useState("");
  const [priority, setPriority] = useState<"high"|"medium"|"low">("medium");
  const [status, setStatus]     = useState<"todo"|"inprogress"|"done">("todo");
  const [dueDate, setDueDate]   = useState("");
  const [estimate, setEstimate] = useState("");
  const [dirty, setDirty]       = useState(false);
  const [liveSeconds, setLive]  = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date ?? "");
    setEstimate(task.time_estimate != null ? String(task.time_estimate) : "");
    setLive(task.time_spent);
    setDirty(false);
  }, [task?.id]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (task?.timer_running) {
      setLive(task.time_spent);
      intervalRef.current = setInterval(() => setLive(s => s + 1), 1000);
    } else {
      setLive(task?.time_spent ?? 0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [task?.timer_running, task?.time_spent]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["summary-today"] });
  };

  const updateTask   = useMutation({ mutationFn: (data: object) => api.put(`/tasks/${task!.id}`, data), onSuccess: invalidate });
  const updateStatus = useMutation({ mutationFn: (s: string) => api.patch(`/tasks/${task!.id}/status`, { status: s }), onSuccess: invalidate });
  const deleteTask   = useMutation({ mutationFn: () => api.delete(`/tasks/${task!.id}`), onSuccess: () => { invalidate(); onClose(); } });
  const startTimer   = useMutation({ mutationFn: () => api.post(`/tasks/${task!.id}/timer/start`), onSuccess: invalidate });
  const stopTimer    = useMutation({ mutationFn: () => api.post(`/tasks/${task!.id}/timer/stop`), onSuccess: invalidate });

  if (!task) return null;

  const isDone = task.status === "done";
  const estimateNum = estimate !== "" ? Number(estimate) : null;
  const pri = PRIORITY_CONFIG[priority];

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      await updateTask.mutateAsync({ title: title.trim(), priority, due_date: dueDate || null, time_estimate: estimateNum });
      if (status !== task.status) await updateStatus.mutateAsync(status);
      setDirty(false);
      toast({ title: "Task saved" });
    } catch { toast({ title: "Could not save", variant: "destructive" }); }
  };

  const handleStatusChange = async (v: string) => {
    setStatus(v as "todo"|"inprogress"|"done");
    setDirty(true);
    try { await updateStatus.mutateAsync(v); }
    catch { toast({ title: "Could not update status", variant: "destructive" }); }
  };

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-start gap-2">
            {isDone && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />}
            <SheetTitle className="text-sm font-semibold text-foreground leading-snug text-left">{task.title}</SheetTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 text-xs w-[120px] border-0 bg-muted/60 rounded-full px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To do</SelectItem>
                <SelectItem value="inprogress">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${pri.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />{pri.label}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Timer block */}
          <div className={`rounded-xl border p-4 flex items-center justify-between ${task.timer_running ? "bg-emerald-500/5 border-emerald-500/30" : "bg-muted/30 border-border"}`}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{task.timer_running ? "Timer running" : "Time tracked"}</span>
              <span className={`text-2xl font-mono font-bold tabular-nums leading-none ${task.timer_running ? "text-emerald-500" : "text-foreground"}`}>
                {fmtSecs(liveSeconds)}
                {task.timer_running && <span className="ml-2 inline-flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse align-middle" />}
              </span>
            </div>
            <button
              onClick={() => task.timer_running ? stopTimer.mutate() : startTimer.mutate()}
              disabled={isDone || startTimer.isPending || stopTimer.isPending}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${task.timer_running ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30" : "bg-primary text-primary-foreground hover:opacity-90 shadow-md"}`}
            >
              {task.timer_running ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>

          {estimateNum != null && estimateNum > 0 && <TimeDelta estimateMins={estimateNum} spentSecs={liveSeconds} />}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Title</label>
              <Input value={title} onChange={e => { setTitle(e.target.value); setDirty(true); }} className="text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Priority</label>
                <Select value={priority} onValueChange={v => { setPriority(v as "high"|"medium"|"low"); setDirty(true); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500" />High</span></SelectItem>
                    <SelectItem value="medium"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" />Medium</span></SelectItem>
                    <SelectItem value="low"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Low</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Due date</label>
                <Input type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); setDirty(true); }} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Estimate (minutes)</label>
              <Input type="number" min={0} value={estimate} onChange={e => { setEstimate(e.target.value); setDirty(true); }} placeholder="e.g. 60" className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <Clock size={12} />, label: "Tracked", value: fmtSecs(liveSeconds), color: task.timer_running ? "text-emerald-500" : "text-foreground" },
              { icon: <Timer size={12} />, label: "Estimate", value: estimateNum ? fmtEstimate(estimateNum) : "—", color: "text-foreground" },
              { icon: <Flag size={12} />,  label: "Priority", value: pri.label, color: "" },
            ].map(s => (
              <div key={s.label} className="bg-muted/40 rounded-lg p-2.5 text-center border border-border/50">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  {s.icon}<span className="text-[9px] uppercase tracking-wider font-semibold">{s.label}</span>
                </div>
                <p className={`text-xs font-mono font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 px-5 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5" onClick={() => deleteTask.mutate()} disabled={deleteTask.isPending}>
            <Trash2 size={13} /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={onClose}>Close</Button>
            {dirty && (
              <Button size="sm" className="h-8" onClick={handleSave} disabled={updateTask.isPending}>
                {updateTask.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
