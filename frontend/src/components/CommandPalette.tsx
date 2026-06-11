import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Kanban as KanbanIcon, LayoutDashboard, ListTodo, FileText,
  Table2, CalendarRange, Flame, Activity, Search, X,
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nav = useCallback((path: string) => { setLocation(path); onClose(); }, [setLocation, onClose]);

  const commands: Command[] = [
    { id: "kanban",   label: "Kanban",    description: "Project boards & cards",  icon: <KanbanIcon size={15} />,      action: () => nav("/"),         shortcut: "⌘1" },
    { id: "today",    label: "Today",     description: "Today's focus & tasks",   icon: <LayoutDashboard size={15} />, action: () => nav("/today"),    shortcut: "⌘2" },
    { id: "tasks",    label: "All Tasks", description: "Full task list",          icon: <ListTodo size={15} />,        action: () => nav("/tasks"),    shortcut: "⌘3" },
    { id: "notes",    label: "Notes",     description: "Notes & notebooks",       icon: <FileText size={15} />,        action: () => nav("/notes"),    shortcut: "⌘4" },
    { id: "sheets",   label: "Sheets",    description: "Spreadsheets & data",     icon: <Table2 size={15} />,          action: () => nav("/sheets"),   shortcut: "⌘5" },
    { id: "calendar", label: "Calendar",  description: "Events & schedule",       icon: <CalendarRange size={15} />,   action: () => nav("/calendar"), shortcut: "⌘6" },
    { id: "habits",   label: "Habits",    description: "Daily habit tracker",     icon: <Flame size={15} />,           action: () => nav("/habits"),   shortcut: "⌘7" },
    { id: "activity", label: "Activity",  description: "Activity log & timeline", icon: <Activity size={15} />,        action: () => nav("/activity"), shortcut: "⌘8" },
  ];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    if (open) {
      setQuery(""); setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[activeIdx]) { filtered[activeIdx].action(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIdx, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-page-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/70">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Navigate to…"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
          )}
        </div>

        {/* Results list */}
        <div className="py-1 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No results for "{query}"</p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === activeIdx
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted/40"
                }`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={cmd.action}
              >
                <span className={`flex-shrink-0 transition-colors ${i === activeIdx ? "text-primary" : "text-muted-foreground"}`}>
                  {cmd.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{cmd.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{cmd.description}</span>
                </div>
                {cmd.shortcut && (
                  <kbd className="text-[9px] font-mono text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground/40">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
