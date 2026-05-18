import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

export function Sidebar() {
  const { toggleTheme, theme } = useContext(ThemeContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed left-0 top-0 w-14 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col items-center py-4">
      <div className="w-8 h-8 bg-[var(--accent)] rounded mb-8"></div>
      
      <nav className="flex flex-col gap-4 flex-1">
        <a href="/" title="Kanban" className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isActive('/') ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'}`}>
          📋
        </a>
        <a href="/today" title="Today" className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isActive('/today') ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'}`}>
          📅
        </a>
        <a href="/tasks" title="All tasks" className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isActive('/tasks') ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'}`}>
          ✓
        </a>
        <a href="/notes" title="Notes" className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isActive('/notes') ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'}`}>
          📝
        </a>
        <a href="/sheets" title="Sheets" className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isActive('/sheets') ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'}`}>
          📊
        </a>
      </nav>

      <div className="flex flex-col gap-4">
        <button onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} className="w-8 h-8 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </div>
  );
}
