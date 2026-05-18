import { useState, useEffect } from 'react';
import { getNotes, createNote, updateNote, deleteNote } from '../api/notes';
import { NoteEditor } from '../components/NoteEditor';
import { AppLayout } from '../components/AppLayout';
import { relativeDate } from '../utils/dateHelpers';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setError('');
      const data = await getNotes();
      setNotes(data);
      if (data.length > 0 && !selectedNote) {
        setSelectedNote(data[0]);
      }
    } catch (error) {
      setError('Could not load notes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      setError('');
      const newNote = await createNote({ title: 'Untitled', content: '' });
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
    } catch (error) {
      setError('Could not create note.');
    }
  };

  const handleSaveNote = async (updatedContent) => {
    if (!selectedNote) return;
    try {
      setError('');
      await updateNote(selectedNote.id, updatedContent);
      const updatedNote = { ...selectedNote, ...updatedContent };
      setSelectedNote(updatedNote);
      fetchNotes();
    } catch (error) {
      setError('Could not save note.');
    }
  };

  const handleDeleteNote = async () => {
    if (deleteConfirm !== selectedNote.id) {
      setDeleteConfirm(selectedNote.id);
      return;
    }

    try {
      setError('');
      await deleteNote(selectedNote.id);
      const newNotes = notes.filter((n) => n.id !== selectedNote.id);
      setNotes(newNotes);
      setSelectedNote(newNotes.length > 0 ? newNotes[0] : null);
      setDeleteConfirm(null);
    } catch (error) {
      setError('Could not delete note.');
    }
  };

  return (
    <AppLayout
      title="Notes"
      actions={
        <button className="btn-primary" onClick={handleCreateNote}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New note
        </button>
      }
    >
      <div className="h-full flex">
        <div className="w-[220px] border-r border-[var(--border-primary)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[var(--text-tertiary)] font-semibold">Notes</span>
            <button onClick={handleCreateNote} className="btn">
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="text-[var(--text-secondary)] text-sm px-2 py-3">Loading...</div>
            ) : (
              <>
                {error && <div className="text-sm text-[var(--danger)] px-2 pb-2">{error}</div>}
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`px-3 py-2 rounded-md cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors ${
                      selectedNote?.id === note.id ? 'bg-[var(--accent-subtle)]' : ''
                    }`}
                  >
                    <div className={`text-sm font-medium ${selectedNote?.id === note.id ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'} truncate`}>
                      {note.title}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">
                      {relativeDate(note.updated_at)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNote ? (
            <>
              <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Editor</span>
                <button
                  onClick={handleDeleteNote}
                  className={`text-xs px-3 py-1.5 rounded ${
                    deleteConfirm === selectedNote.id
                      ? 'bg-[var(--danger)] text-white'
                      : 'bg-[var(--danger-subtle)] text-[var(--danger)]'
                  }`}
                >
                  {deleteConfirm === selectedNote.id ? 'Confirm delete' : 'Delete'}
                </button>
              </div>
              <div className="flex-1 overflow-hidden px-6 py-5">
                <NoteEditor note={selectedNote} onSave={handleSaveNote} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
              No notes
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
