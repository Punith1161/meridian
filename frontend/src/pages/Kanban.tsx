import { useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { TaskCard, type Task } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const COLUMNS = [
  { id: "todo",       label: "To do",       dot: "bg-muted-foreground/50", accent: "border-t-transparent",        emptyMsg: "Drop tasks here or add one below" },
  { id: "inprogress", label: "In progress", dot: "bg-primary",             accent: "border-t-primary/30",         emptyMsg: "Nothing in progress" },
  { id: "done",       label: "Done",        dot: "bg-emerald-500",          accent: "border-t-emerald-500/30",    emptyMsg: "Tasks you complete show here" },
];

const taskSchema = z.object({
  title:         z.string().min(1, "Title is required"),
  priority:      z.enum(["high", "medium", "low"]),
  status:        z.enum(["todo", "inprogress", "done"]),
  due_date:      z.string().optional(),
  time_estimate: z.coerce.number().min(0).optional(),
});

interface InlineAddProps {
  columnId: string;
  onAdd: (title: string, colId: string) => Promise<void>;
}

function InlineAdd({ columnId, onAdd }: InlineAddProps) {
  const [active, setActive]   = useState(false);
  const [title, setTitle]     = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!title.trim()) { setActive(false); return; }
    setLoading(true);
    await onAdd(title.trim(), columnId);
    setTitle("");
    setLoading(false);
    setActive(false);
  };

  if (!active) {
    return (
      <button
        onClick={() => { setActive(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors group mt-1"
      >
        <Plus size={13} className="group-hover:text-primary transition-colors" />
        Add task
      </button>
    );
  }

  return (
    <div className="mt-1 rounded-lg border border-border bg-card p-2.5 shadow-sm">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title…"
        className="w-full text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setActive(false); setTitle(""); }
        }}
        disabled={loading}
      />
      <div className="flex gap-1.5 mt-2">
        <button
          onClick={submit}
          disabled={loading || !title.trim()}
          className="px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded-md disabled:opacity-50 font-medium hover:opacity-90 transition-opacity"
        >
          {loading ? "Adding…" : "Add"}
        </button>
        <button
          onClick={() => { setActive(false); setTitle(""); }}
          className="px-2.5 py-1 text-xs text-muted-foreground rounded-md hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Kanban() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks"),
  });

  const createTask = useMutation({
    mutationFn: (data: { title: string; priority: string; status: string; due_date?: string | null; time_estimate?: number | null }) =>
      api.post<Task>("/tasks", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const reorderTasks = useMutation({
    mutationFn: (data: { items: { task_id: number; position: number; status: string }[] }) =>
      api.post<Task[]>("/tasks/reorder", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", priority: "medium", status: "todo" },
  });

  useKeyboardShortcuts([
    { key: "c", handler: () => { form.reset({ title: "", priority: "medium", status: "todo" }); setOpen(true); }, description: "Create task" },
  ]);

  const byStatus = (status: string): Task[] =>
    tasks.filter((t) => t.status === status).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const taskId = Number(draggableId);
    const srcCol = source.droppableId as "todo" | "inprogress" | "done";
    const dstCol = destination.droppableId as "todo" | "inprogress" | "done";
    if (srcCol === dstCol && destination.index === source.index) return;

    if (srcCol === dstCol) {
      const colTasks = byStatus(srcCol);
      const reordered = [...colTasks];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      const items = reordered.map((t, i) => ({ task_id: t.id, position: i, status: srcCol }));
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((t) => { const f = items.find((it) => it.task_id === t.id); return f ? { ...t, position: f.position } : t; })
      );
      await reorderTasks.mutateAsync({ items });
    } else {
      const dstTasks = byStatus(dstCol).filter((t) => t.id !== taskId);
      const dstItems = [
        ...dstTasks.slice(0, destination.index).map((t, i) => ({ task_id: t.id, position: i, status: dstCol })),
        { task_id: taskId, position: destination.index, status: dstCol },
        ...dstTasks.slice(destination.index).map((t, i) => ({ task_id: t.id, position: destination.index + 1 + i, status: dstCol })),
      ];
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((t) => { const f = dstItems.find((it) => it.task_id === t.id); return f ? { ...t, position: f.position, status: dstCol } : t; })
      );
      await reorderTasks.mutateAsync({ items: dstItems });
    }
  };

  const handleInlineAdd = async (title: string, colId: string) => {
    await createTask.mutateAsync({ title, priority: "medium", status: colId, due_date: null, time_estimate: null });
  };

  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    await createTask.mutateAsync({
      title: values.title,
      priority: values.priority,
      status: values.status,
      due_date: values.due_date || null,
      time_estimate: values.time_estimate ?? null,
    });
    form.reset();
    setOpen(false);
  };

  const openModal = (colId: "todo" | "inprogress" | "done") => {
    form.reset({ title: "", priority: "medium", status: colId });
    setOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Loading board…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground">Board</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
            {tasks.length} tasks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/50">
            <kbd className="font-mono text-[10px]">C</kbd>
            <span>new task</span>
          </div>
          <Button size="sm" onClick={() => openModal("todo")} className="gap-1.5 h-8">
            <Plus size={13} />
            New task
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-5 overflow-x-auto p-6">
          {COLUMNS.map((col) => {
            const colTasks = byStatus(col.id);
            return (
              <div key={col.id} className="flex flex-col min-w-[280px] w-[280px] flex-shrink-0">
                <div className={`flex items-center justify-between mb-3 pb-3 border-b-2 ${col.accent}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-[13px] font-semibold text-foreground">{col.label}</span>
                    <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                      col.id === "done" && colTasks.length > 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openModal(col.id as "todo" | "inprogress" | "done")}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 flex flex-col min-h-[120px] rounded-xl transition-all duration-200 ${
                        snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20 ring-inset" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-xs text-muted-foreground/60">{col.emptyMsg}</p>
                          </div>
                        )}
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style as React.CSSProperties}
                              >
                                <TaskCard task={task} isDragging={snapshot.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                      <InlineAdd columnId={col.id} onAdd={handleInlineAdd} />
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={16} className="text-primary" />
              New task
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input
                        placeholder="What needs to be done?"
                        className="w-full text-base bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 font-medium py-1"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="h-px bg-border" />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500" />High</span></SelectItem>
                          <SelectItem value="medium"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" />Medium</span></SelectItem>
                          <SelectItem value="low"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Low</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Column</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">To do</SelectItem>
                          <SelectItem value="inprogress">In progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Due date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-8 text-sm" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time_estimate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Estimate (min)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="60" className="h-8 text-sm" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-between items-center pt-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <kbd className="font-mono text-[10px] bg-muted px-1 rounded">↵</kbd> to create
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button size="sm" type="submit" disabled={createTask.isPending}>
                    {createTask.isPending ? "Creating…" : "Create task"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
