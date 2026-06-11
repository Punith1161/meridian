import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { formatTime } from "@/utils/formatTime";
import { relativeDate } from "@/utils/dateHelpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { Task } from "@/components/TaskCard";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";

const priorityColor = {
  high:   "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  medium: "bg-amber-400/12 text-amber-600 dark:text-amber-400",
  low:    "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
};

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  todo:       { label: "To do",       color: "bg-muted/60 text-muted-foreground",  dot: "bg-muted-foreground/50" },
  inprogress: { label: "In progress", color: "bg-primary/10 text-primary",         dot: "bg-primary" },
  done:       { label: "Done",        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
};

type SortKey = "title" | "priority" | "status" | "due_date" | "time_estimate" | "time_spent" | "efficiency";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER   = { todo: 0, inprogress: 1, done: 2 };

function efficiency(task: Task): number | null {
  if (!task.time_estimate || task.time_estimate <= 0 || task.time_spent <= 0) return null;
  return Math.round((task.time_spent / (task.time_estimate * 60)) * 100);
}

function EfficiencyBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground">—</span>;
  const over = pct > 100, under = pct < 100;
  return (
    <span className={`flex items-center gap-1 text-xs font-mono font-medium ${over ? "text-rose-500" : under ? "text-emerald-500" : "text-muted-foreground"}`}>
      {over ? <TrendingUp size={10} /> : under ? <TrendingDown size={10} /> : <Minus size={10} />}
      {pct}%
    </span>
  );
}

export default function AllTasks() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks"),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [sortKey,        setSortKey]         = useState<SortKey>("status");
  const [sortDir,        setSortDir]         = useState<SortDir>("asc");
  const [groupByStatus,  setGroupByStatus]   = useState(true);
  const [collapsed,      setCollapsed]       = useState<Record<string, boolean>>({});
  const [sheetTask,      setSheetTask]       = useState<Task | null>(null);

  const filtered = tasks.filter(t => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterStatus   !== "all" && t.status   !== filterStatus)   return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":         cmp = a.title.localeCompare(b.title); break;
      case "priority":      cmp = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1); break;
      case "status":        cmp = (STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 0) - (STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 0); break;
      case "due_date":      cmp = (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"); break;
      case "time_estimate": cmp = (a.time_estimate ?? 0) - (b.time_estimate ?? 0); break;
      case "time_spent":    cmp = (a.time_spent ?? 0) - (b.time_spent ?? 0); break;
      case "efficiency":    cmp = (efficiency(a) ?? -1) - (efficiency(b) ?? -1); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUp size={10} className="text-muted-foreground/30" />;
    return sortDir === "asc" ? <ArrowUp size={10} className="text-primary" /> : <ArrowDown size={10} className="text-primary" />;
  };

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => handleSort(k)}>
      <span className="flex items-center gap-1.5">{children}<SortIcon k={k} /></span>
    </th>
  );

  const groups = groupByStatus
    ? (["todo", "inprogress", "done"] as const).map(s => ({ status: s, tasks: sorted.filter(t => t.status === s) })).filter(g => g.tasks.length > 0)
    : [{ status: "" as const, tasks: sorted }];

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-base font-semibold text-foreground">All tasks</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} of {tasks.length} tasks</p>
      </div>

      <div className="px-6 py-3 border-b border-border/50 flex items-center gap-3 flex-wrap bg-muted/20">
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="todo">To do</SelectItem>
            <SelectItem value="inprogress">In progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setGroupByStatus(g => !g)}
            className={`h-8 px-3 text-xs rounded-md border transition-colors font-medium ${groupByStatus ? "bg-primary/10 text-primary border-primary/25" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Group by status
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-lg">No tasks found.</div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <Th k="title">Title</Th>
                  <Th k="priority">Priority</Th>
                  <Th k="status">Status</Th>
                  <Th k="due_date">Due date</Th>
                  <Th k="time_estimate">Estimate</Th>
                  <Th k="time_spent">Time spent</Th>
                  <Th k="efficiency">Efficiency</Th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <>
                    {groupByStatus && group.status && (
                      <tr key={`group-${group.status}`} className="border-b border-border/40 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setCollapsed(c => ({ ...c, [group.status]: !c[group.status] }))}>
                        <td colSpan={8} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {collapsed[group.status] ? <ChevronRight size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusConfig[group.status]?.color}`}>{statusConfig[group.status]?.label}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">{group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!collapsed[group.status] && group.tasks.map(task => {
                      const sc = statusConfig[task.status];
                      const pc = priorityColor[task.priority as keyof typeof priorityColor];
                      return (
                        <tr key={task.id} onClick={() => setSheetTask(task)} className="border-b border-border/40 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group">
                          <td className="px-4 py-3 font-medium text-foreground text-sm max-w-[240px]"><span className="truncate block">{task.title}</span></td>
                          <td className="px-4 py-2.5"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${pc ?? ""}`}>{task.priority}</span></td>
                          <td className="px-4 py-2.5"><span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5 w-fit ${sc?.color ?? ""}`}><span className={`w-1.5 h-1.5 rounded-full ${sc?.dot ?? "bg-muted-foreground"}`} />{sc?.label ?? task.status}</span></td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{task.due_date ? relativeDate(task.due_date) : "—"}</td>
                          <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{task.time_estimate ? `${task.time_estimate}m` : "—"}</td>
                          <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                            <span className={task.timer_running ? "text-emerald-500 flex items-center gap-1" : ""}>
                              {task.timer_running && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                              {formatTime(task.time_spent)}
                            </span>
                          </td>
                          <td className="px-4 py-3"><EfficiencyBadge pct={efficiency(task)} /></td>
                          <td className="px-4 py-3">
                            <button onClick={e => { e.stopPropagation(); deleteTask.mutate(task.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TaskDetailSheet task={sheetTask} open={!!sheetTask} onClose={() => setSheetTask(null)} />
    </div>
  );
}
