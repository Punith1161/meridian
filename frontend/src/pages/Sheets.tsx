import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { Plus, Trash2, Table2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
}

interface SheetData {
  cols: string[];
  rows: (string | null)[][];
  formats?: Record<string, CellFormat>;
}

interface Sheet {
  id: number;
  name: string;
  data: SheetData;
  created_at: string;
  updated_at: string;
}

interface SelectedCell {
  row: number;
  col: number;
}

function colLabel(n: number): string {
  let result = "";
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function makeCellKey(row: number, col: number) { return `${row}:${col}`; }

const DEFAULT_COLS = 8;
const DEFAULT_ROWS = 20;

function makeDefault(): SheetData {
  return {
    cols: Array.from({ length: DEFAULT_COLS }, (_, i) => colLabel(i)),
    rows: Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill("")),
    formats: {},
  };
}

export default function Sheets() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId]         = useState<number | null>(null);
  const [localName, setLocalName]           = useState("");
  const [localData, setLocalData]           = useState<SheetData>(makeDefault());
  const [selected, setSelected]             = useState<SelectedCell | null>(null);
  const [editing, setEditing]               = useState(false);
  const [editValue, setEditValue]           = useState("");
  const [formulaBarValue, setFormulaBarValue] = useState("");
  const [saving, setSaving]                 = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef    = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const nameRef    = useRef<HTMLInputElement>(null);

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ["sheets"],
    queryFn: () => api.get("/sheets"),
  });

  const createSheet = useMutation({
    mutationFn: (data: { name: string }) => api.post<Sheet>("/sheets", data),
    onSuccess: (s) => { qc.invalidateQueries({ queryKey: ["sheets"] }); setSelectedId(s.id); },
  });

  const deleteSheetMut = useMutation({
    mutationFn: (id: number) => api.delete(`/sheets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sheets"] }),
  });

  const updateSheet = useMutation({
    mutationFn: ({ id, name, data }: { id: number; name: string; data: SheetData }) =>
      api.put<Sheet>(`/sheets/${id}`, { name, data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sheets"] });
      qc.invalidateQueries({ queryKey: ["sheet", selectedId] });
      setSaving(false);
    },
  });

  const { data: sheet } = useQuery<Sheet>({
    queryKey: ["sheet", selectedId],
    queryFn: () => api.get(`/sheets/${selectedId}`),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (sheet) {
      setLocalName(sheet.name);
      const raw = sheet.data as SheetData;
      if (raw) {
        setLocalData({
          cols: raw.cols,
          rows: raw.rows.map((row) =>
            row.length < raw.cols.length ? [...row, ...Array(raw.cols.length - row.length).fill("")] : row
          ),
          formats: raw.formats ?? {},
        });
      } else {
        setLocalData(makeDefault());
      }
    }
  }, [sheet]);

  const scheduleUpdate = useCallback((name: string, data: SheetData) => {
    if (!selectedId) return;
    setSaving(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSheet.mutate({ id: selectedId, name, data });
    }, 1200);
  }, [selectedId, updateSheet]);

  const handleCreate = () => createSheet.mutate({ name: "Sheet 1" });

  const handleDelete = async (sheetId: number) => {
    if (deleteConfirm === sheetId) {
      await deleteSheetMut.mutateAsync(sheetId);
      if (selectedId === sheetId) setSelectedId(null);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sheetId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const getCellValue  = (row: number, col: number) => String(localData.rows[row]?.[col] ?? "");
  const getCellFormat = (row: number, col: number): CellFormat => localData.formats?.[makeCellKey(row, col)] ?? {};

  const setCellValue = (row: number, col: number, value: string) => {
    const newRows = localData.rows.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? value : c) : r);
    const newData = { ...localData, rows: newRows };
    setLocalData(newData);
    scheduleUpdate(localName, newData);
  };

  const toggleFormat = (key: keyof CellFormat, value?: unknown) => {
    if (!selected) return;
    const { row, col } = selected;
    const ck = makeCellKey(row, col);
    const current = getCellFormat(row, col);
    const updated: CellFormat = { ...current, [key]: value !== undefined ? value : !current[key as keyof typeof current] };
    const newData = { ...localData, formats: { ...localData.formats, [ck]: updated } };
    setLocalData(newData);
    scheduleUpdate(localName, newData);
  };

  const addRow = () => {
    const newData = { ...localData, rows: [...localData.rows, Array(localData.cols.length).fill("")] };
    setLocalData(newData); scheduleUpdate(localName, newData);
  };

  const addColumn = () => {
    const newData = { ...localData, cols: [...localData.cols, colLabel(localData.cols.length)], rows: localData.rows.map((r) => [...r, ""]) };
    setLocalData(newData); scheduleUpdate(localName, newData);
  };

  const deleteRow = () => {
    if (!selected || localData.rows.length <= 1) return;
    const newRows = localData.rows.filter((_, i) => i !== selected.row);
    const newData = { ...localData, rows: newRows };
    setLocalData(newData);
    if (selected.row >= newRows.length) setSelected({ row: newRows.length - 1, col: selected.col });
    scheduleUpdate(localName, newData);
  };

  const exportCSV = () => {
    const csv = [localData.cols.join(","), ...localData.rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${localName || "sheet"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const startEditing = (row: number, col: number) => {
    setSelected({ row, col }); setEditing(true);
    const val = getCellValue(row, col);
    setEditValue(val); setFormulaBarValue(val);
    setTimeout(() => editInputRef.current?.focus(), 10);
  };

  const commitEdit = () => {
    if (!selected || !editing) return;
    setCellValue(selected.row, selected.col, editValue);
    setEditing(false);
  };

  const handleFormulaBarChange = (val: string) => {
    setFormulaBarValue(val); setEditValue(val);
    if (selected && !editing) setCellValue(selected.row, selected.col, val);
  };

  const handleFormulaBarKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (selected) {
        setCellValue(selected.row, selected.col, formulaBarValue);
        setEditing(false);
        const next = { row: Math.min(selected.row + 1, localData.rows.length - 1), col: selected.col };
        setSelected(next); setFormulaBarValue(getCellValue(next.row, next.col));
      }
    }
    if (e.key === "Escape") { setFormulaBarValue(selected ? getCellValue(selected.row, selected.col) : ""); setEditing(false); }
  };

  const handleCellKeyDown = (e: KeyboardEvent<HTMLDivElement>, row: number, col: number) => {
    if (editing) return;
    const move = (dr: number, dc: number) => {
      const nr = Math.max(0, Math.min(row + dr, localData.rows.length - 1));
      const nc = Math.max(0, Math.min(col + dc, localData.cols.length - 1));
      setSelected({ row: nr, col: nc }); setFormulaBarValue(getCellValue(nr, nc));
    };
    if (e.key === "ArrowDown")  { e.preventDefault(); move(1, 0); }
    if (e.key === "ArrowUp")    { e.preventDefault(); move(-1, 0); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); move(0, -1); }
    if (e.key === "ArrowRight") { e.preventDefault(); move(0, 1); }
    if (e.key === "Tab")   { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); }
    if (e.key === "Enter") { e.preventDefault(); if (e.shiftKey) move(-1, 0); else startEditing(row, col); }
    if (e.key === "Delete" || e.key === "Backspace") { setCellValue(row, col, ""); setFormulaBarValue(""); }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      setEditValue(e.key); setFormulaBarValue(e.key); setEditing(true);
      setTimeout(() => editInputRef.current?.focus(), 10);
    }
  };

  useKeyboardShortcuts([
    { key: "b", meta: true, handler: () => toggleFormat("bold"),   description: "Bold" },
    { key: "i", meta: true, handler: () => toggleFormat("italic"), description: "Italic" },
  ]);

  const currentFormat = selected ? getCellFormat(selected.row, selected.col) : {};
  const selectedLabel = selected ? `${localData.cols[selected.col]}${selected.row + 1}` : "";

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-border flex flex-col bg-sidebar/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sheets</span>
          <button
            onClick={handleCreate}
            disabled={createSheet.isPending}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {sheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
              <Table2 size={24} className="text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No sheets yet</p>
            </div>
          ) : sheets.map((s) => (
            <div
              key={s.id}
              onClick={() => { setSelectedId(s.id); setSelected(null); setEditing(false); }}
              className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors border-l-2 ${
                selectedId === s.id ? "bg-accent/40 border-l-primary" : "border-l-transparent hover:bg-muted/40"
              }`}
            >
              <span className="text-[13px] font-medium text-foreground truncate">{s.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                className={`p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 ${
                  deleteConfirm === s.id ? "text-destructive bg-destructive/10 opacity-100" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                }`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Table2 size={28} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No sheet selected</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a sheet or create a new one</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCreate}>
              <Plus size={14} className="mr-1.5" />New sheet
            </Button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-muted/20">
              <Input
                ref={nameRef}
                value={localName}
                onChange={(e) => { setLocalName(e.target.value); scheduleUpdate(e.target.value, localData); }}
                className="h-7 w-36 text-sm font-medium border-transparent bg-transparent focus:border-border"
              />
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={() => toggleFormat("bold")} className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors text-sm font-bold ${currentFormat.bold ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`} title="Bold (⌘B)">
                <Bold size={13} />
              </button>
              <button onClick={() => toggleFormat("italic")} className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${currentFormat.italic ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`} title="Italic (⌘I)">
                <Italic size={13} />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={() => toggleFormat("align", "left")}   className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${currentFormat.align === "left"   ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}><AlignLeft size={13} /></button>
              <button onClick={() => toggleFormat("align", "center")} className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${currentFormat.align === "center" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}><AlignCenter size={13} /></button>
              <button onClick={() => toggleFormat("align", "right")}  className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${currentFormat.align === "right"  ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}><AlignRight size={13} /></button>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={addRow}    className="h-7 px-2 flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Plus size={11} />Row</button>
              <button onClick={addColumn} className="h-7 px-2 flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Plus size={11} />Col</button>
              <button onClick={deleteRow} disabled={!selected} className="h-7 px-2 flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"><Trash2 size={11} />Row</button>
              <div className="flex-1" />
              {saving && <span className="text-[11px] text-muted-foreground animate-pulse">Saving…</span>}
              <button onClick={exportCSV} className="h-7 px-2 flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Download size={11} />CSV</button>
            </div>

            {/* Formula bar */}
            <div className="flex items-center gap-0 border-b border-border bg-background">
              <div className="w-20 px-3 py-1.5 text-xs font-mono text-muted-foreground border-r border-border bg-muted/30 flex-shrink-0 text-center">
                {selectedLabel || "—"}
              </div>
              <div className="flex items-center flex-1 px-3">
                <span className="text-xs text-muted-foreground mr-2 font-mono">fx</span>
                <input
                  value={formulaBarValue}
                  onChange={(e) => handleFormulaBarChange(e.target.value)}
                  onKeyDown={handleFormulaBarKeyDown}
                  placeholder={selected ? "Enter value…" : "Select a cell"}
                  disabled={!selected}
                  className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 py-1.5 font-mono"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto" ref={gridRef}>
              <table className="border-collapse w-max min-w-full select-none">
                <colgroup>
                  <col className="w-12" />
                  {localData.cols.map((_, ci) => <col key={ci} style={{ minWidth: "100px", width: "120px" }} />)}
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="h-7 border-r border-b border-border bg-muted/60 text-center text-[10px] text-muted-foreground/60 font-medium" />
                    {localData.cols.map((col, ci) => (
                      <th key={ci} className={`h-7 border-r border-b border-border bg-muted/60 text-center text-[11px] font-semibold px-1 transition-colors ${selected?.col === ci ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {localData.rows.map((row, ri) => (
                    <tr key={ri} className="group/row">
                      <td className={`h-7 border-r border-b border-border/50 text-center text-[10px] font-mono px-1 transition-colors sticky left-0 z-10 ${selected?.row === ri ? "bg-primary/10 text-primary font-semibold" : "bg-muted/30 text-muted-foreground/60"}`}>
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => {
                        const isSelected = selected?.row === ri && selected?.col === ci;
                        const isEditing  = isSelected && editing;
                        const fmt = getCellFormat(ri, ci);
                        return (
                          <td
                            key={ci}
                            tabIndex={0}
                            className={`relative h-7 border-r border-b border-border/50 text-[12px] outline-none transition-colors cursor-default ${
                              isSelected ? "ring-2 ring-inset ring-primary z-10 bg-background" : "hover:bg-muted/30 focus:ring-2 focus:ring-inset focus:ring-primary/60"
                            } ${selected?.col === ci && !isSelected ? "bg-primary/5" : ""} ${selected?.row === ri && !isSelected ? "bg-primary/5" : ""}`}
                            onClick={() => { setSelected({ row: ri, col: ci }); setFormulaBarValue(getCellValue(ri, ci)); setEditing(false); }}
                            onDoubleClick={() => startEditing(ri, ci)}
                            onKeyDown={(e) => handleCellKeyDown(e, ri, ci)}
                          >
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                value={editValue}
                                onChange={(e) => { setEditValue(e.target.value); setFormulaBarValue(e.target.value); }}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")  { e.preventDefault(); commitEdit(); const n = { row: Math.min(ri + 1, localData.rows.length - 1), col: ci }; setSelected(n); setFormulaBarValue(getCellValue(n.row, n.col)); }
                                  if (e.key === "Escape") { setEditing(false); setEditValue(getCellValue(ri, ci)); setFormulaBarValue(getCellValue(ri, ci)); }
                                  if (e.key === "Tab")    { e.preventDefault(); commitEdit(); const n = { row: ri, col: Math.min(ci + 1, localData.cols.length - 1) }; setSelected(n); setFormulaBarValue(getCellValue(n.row, n.col)); }
                                }}
                                className="absolute inset-0 w-full h-full bg-background px-2 outline-none text-[12px] text-foreground font-mono border-0"
                                style={{ fontWeight: fmt.bold ? "bold" : "normal", fontStyle: fmt.italic ? "italic" : "normal", textAlign: fmt.align ?? "left" }}
                              />
                            ) : (
                              <div
                                className="h-full px-2 flex items-center overflow-hidden"
                                style={{ fontWeight: fmt.bold ? "bold" : "normal", fontStyle: fmt.italic ? "italic" : "normal", justifyContent: fmt.align === "center" ? "center" : fmt.align === "right" ? "flex-end" : "flex-start" }}
                              >
                                <span className="truncate text-foreground font-mono">{String(cell ?? "")}</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-4 px-4 py-1.5 border-t border-border/60 bg-muted/20 text-[10px] text-muted-foreground/70">
              <span>{localData.rows.length} rows × {localData.cols.length} cols</span>
              {selected && <span>Selected: {selectedLabel}</span>}
              <span className="ml-auto flex gap-3">
                <span><kbd className="font-mono">Enter</kbd> edit</span>
                <span><kbd className="font-mono">Tab</kbd> next col</span>
                <span><kbd className="font-mono">↑↓←→</kbd> navigate</span>
                <span><kbd className="font-mono">⌘B</kbd> bold</span>
                <span><kbd className="font-mono">Del</kbd> clear</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
