import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import CharacterCount from "@tiptap/extension-character-count";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { formatDistanceToNow } from "date-fns";
import "../styles/editor.css";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  Plus, Trash2, Search, FileText, Pin, PinOff, BookOpen,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, ListChecks, Code, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Table as TableIcon, Link as LinkIcon, Highlighter,
  Undo2, Redo2, ChevronDown, ChevronRight, Tag, X,
  Heading1, Heading2, Heading3, Type,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Note = {
  id: number; title: string; content: string | null;
  notebook_id: number | null; pinned: boolean; tags: string[];
  created_at: string; updated_at: string;
};
type Notebook = {
  id: number; name: string; color: string;
  position: number; note_count: number;
  created_at: string; updated_at: string;
};

// ─── API helper ───────────────────────────────────────────────────────────────
async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const h = new Headers(opts?.headers);
  const t = localStorage.getItem("meridian_token");
  if (t) h.set("Authorization", `Bearer ${t}`);
  if (opts?.body && !h.has("Content-Type")) h.set("Content-Type", "application/json");
  const r = await fetch(url, { ...opts, headers: h });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).detail ?? `HTTP ${r.status}`); }
  if (r.status === 204) return undefined as T;
  return r.json();
}

const NOTES_KEY     = ["notes"] as const;
const NOTEBOOKS_KEY = ["notebooks"] as const;

// ─── Slash-command extension ──────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { id: "h1",        label: "Heading 1",   sub: "Large section heading", icon: "H1", cmd: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: "h2",        label: "Heading 2",   sub: "Medium heading",         icon: "H2", cmd: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "h3",        label: "Heading 3",   sub: "Small heading",          icon: "H3", cmd: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: "bullet",    label: "Bullet list", sub: "Unordered list",         icon: "•",  cmd: (e: any) => e.chain().focus().toggleBulletList().run() },
  { id: "ordered",   label: "Numbered list",sub: "Ordered list",          icon: "1.", cmd: (e: any) => e.chain().focus().toggleOrderedList().run() },
  { id: "task",      label: "Task list",   sub: "Checklist with boxes",   icon: "☑", cmd: (e: any) => e.chain().focus().toggleTaskList().run() },
  { id: "code",      label: "Code block",  sub: "Monospace code",         icon: "</>", cmd: (e: any) => e.chain().focus().toggleCodeBlock().run() },
  { id: "quote",     label: "Quote",       sub: "Block quote",            icon: '"',  cmd: (e: any) => e.chain().focus().toggleBlockquote().run() },
  { id: "divider",   label: "Divider",     sub: "Horizontal rule",        icon: "─",  cmd: (e: any) => e.chain().focus().setHorizontalRule().run() },
  { id: "table",     label: "Table",       sub: "3×3 grid",               icon: "⊞",  cmd: (e: any) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  const btn = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    active = false,
    title?: string,
  ) => (
    <button
      key={label}
      onClick={action}
      title={title ?? label}
      className={`editor-toolbar-btn ${active ? "active" : ""}`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border/50 bg-muted/20 flex-wrap">
      {/* History */}
      {btn("Undo", <Undo2 size={13} />, () => editor.chain().focus().undo().run(), false, "Undo (Ctrl+Z)")}
      {btn("Redo", <Redo2 size={13} />, () => editor.chain().focus().redo().run(), false, "Redo (Ctrl+Y)")}
      <div className="editor-toolbar-divider mx-1" />

      {/* Headings */}
      {btn("H1", <Heading1 size={13} />, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }), "Heading 1 (Ctrl+Alt+1)")}
      {btn("H2", <Heading2 size={13} />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }), "Heading 2 (Ctrl+Alt+2)")}
      {btn("H3", <Heading3 size={13} />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }), "Heading 3 (Ctrl+Alt+3)")}
      {btn("P",  <Type      size={13} />, () => editor.chain().focus().setParagraph().run(),                editor.isActive("paragraph"), "Paragraph")}
      <div className="editor-toolbar-divider mx-1" />

      {/* Inline marks */}
      {btn("Bold",          <Bold          size={13} />, () => editor.chain().focus().toggleBold().run(),          editor.isActive("bold"),      "Bold (Ctrl+B)")}
      {btn("Italic",        <Italic        size={13} />, () => editor.chain().focus().toggleItalic().run(),        editor.isActive("italic"),    "Italic (Ctrl+I)")}
      {btn("Underline",     <UnderlineIcon size={13} />, () => editor.chain().focus().toggleUnderline().run(),     editor.isActive("underline"), "Underline (Ctrl+U)")}
      {btn("Strikethrough", <Strikethrough size={13} />, () => editor.chain().focus().toggleStrike().run(),        editor.isActive("strike"),    "Strikethrough")}
      {btn("Highlight",     <Highlighter   size={13} />, () => editor.chain().focus().toggleHighlight().run(),     editor.isActive("highlight"), "Highlight")}
      {btn("Code",          <Code          size={13} />, () => editor.chain().focus().toggleCode().run(),          editor.isActive("code"),      "Inline code")}
      <div className="editor-toolbar-divider mx-1" />

      {/* Lists */}
      {btn("Bullet list",   <List         size={13} />, () => editor.chain().focus().toggleBulletList().run(),  editor.isActive("bulletList"),  "Bullet list")}
      {btn("Ordered list",  <ListOrdered  size={13} />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"), "Ordered list")}
      {btn("Task list",     <ListChecks   size={13} />, () => editor.chain().focus().toggleTaskList().run(),    editor.isActive("taskList"),    "Task list (checkboxes)")}
      <div className="editor-toolbar-divider mx-1" />

      {/* Blocks */}
      {btn("Blockquote", <Quote    size={13} />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), "Quote")}
      {btn("Code block", <Code     size={13} />, () => editor.chain().focus().toggleCodeBlock().run(),  editor.isActive("codeBlock"),  "Code block")}
      {btn("Table",      <TableIcon size={13} />, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), false, "Insert table")}
      {btn("Divider",    <Minus    size={13} />, () => editor.chain().focus().setHorizontalRule().run(), false, "Insert divider")}
      <div className="editor-toolbar-divider mx-1" />

      {/* Alignment */}
      {btn("Left",   <AlignLeft   size={13} />, () => editor.chain().focus().setTextAlign("left").run(),   editor.isActive({ textAlign: "left"   }), "Align left")}
      {btn("Center", <AlignCenter size={13} />, () => editor.chain().focus().setTextAlign("center").run(), editor.isActive({ textAlign: "center" }), "Align center")}
      {btn("Right",  <AlignRight  size={13} />, () => editor.chain().focus().setTextAlign("right").run(),  editor.isActive({ textAlign: "right"  }), "Align right")}
    </div>
  );
}

// ─── Slash command menu component ─────────────────────────────────────────────
function SlashMenu({
  items, activeIdx, onSelect, style,
}: {
  items: typeof SLASH_COMMANDS;
  activeIdx: number;
  onSelect: (item: typeof SLASH_COMMANDS[0]) => void;
  style: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelectorAll(".slash-menu-item")[activeIdx] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <div ref={ref} className="slash-menu fixed z-50" style={style}>
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`slash-menu-item ${i === activeIdx ? "active" : ""}`}
          onMouseDown={e => { e.preventDefault(); onSelect(item); }}
        >
          <span className="slash-menu-item-icon">{item.icon}</span>
          <div>
            <div className="label">{item.label}</div>
            <div className="sub">{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Note list item ────────────────────────────────────────────────────────────
function NoteItem({
  note, selected, onSelect, onDelete, onPin,
}: {
  note: Note; selected: boolean;
  onSelect: () => void; onDelete: () => void; onPin: () => void;
}) {
  // Extract plain text preview from Tiptap JSON
  const preview = (() => {
    if (!note.content) return "No content";
    try {
      const doc = JSON.parse(note.content);
      const texts: string[] = [];
      const walk = (node: any) => {
        if (node.text) texts.push(node.text);
        if (node.content) node.content.forEach(walk);
      };
      if (doc.content) doc.content.forEach(walk);
      return texts.join(" ").slice(0, 80) || "No content";
    } catch { return note.content.replace(/<[^>]+>/g, "").slice(0, 80); }
  })();

  return (
    <div
      data-testid={`item-note-${note.id}`}
      onClick={onSelect}
      className={`group relative px-4 py-3 cursor-pointer transition-colors border-l-2 ${
        selected ? "bg-accent/40 border-l-primary" : "border-l-transparent hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start gap-1.5 pr-14">
        {note.pinned && <Pin size={10} className="text-primary mt-1 flex-shrink-0" />}
        <p className="text-[13px] font-medium text-foreground truncate leading-tight">{note.title || "Untitled"}</p>
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">{preview}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-[10px] text-muted-foreground/50">
          {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
        </p>
        {note.tags.slice(0, 2).map(tag => (
          <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-primary/8 text-primary rounded-full font-medium">
            {tag}
          </span>
        ))}
      </div>
      {/* Hover actions */}
      <div className="absolute right-2 top-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onPin(); }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
          title={note.pinned ? "Unpin" : "Pin to top"}
        >
          {note.pinned ? <PinOff size={11} className="text-primary" /> : <Pin size={11} className="text-muted-foreground" />}
        </button>
        <button
          data-testid={`button-delete-note-${note.id}`}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
          title="Delete note"
        >
          <Trash2 size={11} className="text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const addTag = () => {
    const t = input.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          {tag}
          <button onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:text-destructive">
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        className="text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40 w-20 min-w-0"
      />
    </div>
  );
}

// ─── Main Notes page ──────────────────────────────────────────────────────────
export default function Notes() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // ── Server state ──────────────────────────────────────────────────────────
  const { data: notes = [] } = useQuery({
    queryKey: NOTES_KEY,
    queryFn: () => api<Note[]>("/api/notes"),
  });
  const { data: notebooks = [] } = useQuery({
    queryKey: NOTEBOOKS_KEY,
    queryFn: () => api<Notebook[]>("/api/notes/notebooks"),
  });

  const createNote = useMutation({
    mutationFn: (d: Partial<Note>) => api<Note>("/api/notes", { method: "POST", body: JSON.stringify({ title: "Untitled", ...d }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
  const updateNote = useMutation({
    mutationFn: ({ id, ...d }: Partial<Note> & { id: number }) =>
      api<Note>(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
  const deleteNote = useMutation({
    mutationFn: (id: number) => api(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
  const createNotebook = useMutation({
    mutationFn: (name: string) => api<Notebook>("/api/notes/notebooks", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTEBOOKS_KEY }),
  });
  const deleteNotebook = useMutation({
    mutationFn: (id: number) => api(`/api/notes/notebooks/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: NOTEBOOKS_KEY }); qc.invalidateQueries({ queryKey: NOTES_KEY }); },
  });

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [selectedId,       setSelectedId]       = useState<number | null>(null);
  const [activeNotebook,   setActiveNotebook]   = useState<number | null>(null);
  const [search,           setSearch]           = useState("");
  const [localTitle,       setLocalTitle]       = useState("");
  const [localTags,        setLocalTags]        = useState<string[]>([]);
  const [saving,           setSaving]           = useState(false);
  const [notebooksOpen,    setNotebooksOpen]    = useState(true);
  const [newNotebookInput, setNewNotebookInput] = useState("");
  const [showNotebookForm, setShowNotebookForm] = useState(false);
  const [slashMenu,        setSlashMenu]        = useState<{ visible: boolean; x: number; y: number; query: string; idx: number }>({
    visible: false, x: 0, y: 0, query: "", idx: 0,
  });

  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef      = useRef<HTMLInputElement>(null);
  const selectedNote  = (notes as Note[]).find(n => n.id === selectedId) ?? null;

  // ── Tiptap editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      Placeholder.configure({ placeholder: "Start writing… type / for commands" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Link.configure({ openOnClick: true, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
    ],
    content: "",
    editorProps: {
      attributes: { class: "prosemirror-content" },
      handleKeyDown: (_view, event) => {
        // Slash command
        if (event.key === "/" && !slashMenu.visible) {
          // Will be handled by onUpdate to check for slash
          return false;
        }
        if (slashMenu.visible) {
          if (event.key === "ArrowDown") {
            setSlashMenu(m => ({ ...m, idx: Math.min(m.idx + 1, slashFiltered.length - 1) }));
            return true;
          }
          if (event.key === "ArrowUp") {
            setSlashMenu(m => ({ ...m, idx: Math.max(m.idx - 1, 0) }));
            return true;
          }
          if (event.key === "Enter") {
            handleSlashSelect(slashFiltered[slashMenu.idx]);
            return true;
          }
          if (event.key === "Escape") {
            setSlashMenu(m => ({ ...m, visible: false }));
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      // Detect slash command
      const { from } = e.state.selection;
      const text = e.state.doc.textBetween(Math.max(0, from - 30), from, "\n");
      const slashIdx = text.lastIndexOf("/");
      if (slashIdx !== -1) {
        const query = text.slice(slashIdx + 1);
        if (!/\s/.test(query)) {
          const coords = e.view.coordsAtPos(from);
          setSlashMenu(m => ({ ...m, visible: true, x: coords.left, y: coords.bottom + 4, query, idx: 0 }));
        } else {
          setSlashMenu(m => ({ ...m, visible: false }));
        }
      } else {
        setSlashMenu(m => ({ ...m, visible: false }));
      }

      // Auto-save
      if (!selectedId) return;
      setSaving(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await updateNote.mutateAsync({ id: selectedId, content: JSON.stringify(e.getJSON()) });
        setSaving(false);
      }, 600);
    },
  });

  const slashFiltered = slashMenu.query
    ? SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashMenu.query.toLowerCase()))
    : SLASH_COMMANDS;

  const handleSlashSelect = useCallback((item: typeof SLASH_COMMANDS[0]) => {
    if (!editor) return;
    setSlashMenu(m => ({ ...m, visible: false }));
    // Delete the "/query" text then run command
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 30), from, "\n");
    const slashPos = text.lastIndexOf("/");
    if (slashPos !== -1) {
      const deleteLen = text.length - slashPos;
      editor.chain().focus().deleteRange({ from: from - deleteLen, to: from }).run();
    }
    item.cmd(editor);
  }, [editor, slashMenu]);

  // ── Load note into editor ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedNote || !editor) return;
    setLocalTitle(selectedNote.title ?? "");
    setLocalTags(selectedNote.tags ?? []);
    try {
      const json = selectedNote.content ? JSON.parse(selectedNote.content) : { type: "doc", content: [] };
      editor.commands.setContent(json, false);
    } catch {
      editor.commands.setContent(selectedNote.content ?? "", false);
    }
  }, [selectedId]); // only re-seed on note switch

  // ── Title save (debounced) ─────────────────────────────────────────────────
  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    if (!selectedId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await updateNote.mutateAsync({ id: selectedId, title: val });
    }, 500);
  };

  // ── Tags save (immediate) ──────────────────────────────────────────────────
  const handleTagsChange = async (tags: string[]) => {
    setLocalTags(tags);
    if (selectedId) await updateNote.mutateAsync({ id: selectedId, tags });
  };

  // ── Create note ────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    const note = await createNote.mutateAsync({ notebook_id: activeNotebook ?? undefined });
    setSelectedId(note.id);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [createNote, activeNotebook]);

  // ── Pin toggle ─────────────────────────────────────────────────────────────
  const handlePin = async (note: Note) => {
    await updateNote.mutateAsync({ id: note.id, pinned: !note.pinned });
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (noteId: number) => {
    await deleteNote.mutateAsync(noteId);
    if (selectedId === noteId) { setSelectedId(null); editor?.commands.setContent(""); }
    toast({ title: "Note deleted" });
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useKeyboardShortcuts([
    { key: "n", meta: true, handler: handleCreate, description: "New note" },
  ]);

  // ── Filtered notes ─────────────────────────────────────────────────────────
  const filtered = (notes as Note[]).filter(n => {
    if (activeNotebook !== null && n.notebook_id !== activeNotebook) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      (n.content?.toLowerCase().includes(q)) ||
      n.tags.some(t => t.includes(q))
    );
  });

  const wordCount = editor?.storage.characterCount?.words() ?? 0;
  const charCount = editor?.storage.characterCount?.characters() ?? 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex h-full overflow-hidden">

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 border-r border-border flex flex-col bg-sidebar/30 overflow-hidden">

        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</span>
          <button
            data-testid="button-create-note"
            onClick={handleCreate}
            disabled={createNote.isPending}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="New note (⌘N)"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5">
            <Search size={11} className="text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 flex-1 min-w-0"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Notebooks section */}
        <div className="flex-shrink-0 border-b border-border/60">
          <button
            onClick={() => setNotebooksOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BookOpen size={10} />Notebooks
            </span>
            {notebooksOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>

          {notebooksOpen && (
            <div className="pb-1 px-2">
              {/* All notes */}
              <button
                onClick={() => setActiveNotebook(null)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  activeNotebook === null ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <FileText size={11} />
                <span className="flex-1 text-left">All notes</span>
                <span className="text-[10px] font-mono">{(notes as Note[]).length}</span>
              </button>

              {/* Notebook list */}
              {(notebooks as Notebook[]).map(nb => (
                <div key={nb.id} className="group/nb relative">
                  <button
                    onClick={() => setActiveNotebook(nb.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      activeNotebook === nb.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: nb.color }} />
                    <span className="flex-1 text-left truncate">{nb.name}</span>
                    <span className="text-[10px] font-mono opacity-60">{nb.note_count}</span>
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete notebook "${nb.name}"?`)) deleteNotebook.mutate(nb.id); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/nb:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}

              {/* New notebook */}
              {showNotebookForm ? (
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <input
                    value={newNotebookInput}
                    onChange={e => setNewNotebookInput(e.target.value)}
                    placeholder="Notebook name"
                    autoFocus
                    className="flex-1 text-xs bg-transparent border-b border-primary outline-none text-foreground"
                    onKeyDown={async e => {
                      if (e.key === "Enter") {
                        if (newNotebookInput.trim()) await createNotebook.mutateAsync(newNotebookInput.trim());
                        setNewNotebookInput(""); setShowNotebookForm(false);
                      }
                      if (e.key === "Escape") { setShowNotebookForm(false); setNewNotebookInput(""); }
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowNotebookForm(true)}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus size={9} /> New notebook
                </button>
              )}
            </div>
          )}
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
              <FileText size={22} className="text-muted-foreground/25" />
              <p className="text-xs text-muted-foreground">{search ? "No results" : "No notes yet"}</p>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map(n => (
                <NoteItem
                  key={n.id}
                  note={n}
                  selected={selectedId === n.id}
                  onSelect={() => setSelectedId(n.id)}
                  onDelete={() => handleDelete(n.id)}
                  onPin={() => handlePin(n)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border/60 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground/50">
            {(notes as Note[]).length} note{(notes as Note[]).length !== 1 ? "s" : ""} ·{" "}
            <kbd className="font-mono">⌘N</kbd> new
          </p>
        </div>
      </aside>

      {/* ── Editor panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <FileText size={28} className="text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Select a note</p>
              <p className="text-xs text-muted-foreground mt-1">Or create a new one to start writing</p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <Plus size={14} /> New note
            </button>
          </div>
        ) : (
          <>
            {/* ── Formatting toolbar — sticky at top ───────────────────────── */}
            <div className="flex-shrink-0 bg-card border-b border-border/60 shadow-sm">
              <Toolbar editor={editor} />
            </div>

            {/* ── Scrollable canvas — OneNote page-in-page ─────────────────── */}
            <div
              className="flex-1 overflow-y-auto bg-muted/20 px-6 py-8"
              onClick={(e) => { if (e.target === e.currentTarget) editor?.commands.focus(); }}
            >
              <div className="max-w-3xl mx-auto animate-page-in">
                {/* Page card */}
                <div className="bg-card rounded-xl shadow-lg overflow-hidden border border-border/40">

                  {/* Title + metadata */}
                  <div className="px-10 pt-8 pb-5 border-b border-border/40">
                    <input
                      ref={titleRef}
                      data-testid="input-note-title"
                      value={localTitle}
                      onChange={e => handleTitleChange(e.target.value)}
                      placeholder="Untitled"
                      className="w-full text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/25 leading-tight"
                      onKeyDown={e => e.key === "Enter" && editor?.commands.focus()}
                    />

                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      {selectedNote?.notebook_id && (
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <BookOpen size={10} />
                          {(notebooks as Notebook[]).find(nb => nb.id === selectedNote?.notebook_id)?.name ?? "Notebook"}
                        </span>
                      )}
                      <button
                        onClick={() => selectedNote && handlePin(selectedNote)}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${
                          selectedNote?.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Pin size={10} />
                        {selectedNote?.pinned ? "Pinned" : "Pin"}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Tag size={10} className="text-muted-foreground" />
                        <TagInput tags={localTags} onChange={handleTagsChange} />
                      </div>
                      <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground/50">
                        {saving && <span className="animate-pulse text-muted-foreground">Saving…</span>}
                        <span>{wordCount} words · {charCount} chars</span>
                      </div>
                    </div>
                  </div>

                  {/* Editor content */}
                  <div className="tiptap-editor" onClick={() => editor?.commands.focus()}>
                    <EditorContent editor={editor} />
                  </div>
                </div>

                {/* Spacer so last line doesn't hug bottom */}
                <div className="h-16" />
              </div>
            </div>

            {/* ── Status bar ───────────────────────────────────────────────── */}
            <div className="flex-shrink-0 px-5 py-1.5 border-t border-border/40 bg-muted/10 flex items-center gap-4 text-[10px] text-muted-foreground/50">
              <span>
                {selectedNote && formatDistanceToNow(new Date(selectedNote.updated_at), { addSuffix: true })}
              </span>
              <span className="ml-auto">
                / for commands · Ctrl+Z undo · Ctrl+B bold · Ctrl+I italic
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Slash command menu ─────────────────────────────────────────────── */}
      {slashMenu.visible && slashFiltered.length > 0 && (
        <SlashMenu
          items={slashFiltered}
          activeIdx={slashMenu.idx}
          onSelect={handleSlashSelect}
          style={{ left: slashMenu.x, top: slashMenu.y }}
        />
      )}
      {slashMenu.visible && (
        <div className="fixed inset-0 z-40" onClick={() => setSlashMenu(m => ({ ...m, visible: false }))} />
      )}
    </div>
  );
}
