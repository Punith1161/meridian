import { useState, useEffect } from 'react';
import { getNotes, createNote, updateNote, deleteNote } from '../api/notes';
import { NoteEditor } from '../components/NoteEditor';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const data = await getNotes();
      setNotes(data);
      if (data.length > 0 && !selectedNote) {
        setSelectedNote(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote({ title: 'Untitled', content: '' });
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
    } catch (error) {
      console.error('Failed to create note');
    }
  };

  const handleSaveNote = async (updatedContent) => {
    if (!selectedNote) return;
    try {
      await updateNote(selectedNote.id, updatedContent);
      const updatedNote = { ...selectedNote, ...updatedContent };
      setSelectedNote(updatedNote);
      fetchNotes();
    } catch (error) {
      console.error('Failed to save note');
    }
  };

  const handleDeleteNote = async () => {
    if (deleteConfirm !== selectedNote.id) {
      setDeleteConfirm(selectedNote.id);
      return;
    }

    try {
      await deleteNote(selectedNote.id);
      const newNotes = notes.filter((n) => n.id !== selectedNote.id);
      setNotes(newNotes);
      setSelectedNote(newNotes.length > 0 ? newNotes[0] : null);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete note');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="ml-14 flex h-screen bg-[var(--bg-primary)]">
      <div className="w-56 border-r border-[var(--border-primary)] flex flex-col">
        <button
          onClick={handleCreateNote}
          className="m-4 bg-[var(--accent)] text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
        >
          New note
        </button>
        <div className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={`p-4 cursor-pointer border-b border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors ${
                selectedNote?.id === note.id ? 'bg-[var(--accent-subtle)]' : ''
              }`}
            >
              <h3 className="font-semibold text-[var(--text-primary)] truncate">{note.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {new Date(note.updated_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            <div className="flex-1 p-6">
              <NoteEditor note={selectedNote} onSave={handleSaveNote} />
            </div>
            <div className="border-t border-[var(--border-primary)] p-4 flex justify-end">
              <button
                onClick={handleDeleteNote}
                className={`px-4 py-2 rounded ${
                  deleteConfirm === selectedNote.id
                    ? 'bg-[var(--danger)] text-white'
                    : 'bg-[var(--danger-subtle)] text-[var(--danger)]'
                }`}
              >
                {deleteConfirm === selectedNote.id ? 'Confirm delete' : 'Delete'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
            No notes
          </div>
        )}
      </div>
    </div>
  );
}
