import { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

export function NoteEditor({ note, onSave }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || '');
    }
  }, [note]);

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
    <div className="h-full flex flex-col" data-color-mode="dark">
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        className="bg-transparent text-2xl font-semibold text-[var(--text-primary)] mb-4 border-b border-[var(--border-primary)] pb-2 focus:outline-none"
        placeholder="Note title"
      />
      <div className="flex-1 overflow-auto">
        <MDEditor
          value={content}
          onChange={handleContentChange}
          preview="live"
          height={400}
          visibleDragbar={false}
          textareaProps={{
            disabled: false,
          }}
          hideToolbar={false}
        />
      </div>
    </div>
  );
}
