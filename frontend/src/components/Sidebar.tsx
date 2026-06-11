import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Kanban as KanbanIcon,
  Sun, Moon, LogOut, Search,
  Activity, LayoutDashboard, ListTodo,
  FileText, Table2, CalendarRange, Flame,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/",         icon: KanbanIcon,       label: "Kanban",    shortcut: "⌘1" },
  { href: "/today",    icon: LayoutDashboard,   label: "Today",     shortcut: "⌘2" },
  { href: "/tasks",    icon: ListTodo,          label: "All tasks", shortcut: "⌘3" },
  { href: "/notes",    icon: FileText,          label: "Notes",     shortcut: "⌘4" },
  { href: "/sheets",   icon: Table2,            label: "Sheets",    shortcut: "⌘5" },
  { href: "/calendar", icon: CalendarRange,     label: "Calendar",  shortcut: "⌘6" },
  { href: "/habits",   icon: Flame,             label: "Habits",    shortcut: "⌘7" },
  { href: "/activity", icon: Activity,          label: "Activity",  shortcut: "⌘8" },
];

interface SidebarProps {
  onOpenPalette?: () => void;
}

export function Sidebar({ onOpenPalette }: SidebarProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-14 flex flex-col items-center py-3 bg-sidebar border-r border-sidebar-border z-40">
      {/* Logo / command palette trigger */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            onClick={onOpenPalette}
            className="mb-3 w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <span className="text-primary font-bold text-base font-mono select-none">M</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="flex items-center gap-2">
            Search & navigate{" "}
            <kbd className="font-mono text-[10px] bg-muted px-1 rounded">⌘K</kbd>
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-0.5 flex-1">
        {navItems.map(({ href, icon: Icon, label, shortcut }, idx) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Tooltip key={href} delayDuration={200}>
              <TooltipTrigger asChild>
                <Link href={href}>
                  <button
                    data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    style={{ animationDelay: `${idx * 35}ms` }}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 animate-slide-in ${
                      isActive
                        ? "bg-primary/20 text-primary shadow-sm"
                        : "text-sidebar-foreground/60 hover:bg-accent/60 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="flex items-center gap-2">
                  {label}{" "}
                  <kbd className="font-mono text-[10px] bg-muted px-1 rounded">{shortcut}</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-0.5">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenPalette}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-sidebar-foreground/60 hover:bg-accent/60 hover:text-sidebar-foreground transition-all"
            >
              <Search size={17} strokeWidth={1.8} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="flex items-center gap-2">
              Search{" "}
              <kbd className="font-mono text-[10px] bg-muted px-1 rounded">⌘K</kbd>
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              data-testid="button-theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-sidebar-foreground/60 hover:bg-accent/60 hover:text-sidebar-foreground transition-all"
            >
              {theme === "dark" ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right"><p>Toggle theme</p></TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              data-testid="button-logout"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-sidebar-foreground/60 hover:bg-accent/60 hover:text-sidebar-foreground transition-all"
              onClick={logout}
            >
              <LogOut size={17} strokeWidth={1.8} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right"><p>Sign out</p></TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
