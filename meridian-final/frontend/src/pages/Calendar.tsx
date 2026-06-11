import { useState, useEffect, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventClickArg, DateSelectArg, EventDropArg, EventResizeDoneArg } from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import "../styles/fullcalendar.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addHours, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Clock, MapPin, Plus, RefreshCw, Repeat, Trash2, X, Pencil, AlignLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarEvent = {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location?: string | null;
  description?: string | null;
  color?: string | null;
  recurrence: string;
  reminder_minutes?: number | null;
  created_at: string;
  updated_at: string;
};

type EventDraft = {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  description: string;
  color: string;
  recurrence: string;
  reminder_minutes: string;
};

// ─── Color categories (Outlook-style) ─────────────────────────────────────────

const COLOR_CATEGORIES = [
  { label: "Blue",    value: "#2563eb", bg: "#dbeafe", text: "#1e40af" },
  { label: "Teal",    value: "#0d9488", bg: "#ccfbf1", text: "#0f766e" },
  { label: "Green",   value: "#16a34a", bg: "#dcfce7", text: "#15803d" },
  { label: "Yellow",  value: "#ca8a04", bg: "#fef9c3", text: "#a16207" },
  { label: "Orange",  value: "#ea580c", bg: "#ffedd5", text: "#c2410c" },
  { label: "Red",     value: "#dc2626", bg: "#fee2e2", text: "#b91c1c" },
  { label: "Purple",  value: "#7c3aed", bg: "#ede9fe", text: "#6d28d9" },
  { label: "Pink",    value: "#db2777", bg: "#fce7f3", text: "#be185d" },
  { label: "Gray",    value: "#4b5563", bg: "#f3f4f6", text: "#374151" },
];

const RECURRENCE_OPTIONS = [
  { label: "Does not repeat", value: "none" },
  { label: "Daily",           value: "daily" },
  { label: "Weekdays (Mon–Fri)", value: "weekdays" },
  { label: "Weekly",          value: "weekly" },
  { label: "Monthly",         value: "monthly" },
  { label: "Yearly",          value: "yearly" },
];

const REMINDER_OPTIONS = [
  { label: "No reminder",       value: "" },
  { label: "At event start",    value: "0" },
  { label: "5 minutes before",  value: "5" },
  { label: "10 minutes before", value: "10" },
  { label: "15 minutes before", value: "15" },
  { label: "30 minutes before", value: "30" },
  { label: "1 hour before",     value: "60" },
  { label: "1 day before",      value: "1440" },
];

const QUERY_KEY = ["calendar-events"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const token = localStorage.getItem("meridian_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options?.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = (data as { detail?: string }).detail ?? msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function fmt(d: Date, allDay: boolean) {
  return allDay ? format(d, "yyyy-MM-dd") : format(d, "yyyy-MM-dd'T'HH:mm");
}

function nextHalf(d = new Date()) {
  const m = d.getMinutes();
  const add = m < 30 ? 30 - m : 60 - m;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), m + add, 0, 0);
}

function makeDraft(base = new Date(), allDay = false): EventDraft {
  const start = isToday(base) ? nextHalf() : (() => { const d = new Date(base); d.setHours(9,0,0,0); return d; })();
  return {
    title: "",
    start: fmt(start, allDay),
    end: fmt(addHours(start, 1), allDay),
    allDay,
    location: "",
    description: "",
    color: COLOR_CATEGORIES[0].value,
    recurrence: "none",
    reminder_minutes: "",
  };
}

function draftFromEvent(ev: CalendarEvent): EventDraft {
  const s = new Date(ev.start_at);
  const e = new Date(ev.end_at);
  return {
    title: ev.title,
    start: fmt(s, ev.all_day),
    end: fmt(e, ev.all_day),
    allDay: ev.all_day,
    location: ev.location ?? "",
    description: ev.description ?? "",
    color: ev.color ?? COLOR_CATEGORIES[0].value,
    recurrence: ev.recurrence ?? "none",
    reminder_minutes: ev.reminder_minutes != null ? String(ev.reminder_minutes) : "",
  };
}

function normDT(val: string, allDay: boolean, isEnd = false) {
  if (allDay) {
    const d = new Date(`${val}T00:00:00`);
    if (isEnd) d.setHours(23, 59, 59);
    return format(d, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return format(new Date(val), "yyyy-MM-dd'T'HH:mm:ss");
}

function colorForEvent(ev: CalendarEvent) {
  const cat = COLOR_CATEGORIES.find(c => c.value === ev.color);
  return cat ? cat.value : COLOR_CATEGORIES[0].value;
}

// ─── Reminder engine ──────────────────────────────────────────────────────────

function useReminders(events: CalendarEvent[]) {
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!("Notification" in window)) return;
    const tick = () => {
      const now = Date.now();
      events.forEach(ev => {
        if (ev.reminder_minutes == null) return;
        const start = new Date(ev.start_at).getTime();
        const triggerAt = start - ev.reminder_minutes * 60_000;
        const key = `${ev.id}-${ev.reminder_minutes}`;
        if (!firedRef.current.has(key) && now >= triggerAt && now < triggerAt + 60_000) {
          firedRef.current.add(key);
          if (Notification.permission === "granted") {
            new Notification(ev.title, {
              body: ev.reminder_minutes === 0
                ? "Starting now"
                : `Starts in ${ev.reminder_minutes} min${ev.reminder_minutes > 1 ? "s" : ""}`,
              icon: "/favicon.svg",
            });
          }
        }
      });
    };
    const id = setInterval(tick, 30_000);
    tick();
    return () => clearInterval(id);
  }, [events]);

  const requestPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);
  return { requestPermission };
}

// ─── Event peek popover ───────────────────────────────────────────────────────

function EventPeek({
  event, onEdit, onDelete, onClose,
}: {
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const cat = COLOR_CATEGORIES.find(c => c.value === event.color);
  const startD = new Date(event.start_at);
  const endD = new Date(event.end_at);
  const recLabel = RECURRENCE_OPTIONS.find(r => r.value === event.recurrence)?.label;
  const remLabel = REMINDER_OPTIONS.find(r => r.value === String(event.reminder_minutes ?? ""))?.label;

  return (
    <div className="w-72">
      {/* Header bar */}
      <div
        className="rounded-t-lg px-4 py-3 flex items-start justify-between gap-2"
        style={{ background: cat?.bg ?? "#dbeafe" }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: cat?.text ?? "#1e40af" }}>
            {event.title}
          </p>
          {cat && (
            <span className="text-xs font-medium mt-0.5 inline-block" style={{ color: cat.text }}>
              {cat.label}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-black/10 transition-colors mt-0.5">
          <X size={14} style={{ color: cat?.text ?? "#1e40af" }} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5 bg-popover rounded-b-lg border border-t-0 border-popover-border">
        {/* Time */}
        <div className="flex items-start gap-2.5">
          <Clock size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-foreground">
            {event.all_day ? (
              <span>All day · {format(startD, "EEE, MMM d")}</span>
            ) : (
              <>
                <div>{format(startD, "EEE, MMMM d, yyyy")}</div>
                <div className="text-muted-foreground">{format(startD, "h:mm a")} – {format(endD, "h:mm a")}</div>
              </>
            )}
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-2.5">
            <MapPin size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground">{event.location}</p>
          </div>
        )}

        {/* Recurrence */}
        {event.recurrence && event.recurrence !== "none" && (
          <div className="flex items-center gap-2.5">
            <Repeat size={13} className="text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-foreground">{recLabel}</p>
          </div>
        )}

        {/* Reminder */}
        {event.reminder_minutes != null && (
          <div className="flex items-center gap-2.5">
            <Bell size={13} className="text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-foreground">{remLabel ?? `${event.reminder_minutes}m before`}</p>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="flex items-start gap-2.5">
            <AlignLeft size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground line-clamp-4 whitespace-pre-line">{event.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <Button
            size="sm" variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 size={12} className="mr-1" /> Delete
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={onEdit}>
            <Pencil size={12} className="mr-1" /> Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const calRef = useRef<InstanceType<typeof FullCalendar>>(null);

  const { data: rawEvents = [], isLoading, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<CalendarEvent[]>("/api/calendar/events"),
  });

  const saveMutation = useMutation({
    mutationFn: ({ payload, eventId }: { payload: Omit<CalendarEvent, "id" | "created_at" | "updated_at">; eventId?: number }) =>
      apiFetch<CalendarEvent>(eventId ? `/api/calendar/events/${eventId}` : "/api/calendar/events", {
        method: eventId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/calendar/events/${id}`, { method: "DELETE" }),
  });

  const [view, setView] = useState<string>("timeGridWeek");
  const [titleLabel, setTitleLabel] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EventDraft>(() => makeDraft());
  const [peekEvent, setPeekEvent] = useState<CalendarEvent | null>(null);
  const [peekAnchor, setPeekAnchor] = useState<{ x: number; y: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [miniDate, setMiniDate] = useState(() => new Date());

  useReminders(rawEvents as CalendarEvent[]);

  // Build FullCalendar events
  const fcEvents = (rawEvents as CalendarEvent[]).map(ev => ({
    id: String(ev.id),
    title: ev.title,
    start: ev.start_at,
    end: ev.end_at,
    allDay: ev.all_day,
    backgroundColor: colorForEvent(ev),
    borderColor: colorForEvent(ev),
    textColor: "#ffffff",
    extendedProps: { raw: ev },
  }));

  // Track calendar title
  const updateTitle = () => {
    const api = calRef.current?.getApi();
    if (api) setTitleLabel(api.view.title);
  };
  useEffect(() => { updateTitle(); }, [view]);

  // ── Dialog helpers ──────────────────────────────────────────────────────────

  const openCreate = useCallback((base?: Date, allDay?: boolean) => {
    setEditingId(null);
    setDraft(makeDraft(base, allDay));
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((ev: CalendarEvent) => {
    setPeekEvent(null);
    setEditingId(ev.id);
    setDraft(draftFromEvent(ev));
    setModalOpen(true);
  }, []);

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload = {
      title: draft.title.trim(),
      start_at: normDT(draft.start, draft.allDay, false),
      end_at: normDT(draft.end, draft.allDay, true),
      all_day: draft.allDay,
      location: draft.location.trim() || null,
      description: draft.description.trim() || null,
      color: draft.color || null,
      recurrence: draft.recurrence,
      reminder_minutes: draft.reminder_minutes !== "" ? Number(draft.reminder_minutes) : null,
    };
    try {
      await saveMutation.mutateAsync({ payload, eventId: editingId ?? undefined });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setModalOpen(false);
      toast({ title: editingId ? "Event updated" : "Event created" });
    } catch (e) {
      toast({ title: "Could not save event", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setModalOpen(false);
      setPeekEvent(null);
      toast({ title: "Event deleted" });
    } catch (e) {
      toast({ title: "Could not delete event", description: (e as Error).message, variant: "destructive" });
    }
  };

  // ── FullCalendar handlers ───────────────────────────────────────────────────

  const handleSelect = (info: DateSelectArg) => {
    openCreate(new Date(info.start), info.allDay);
  };

  const handleEventClick = (info: EventClickArg) => {
    const ev = info.event.extendedProps.raw as CalendarEvent;
    const rect = info.el.getBoundingClientRect();
    setPeekAnchor({ x: rect.right + 8, y: rect.top });
    setPeekEvent(ev);
    info.jsEvent.stopPropagation();
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const ev = info.event.extendedProps.raw as CalendarEvent;
    const payload = {
      ...ev,
      start_at: format(new Date(info.event.start!), "yyyy-MM-dd'T'HH:mm:ss"),
      end_at: format(new Date(info.event.end ?? info.event.start!), "yyyy-MM-dd'T'HH:mm:ss"),
      all_day: info.event.allDay,
    };
    try {
      await saveMutation.mutateAsync({ payload, eventId: ev.id });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch {
      info.revert();
      toast({ title: "Could not move event", variant: "destructive" });
    }
  };

  const handleEventResize = async (info: EventResizeDoneArg) => {
    const ev = info.event.extendedProps.raw as CalendarEvent;
    const payload = {
      ...ev,
      start_at: format(new Date(info.event.start!), "yyyy-MM-dd'T'HH:mm:ss"),
      end_at: format(new Date(info.event.end ?? info.event.start!), "yyyy-MM-dd'T'HH:mm:ss"),
    };
    try {
      await saveMutation.mutateAsync({ payload, eventId: ev.id });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch {
      info.revert();
      toast({ title: "Could not resize event", variant: "destructive" });
    }
  };

  const navigate = (dir: "prev" | "next" | "today") => {
    const api = calRef.current?.getApi();
    if (!api) return;
    if (dir === "today") api.today();
    else if (dir === "prev") api.prev();
    else api.next();
    updateTitle();
  };

  const switchView = (v: string) => {
    const api = calRef.current?.getApi();
    if (!api) return;
    api.changeView(v);
    setView(v);
    updateTitle();
  };

  // ── Mini calendar (sidebar) ────────────────────────────────────────────────

  const MiniCalendar = () => {
    const today = new Date();
    const year = miniDate.getFullYear();
    const month = miniDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const eventDays = new Set(
      (rawEvents as CalendarEvent[]).map(ev =>
        format(new Date(ev.start_at), "yyyy-MM-dd")
      )
    );

    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div className="select-none">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setMiniDate(new Date(year, month - 1, 1))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="text-xs font-semibold text-foreground">
            {format(miniDate, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setMiniDate(new Date(year, month + 1, 1))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
          >
            <ChevronRight size={13} />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");
            const todayStr = format(today, "yyyy-MM-dd");
            const isThisToday = dateStr === todayStr;
            const hasEvents = eventDays.has(dateStr);
            return (
              <button
                key={day}
                onClick={() => {
                  const d = new Date(year, month, day);
                  const api = calRef.current?.getApi();
                  if (api) { api.gotoDate(d); updateTitle(); }
                }}
                className={`
                  relative w-7 h-7 mx-auto flex items-center justify-center rounded-full
                  text-[11px] font-medium transition-colors
                  ${isThisToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  }
                `}
              >
                {day}
                {hasEvents && !isThisToday && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Upcoming events sidebar ────────────────────────────────────────────────

  const upcoming = [...(rawEvents as CalendarEvent[])]
    .filter(ev => new Date(ev.end_at) >= new Date())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 6);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* ── Top toolbar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 gap-3 flex-shrink-0">
        {/* Left: nav + title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Toggle sidebar"
          >
            <CalendarIcon size={15} />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("prev")}
              className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => navigate("today")}
              className="px-2.5 h-7 text-xs font-medium rounded border border-border text-foreground hover:bg-accent transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigate("next")}
              className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <h1 className="text-sm font-semibold text-foreground ml-1 hidden sm:block">{titleLabel}</h1>
        </div>

        {/* Center: view switcher */}
        <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5">
          {[
            { v: "timeGridDay",  label: "Day" },
            { v: "timeGridWeek", label: "Week" },
            { v: "dayGridMonth", label: "Month" },
            { v: "listWeek",     label: "Agenda" },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`px-3 h-7 text-xs font-medium rounded-md transition-colors ${
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:bg-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
          <Button size="sm" onClick={() => openCreate()} className="h-7 gap-1.5 text-xs">
            <Plus size={13} /> New event
          </Button>
        </div>
      </div>

      {/* ── Body: sidebar + calendar ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col overflow-y-auto bg-sidebar/40 p-3 gap-5">
            {/* Mini calendar */}
            <div>
              <MiniCalendar />
            </div>

            {/* Create button */}
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium"
            >
              <Plus size={13} /> New event
            </button>

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  Upcoming
                </p>
                <div className="space-y-1.5">
                  {upcoming.map(ev => {
                    const cat = COLOR_CATEGORIES.find(c => c.value === ev.color);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => {
                          const api = calRef.current?.getApi();
                          if (api) { api.gotoDate(new Date(ev.start_at)); updateTitle(); }
                        }}
                        className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left group"
                      >
                        <span
                          className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                          style={{ background: cat?.value ?? "#2563eb" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate leading-tight">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {ev.all_day
                              ? format(new Date(ev.start_at), "MMM d")
                              : format(new Date(ev.start_at), "MMM d · h:mm a")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color legend */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                Categories
              </p>
              <div className="space-y-1">
                {COLOR_CATEGORIES.map(cat => (
                  <div key={cat.value} className="flex items-center gap-2 px-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.value }} />
                    <span className="text-[11px] text-muted-foreground">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* ── Main calendar ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden p-3">
          <FullCalendar
            ref={calRef}
            plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            height="100%"
            nowIndicator={true}
            businessHours={{ daysOfWeek: [1,2,3,4,5], startTime: "08:00", endTime: "18:00" }}
            selectable={true}
            editable={true}
            droppable={true}
            dayMaxEvents={4}
            weekNumbers={false}
            firstDay={0}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            eventMaxStack={3}
            scrollTime="08:00:00"
            allDaySlot={true}
            events={fcEvents}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            datesSet={(info) => {
              setView(info.view.type);
              setTitleLabel(info.view.title);
            }}
          />
        </div>
      </div>

      {/* ── Event peek popover ────────────────────────────────────────────── */}
      {peekEvent && peekAnchor && (
        <div
          className="fixed z-50"
          style={{
            left: Math.min(peekAnchor.x, window.innerWidth - 310),
            top: Math.max(8, Math.min(peekAnchor.y, window.innerHeight - 380)),
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="rounded-lg shadow-xl border border-popover-border animate-in fade-in zoom-in-95 duration-150">
            <EventPeek
              event={peekEvent}
              onEdit={() => openEdit(peekEvent)}
              onDelete={() => handleDelete(peekEvent.id)}
              onClose={() => setPeekEvent(null)}
            />
          </div>
        </div>
      )}
      {peekEvent && (
        <div className="fixed inset-0 z-40" onClick={() => setPeekEvent(null)} />
      )}

      {/* ── Create/Edit modal ─────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) setModalOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-primary" />
              {editingId ? "Edit event" : "New event"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Title */}
            <Input
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Add title"
              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />

            {/* All day toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={draft.allDay}
                onCheckedChange={checked => {
                  const allDay = Boolean(checked);
                  setDraft(d => ({
                    ...d, allDay,
                    start: allDay ? d.start.slice(0,10) : `${d.start.slice(0,10)}T09:00`,
                    end:   allDay ? d.end.slice(0,10)   : `${d.end.slice(0,10)}T10:00`,
                  }));
                }}
              />
              <span className="text-muted-foreground">All day</span>
            </label>

            {/* Start / End */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <Input
                  type={draft.allDay ? "date" : "datetime-local"}
                  value={draft.start}
                  onChange={e => setDraft(d => ({ ...d, start: e.target.value }))}
                  className="text-sm h-8"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <Input
                  type={draft.allDay ? "date" : "datetime-local"}
                  value={draft.end}
                  onChange={e => setDraft(d => ({ ...d, end: e.target.value }))}
                  className="text-sm h-8"
                />
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2.5">
              <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
              <Input
                value={draft.location}
                onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
                placeholder="Add location"
                className="h-8 text-sm border-0 border-b rounded-none px-0 focus-visible:ring-0"
              />
            </div>

            {/* Recurrence */}
            <div className="flex items-center gap-2.5">
              <Repeat size={14} className="text-muted-foreground flex-shrink-0" />
              <Select value={draft.recurrence} onValueChange={v => setDraft(d => ({ ...d, recurrence: v }))}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reminder */}
            <div className="flex items-center gap-2.5">
              <Bell size={14} className="text-muted-foreground flex-shrink-0" />
              <Select value={draft.reminder_minutes} onValueChange={v => setDraft(d => ({ ...d, reminder_minutes: v }))}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue placeholder="Add reminder" />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color category */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Color category</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setDraft(d => ({ ...d, color: cat.value }))}
                    title={cat.label}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      draft.color === cat.value
                        ? "ring-2 ring-offset-1 ring-offset-background scale-105"
                        : "hover:scale-105"
                    }`}
                    style={{
                      background: cat.bg,
                      color: cat.text,
                      borderColor: draft.color === cat.value ? cat.value : "transparent",
                      ringColor: cat.value,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.value }} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start gap-2.5">
              <AlignLeft size={14} className="text-muted-foreground mt-2 flex-shrink-0" />
              <Textarea
                value={draft.description}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                placeholder="Add description"
                className="min-h-[72px] text-sm border-0 border-b rounded-none px-0 focus-visible:ring-0 resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              {editingId ? (
                <Button
                  type="button" variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                  onClick={() => handleDelete(editingId)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={13} className="mr-1.5" /> Delete
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-8" onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : editingId ? "Update" : "Create event"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
