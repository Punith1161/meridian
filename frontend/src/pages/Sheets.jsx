import { useState, useEffect } from 'react';
import { getSheets, createSheet, getSheet, updateSheet } from '../api/sheets';
import { SheetGrid } from '../components/SheetGrid';

export default function Sheets() {
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetName, setSheetName] = useState('');
  const [loading, setLoading] = useState(true);
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    try {
      const data = await getSheets();
      setSheets(data);
      if (data.length > 0 && !selectedSheet) {
        setSelectedSheet(data[0]);
        setSheetName(data[0].name);
      }
    } catch (error) {
      console.error('Failed to fetch sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    try {
      const newSheet = await createSheet({
        name: 'Untitled sheet',
      });
      setSheets([...sheets, newSheet]);
      setSelectedSheet(newSheet);
      setSheetName(newSheet.name);
    } catch (error) {
      console.error('Failed to create sheet');
    }
  };

  const handleSheetNameChange = (name) => {
    setSheetName(name);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(async () => {
      if (selectedSheet) {
        try {
          await updateSheet(selectedSheet.id, { name });
          fetchSheets();
        } catch (error) {
          console.error('Failed to update sheet name');
        }
      }
    }, 500);
    setDebounceTimer(timer);
  };

  const handleDataChange = async (newData) => {
    if (!selectedSheet) return;
    try {
      await updateSheet(selectedSheet.id, { data: newData });
      setSelectedSheet({ ...selectedSheet, data: newData });
    } catch (error) {
      console.error('Failed to update sheet data');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="ml-14 flex h-screen bg-[var(--bg-primary)]">
      <div className="w-56 border-r border-[var(--border-primary)] flex flex-col">
        <button
          onClick={handleCreateSheet}
          className="m-4 bg-[var(--accent)] text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
        >
          New sheet
        </button>
        <div className="flex-1 overflow-y-auto">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              onClick={() => {
                setSelectedSheet(sheet);
                setSheetName(sheet.name);
              }}
              className={`p-4 cursor-pointer border-b border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors ${
                selectedSheet?.id === sheet.id ? 'bg-[var(--accent-subtle)]' : ''
              }`}
            >
              <h3 className="font-semibold text-[var(--text-primary)] truncate">{sheet.name}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedSheet ? (
          <>
            <div className="p-4 border-b border-[var(--border-primary)]">
              <input
                type="text"
                value={sheetName}
                onChange={(e) => handleSheetNameChange(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-3 py-2 text-[var(--text-primary)] focus:outline-none"
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <SheetGrid sheet={selectedSheet} onDataChange={handleDataChange} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
            No sheets
          </div>
        )}
      </div>
    </div>
  );
}
