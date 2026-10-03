import React from 'react';

const TAG_HUES = [162, 210, 28, 280, 340, 60, 190, 12];

export function tagColor(tag) {
  let h = 0;
  for (let i = 0; i < (tag || '').length; i++) h = (h << 5) - h + tag.charCodeAt(i);
  const hue = TAG_HUES[Math.abs(h) % TAG_HUES.length];
  return `hsl(${hue} 70% 42%)`;
}

export default function Sidebar({
  collapsed,
  view,
  tagFilter,
  tags,
  counts,
  loading,
  onRefresh,
  onSelectView,
  onSelectTag,
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button className="refresh-pill" onClick={onRefresh} disabled={loading}>
        <span className="refresh-pill-icon">{loading ? '…' : '↻'}</span>
        <span className="refresh-pill-label">Refresh</span>
      </button>

      <nav className="nav-list">
        <NavItem
          icon="📥"
          label="Inbox"
          count={counts.unread}
          active={view === 'inbox' && !tagFilter}
          onClick={() => onSelectView('inbox')}
          collapsed={collapsed}
          emphasize
        />
        <NavItem
          icon="⭐"
          label="Starred"
          count={counts.starred}
          active={view === 'starred'}
          onClick={() => onSelectView('starred')}
          collapsed={collapsed}
        />
        <NavItem
          icon="🗑"
          label="Trash"
          count={counts.trash}
          active={view === 'trash'}
          onClick={() => onSelectView('trash')}
          collapsed={collapsed}
        />
      </nav>

      {tags.length > 0 && (
        <>
          <div className="nav-section-title">{!collapsed && 'Labels'}</div>
          <nav className="nav-list">
            {tags.map((t) => (
              <NavItem
                key={t}
                dot={tagColor(t)}
                label={t}
                active={view === 'inbox' && tagFilter === t}
                onClick={() => onSelectTag(t)}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </>
      )}
    </aside>
  );
}

function NavItem({ icon, dot, label, count, active, onClick, collapsed, emphasize }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} title={label}>
      <span className="nav-icon">
        {icon || <span className="nav-dot" style={{ background: dot }} />}
      </span>
      {!collapsed && <span className="nav-label">{label}</span>}
      {!collapsed && count > 0 && (
        <span className={`nav-count ${emphasize ? 'strong' : ''}`}>{count}</span>
      )}
    </button>
  );
}
