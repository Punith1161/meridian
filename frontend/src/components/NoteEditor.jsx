import { useState, useEffect, useContext } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { ThemeContext } from '../context/ThemeContext';

export function NoteEditor({ note, onSave }) {
  const { theme } = useContext(ThemeContext);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || '');
    }
  }, [note]);

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 900);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    scheduleAutoSave(newTitle, content);
  };

  const handleContentChange = (value) => {
    setContent(value || '');
    scheduleAutoSave(title, value || '');
  };

  const scheduleAutoSave = (newTitle, newContent) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      if (note && (newTitle !== note.title || newContent !== note.content)) {
        onSave({ title: newTitle, content: newContent });
      }
    }, 600);
    setDebounceTimer(timer);
  };

  if (!note) {
    return <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">Select a note</div>;
  }

  return (
    <div className="h-full flex flex-col meridian-md" data-color-mode={theme}>
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        className="bg-transparent text-lg font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-primary)] pb-2 focus:outline-none"
        placeholder="Note title"
      />
      <div className="flex-1 min-h-0 overflow-auto">
        <MDEditor
          value={content}
          onChange={handleContentChange}
          preview={isNarrow ? 'edit' : 'live'}
          visibleDragbar={false}
          className="h-full"
          hideToolbar={false}
        />
      </div>
    </div>
  );
}
