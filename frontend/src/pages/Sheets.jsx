import { useState, useEffect } from 'react';
import { getSheets, createSheet, getSheet, updateSheet } from '../api/sheets';
import { SheetGrid } from '../components/SheetGrid';
import { AppLayout } from '../components/AppLayout';

export default function Sheets() {
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetName, setSheetName] = useState('');
  const [loading, setLoading] = useState(true);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [dataDebounceTimer, setDataDebounceTimer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    try {
      setError('');
      const data = await getSheets();
      setSheets(data);
      if (data.length > 0 && !selectedSheet) {
        await loadSheet(data[0].id);
      }
    } catch (error) {
      setError('Could not load sheets.');
    } finally {
      setLoading(false);
    }
  };

  const loadSheet = async (sheetId) => {
    try {
      setError('');
      const fullSheet = await getSheet(sheetId);
      setSelectedSheet(fullSheet);
      setSheetName(fullSheet.name);
    } catch (error) {
      setError('Could not load sheet.');
    }
  };

  const handleCreateSheet = async () => {
    try {
      setError('');
      const newSheet = await createSheet({
        name: 'Untitled sheet',
      });
      setSheets([...sheets, newSheet]);
      await loadSheet(newSheet.id);
    } catch (error) {
      setError('Could not create sheet.');
    }
  };

  const handleSheetNameChange = (name) => {
    setSheetName(name);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(async () => {
      if (selectedSheet) {
        try {
          setError('');
          await updateSheet(selectedSheet.id, { name });
          fetchSheets();
        } catch (error) {
          setError('Could not update sheet name.');
        }
      }
    }, 500);
    setDebounceTimer(timer);
  };

  const scheduleDataSave = (newData) => {
    if (!selectedSheet) return;
    setSelectedSheet({ ...selectedSheet, data: newData });
    if (dataDebounceTimer) clearTimeout(dataDebounceTimer);
    const timer = setTimeout(async () => {
      try {
        setError('');
        await updateSheet(selectedSheet.id, { data: newData });
      } catch (error) {
        setError('Could not update sheet.');
      }
    }, 1000);
    setDataDebounceTimer(timer);
  };

  const handleDataChange = (newData) => {
    scheduleDataSave(newData);
  };

  return (
    <AppLayout
      title="Sheets"
      actions={
        <button className="btn-primary" onClick={handleCreateSheet}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New sheet
        </button>
      }
    >
      <div className="h-full flex">
        <div className="w-[200px] border-r border-[var(--border-primary)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] font-semibold">Sheets</span>
            <button onClick={handleCreateSheet} className="btn">
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="text-[var(--text-secondary)] text-sm px-2 py-3">Loading...</div>
            ) : (
              <>
                {error && <div className="text-sm text-[var(--danger)] px-2 pb-2">{error}</div>}
                {sheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    onClick={() => loadSheet(sheet.id)}
                    className={`px-3 py-2 rounded-md cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2 ${
                      selectedSheet?.id === sheet.id ? 'bg-[var(--success-subtle)]' : ''
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className={`w-4 h-4 ${selectedSheet?.id === sheet.id ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                    </svg>
                    <span className={`text-sm ${selectedSheet?.id === sheet.id ? 'text-[var(--success)] font-medium' : 'text-[var(--text-primary)]'} truncate`}>
                      {sheet.name}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedSheet ? (
            <>
              <div className="px-4 py-2 border-b border-[var(--border-primary)] flex items-center gap-2">
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => handleSheetNameChange(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none flex-1"
                />
                <button
                  className="btn"
                  onClick={() =>
                    scheduleDataSave({
                      ...selectedSheet.data,
                      rows: [...selectedSheet.data.rows, new Array(selectedSheet.data.cols.length).fill('')],
                    })
                  }
                >
                  + Row
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    scheduleDataSave({
                      ...selectedSheet.data,
                      cols: [...selectedSheet.data.cols, 'Column'],
                      rows: selectedSheet.data.rows.map((row) => [...row, '']),
                    })
                  }
                >
                  + Col
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SheetGrid sheet={selectedSheet} onDataChange={handleDataChange} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">No sheets</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
