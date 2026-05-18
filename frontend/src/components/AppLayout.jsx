import { Sidebar } from './Sidebar';

export function AppLayout({ title, actions, children }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex-1 ml-14 flex flex-col min-h-screen">
        <div className="h-14 px-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
