import { useState, useEffect, useRef, useCallback, useMemo, KeyboardEvent } from "react";
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

// ─── Formula engine ────────────────────────────────────────────────────────────
function colLabelToIndex(label: string): number {
  let n = 0;
  for (let i = 0; i < label.length; i++) n = n * 26 + (label.charCodeAt(i) - 64);
  return n - 1;
}

function roundNum(n: number): number { return Math.round(n * 1e10) / 1e10; }

function evaluateFormula(raw: string, data: SheetData, depth = 0): string | number {
  if (!raw || !raw.startsWith("=")) return raw ?? "";
  if (depth > 10) return "#REF!";
  const expr = raw.slice(1).trim().toUpperCase();

  const cellVal = (ref: string): number | string => {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) return 0;
    const c = colLabelToIndex(m[1]);
    const r = parseInt(m[2]) - 1;
    const v = String(data.rows[r]?.[c] ?? "");
    if (v === "") return 0;
    const ev = v.startsWith("=") ? evaluateFormula(v, data, depth + 1) : v;
    const n = parseFloat(String(ev));
    return isNaN(n) ? String(ev) : n;
  };

  const rangeNums = (range: string): number[] => {
    if (!range.includes(":")) { const v = cellVal(range); return typeof v === "number" ? [v] : []; }
    const [s, e] = range.split(":");
    const sm = s.match(/^([A-Z]+)(\d+)$/), em = e.match(/^([A-Z]+)(\d+)$/);
    if (!sm || !em) return [];
    const sc = colLabelToIndex(sm[1]), ec = colLabelToIndex(em[1]);
    const sr = parseInt(sm[2]) - 1, er = parseInt(em[2]) - 1;
    const nums: number[] = [];
    for (let r = sr; r <= er; r++) {
      for (let c = sc; c <= ec; c++) {
        const v = String(data.rows[r]?.[c] ?? "");
        if (v !== "") { const n = parseFloat(v); if (!isNaN(n)) nums.push(n); }
      }
    }
    return nums;
  };

  try {
    let m: RegExpMatchArray | null;
    if ((m = expr.match(/^SUM\(([^)]+)\)$/)))     { const ns = rangeNums(m[1]); return roundNum(ns.reduce((a, b) => a + b, 0)); }
    if ((m = expr.match(/^AVERAGE\(([^)]+)\)$/))) { const ns = rangeNums(m[1]); return ns.length ? roundNum(ns.reduce((a,b)=>a+b,0)/ns.length) : 0; }
    if ((m = expr.match(/^COUNT\(([^)]+)\)$/)))   { return rangeNums(m[1]).length; }
    if ((m = expr.match(/^MAX\(([^)]+)\)$/)))     { const ns = rangeNums(m[1]); return ns.length ? Math.max(...ns) : 0; }
    if ((m = expr.match(/^MIN\(([^)]+)\)$/)))     { const ns = rangeNums(m[1]); return ns.length ? Math.min(...ns) : 0; }
    if ((m = expr.match(/^([A-Z]+\d+)$/)))        return cellVal(m[1]);
    const evStr = expr.replace(/([A-Z]+\d+)/g, (ref) => String(cellVal(ref)));
    // eslint-disable-next-line no-new-func
    const res = new Function('"use strict"; return (' + evStr + ")")();
    if (typeof res === "number") return isFinite(res) ? roundNum(res) : "#DIV/0!";
    return res;
  } catch { return "#ERROR!"; }
}

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
  const [rangeEnd, setRangeEnd]             = useState<SelectedCell | null>(null);
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
    mutationFn: (payload: { name: string; data?: SheetData }) => api.post<Sheet>("/sheets", payload),
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

  // ── Display value (evaluates formulas for rendering) ─────────────────────
  const getDisplayValue = useCallback((row: number, col: number): string => {
    const raw = String(localData.rows[row]?.[col] ?? "");
    if (raw.startsWith("=")) return String(evaluateFormula(raw, localData));
    return raw;
  }, [localData]);

  // ── Range helpers ─────────────────────────────────────────────────────────
  const isInRange = useCallback((row: number, col: number): boolean => {
    if (!selected || !rangeEnd) return false;
    const r1 = Math.min(selected.row, rangeEnd.row), r2 = Math.max(selected.row, rangeEnd.row);
    const c1 = Math.min(selected.col, rangeEnd.col), c2 = Math.max(selected.col, rangeEnd.col);
    return row >= r1 && row <= r2 && col >= c1 && col <= c2;
  }, [selected, rangeEnd]);

  // ── Selection stats for status bar ───────────────────────────────────────
  const selectionStats = useMemo(() => {
    if (!selected) return null;
    const end = rangeEnd ?? selected;
    const r1 = Math.min(selected.row, end.row), r2 = Math.max(selected.row, end.row);
    const c1 = Math.min(selected.col, end.col), c2 = Math.max(selected.col, end.col);
    const nums: number[] = [];
    let nonEmpty = 0;
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const raw = String(localData.rows[r]?.[c] ?? "");
        if (raw === "") continue;
        nonEmpty++;
        const displayed = raw.startsWith("=") ? evaluateFormula(raw, localData) : raw;
        const n = parseFloat(String(displayed));
        if (!isNaN(n)) nums.push(n);
      }
    }
    const cellCount = (r2 - r1 + 1) * (c2 - c1 + 1);
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      cellCount,
      nonEmpty,
      numCount: nums.length,
      sum: roundNum(sum),
      avg: nums.length ? roundNum(sum / nums.length) : 0,
      hasRange: cellCount > 1,
    };
  }, [selected, rangeEnd, localData]);

  const rangeLabel = useMemo(() => {
    if (!selected) return "";
    const singleLabel = `${localData.cols[selected.col]}${selected.row + 1}`;
    if (!rangeEnd || (rangeEnd.row === selected.row && rangeEnd.col === selected.col)) return singleLabel;
    const c1 = Math.min(selected.col, rangeEnd.col), c2 = Math.max(selected.col, rangeEnd.col);
    const r1 = Math.min(selected.row, rangeEnd.row), r2 = Math.max(selected.row, rangeEnd.row);
    return `${localData.cols[c1]}${r1 + 1}:${localData.cols[c2]}${r2 + 1}`;
  }, [selected, rangeEnd, localData.cols]);

  const handleCreate = () => createSheet.mutate({ name: "Sheet 1", data: makeDefault() });

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
    setSelected({ row, col }); setRangeEnd(null); setEditing(true);
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
      setSelected({ row: nr, col: nc }); setRangeEnd(null); setFormulaBarValue(getCellValue(nr, nc));
    };
    const extendRange = (dr: number, dc: number) => {
      const end = rangeEnd ?? selected!;
      const nr = Math.max(0, Math.min(end.row + dr, localData.rows.length - 1));
      const nc = Math.max(0, Math.min(end.col + dc, localData.cols.length - 1));
      setRangeEnd({ row: nr, col: nc });
    };
    if (e.shiftKey && ["ArrowDown","ArrowUp","ArrowLeft","ArrowRight"].includes(e.key)) {
      e.preventDefault();
      if (e.key === "ArrowDown")  extendRange(1, 0);
      if (e.key === "ArrowUp")    extendRange(-1, 0);
      if (e.key === "ArrowLeft")  extendRange(0, -1);
      if (e.key === "ArrowRight") extendRange(0, 1);
      return;
    }
    if (e.key === "ArrowDown")  { e.preventDefault(); move(1, 0); }
    if (e.key === "ArrowUp")    { e.preventDefault(); move(-1, 0); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); move(0, -1); }
    if (e.key === "ArrowRight") { e.preventDefault(); move(0, 1); }
    if (e.key === "Tab")   { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); }
    if (e.key === "Enter") { e.preventDefault(); if (e.shiftKey) move(-1, 0); else startEditing(row, col); }
    if (e.key === "Delete" || e.key === "Backspace") { setCellValue(row, col, ""); setFormulaBarValue(""); }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      setRangeEnd(null); setEditValue(e.key); setFormulaBarValue(e.key); setEditing(true);
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
              <div className="w-24 px-3 py-1.5 text-xs font-mono text-muted-foreground border-r border-border bg-muted/30 flex-shrink-0 text-center">
                {rangeLabel || "—"}
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
                        const inRange = !isSelected && isInRange(ri, ci);
                        const inColHighlight = selected?.col === ci && !isSelected && !inRange;
                        const inRowHighlight = selected?.row === ri && !isSelected && !inRange;
                        const displayVal = getDisplayValue(ri, ci);
                        const isFormula = String(cell ?? "").startsWith("=");
                        const isError = isFormula && (displayVal === "#ERROR!" || displayVal === "#DIV/0!" || displayVal === "#REF!");
                        return (
                          <td
                            key={ci}
                            tabIndex={0}
                            className={`relative h-7 border-r border-b border-border/50 text-[12px] outline-none transition-colors cursor-default ${
                              isSelected ? "ring-2 ring-inset ring-primary z-10 bg-background" :
                              inRange    ? "bg-primary/10" :
                              "hover:bg-muted/30 focus:ring-2 focus:ring-inset focus:ring-primary/60"
                            } ${(inColHighlight || inRowHighlight) ? "bg-primary/5" : ""}`}
                            onClick={(e) => {
                              if (e.shiftKey && selected) {
                                setRangeEnd({ row: ri, col: ci });
                              } else {
                                setSelected({ row: ri, col: ci }); setRangeEnd(null);
                                setFormulaBarValue(getCellValue(ri, ci)); setEditing(false);
                              }
                            }}
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
                                  if (e.key === "Enter")  { e.preventDefault(); commitEdit(); const n = { row: Math.min(ri + 1, localData.rows.length - 1), col: ci }; setSelected(n); setRangeEnd(null); setFormulaBarValue(getCellValue(n.row, n.col)); }
                                  if (e.key === "Escape") { setEditing(false); setEditValue(getCellValue(ri, ci)); setFormulaBarValue(getCellValue(ri, ci)); }
                                  if (e.key === "Tab")    { e.preventDefault(); commitEdit(); const n = { row: ri, col: Math.min(ci + 1, localData.cols.length - 1) }; setSelected(n); setRangeEnd(null); setFormulaBarValue(getCellValue(n.row, n.col)); }
                                }}
                                className="absolute inset-0 w-full h-full bg-background px-2 outline-none text-[12px] text-foreground font-mono border-0"
                                style={{ fontWeight: fmt.bold ? "bold" : "normal", fontStyle: fmt.italic ? "italic" : "normal", textAlign: fmt.align ?? "left" }}
                              />
                            ) : (
                              <div
                                className="h-full px-2 flex items-center overflow-hidden"
                                style={{ fontWeight: fmt.bold ? "bold" : "normal", fontStyle: fmt.italic ? "italic" : "normal", justifyContent: fmt.align === "center" ? "center" : fmt.align === "right" ? "flex-end" : "flex-start" }}
                              >
                                <span className={`truncate font-mono ${isError ? "text-destructive text-[10px]" : isFormula ? "text-foreground" : "text-foreground"}`}>
                                  {displayVal}
                                </span>
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
            <div className="flex items-center gap-3 px-4 py-1.5 border-t border-border/60 bg-muted/20 text-[10px] text-muted-foreground/70 select-none">
              <span>{localData.rows.length} × {localData.cols.length}</span>
              {selectionStats && selectionStats.hasRange && (
                <>
                  <span className="text-border/60">│</span>
                  <span>Count: <strong className="text-foreground font-semibold">{selectionStats.nonEmpty}</strong></span>
                  {selectionStats.numCount > 0 && (
                    <>
                      <span className="text-border/60">│</span>
                      <span>Sum: <strong className="text-foreground font-semibold">{selectionStats.sum.toLocaleString()}</strong></span>
                      <span className="text-border/60">│</span>
                      <span>Avg: <strong className="text-foreground font-semibold">{selectionStats.avg.toLocaleString()}</strong></span>
                    </>
                  )}
                </>
              )}
              {selectionStats && !selectionStats.hasRange && selectionStats.numCount > 0 && (
                <>
                  <span className="text-border/60">│</span>
                  <span className="text-muted-foreground/50">{selectionStats.sum}</span>
                </>
              )}
              <span className="ml-auto flex gap-3 text-muted-foreground/40">
                <span><kbd className="font-mono">Enter</kbd> edit</span>
                <span><kbd className="font-mono">Shift+↑↓←→</kbd> range</span>
                <span><kbd className="font-mono">Shift+Click</kbd> select</span>
                <span><kbd className="font-mono">= SUM(A1:B5)</kbd> formula</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
