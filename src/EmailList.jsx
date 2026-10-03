import React, { useMemo } from 'react';
import { tagColor } from './Sidebar.jsx';

function timeOrDate(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts));
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(from) {
  const name = (from || '?').replace(/<.*?>/g, '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h << 5) - h + str.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 60% 40%)`;
}

export default function EmailList({
  emails,
  idOf,
  read,
  starred,
  view,
  selectedRows,
  onOpen,
  onToggleStar,
  onToggleRow,
  onSelectAll,
  onMarkRead,
  onMarkUnread,
  onHide,
  onRestore,
  total,
}) {
  const allIds = useMemo(() => emails.map(idOf), [emails, idOf]);
  const selectedCount = selectedRows.size;
  const allSelected = selectedCount > 0 && allIds.every((id) => selectedRows.has(id));
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="list-wrap">
      <div className="list-toolbar">
        <label className="checkbox-wrap">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => el && (el.indeterminate = someSelected)}
            onChange={() => onSelectAll(allSelected ? [] : allIds)}
          />
        </label>

        {selectedCount > 0 ? (
          <div className="bulk-actions">
            {view === 'trash' ? (
              <>
                <ToolbarBtn icon="↩" title="Restore" onClick={onRestore} />
                <ToolbarBtn icon="🗑" title="Delete forever" onClick={onHide} danger />
              </>
            ) : (
              <>
                <ToolbarBtn icon="🗄" title="Archive" onClick={onHide} />
                <ToolbarBtn icon="🗑" title="Delete" onClick={onHide} danger />
                <ToolbarBtn icon="📖" title="Mark as read" onClick={onMarkRead} />
                <ToolbarBtn icon="✉" title="Mark as unread" onClick={onMarkUnread} />
              </>
            )}
            <span className="selected-count">{selectedCount} selected</span>
          </div>
        ) : (
          <div className="list-meta">
            {total > 0 ? `1–${emails.length} of ${total}` : 'No conversations'}
          </div>
        )}
      </div>

      <ul className="email-list">
        {emails.map((e) => {
          const id = idOf(e);
          const isUnread = !read.has(id);
          const isStarred = starred.has(id);
          const isChecked = selectedRows.has(id);
          const from = (e.from || 'Unknown sender').replace(/<.*?>/g, '').trim();
          return (
            <li
              key={id}
              className={`email-row ${isUnread ? 'unread' : ''} ${isChecked ? 'checked' : ''}`}
              onClick={() => onOpen(id)}
            >
              <label className="checkbox-wrap" onClick={(ev) => ev.stopPropagation()}>
                <input type="checkbox" checked={isChecked} onChange={() => onToggleRow(id)} />
              </label>

              <button
                className={`star-btn ${isStarred ? 'starred' : ''}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onToggleStar(id);
                }}
                title={isStarred ? 'Unstar' : 'Star'}
              >
                {isStarred ? '★' : '☆'}
              </button>

              <div className="avatar sm" style={{ background: hashColor(e.from) }}>
                {initials(e.from)}
              </div>

              <span className="row-from">{from}</span>

              {e.tag && (
                <span className="label-chip" style={{ '--chip-color': tagColor(e.tag) }}>
                  {e.tag}
                </span>
              )}

              <span className="row-subject">
                {e.subject || '(no subject)'}
                <span className="row-snippet"> — {(e.text || '').replace(/\s+/g, ' ').slice(0, 80)}</span>
              </span>

              <span className="row-time">{timeOrDate(e.timestamp)}</span>
              <span className="row-hover-actions" onClick={(ev) => ev.stopPropagation()}>
                {view === 'trash' ? (
                  <button title="Restore" onClick={() => onRestore([id])}>↩</button>
                ) : (
                  <>
                    <button title="Archive" onClick={() => onHide([id])}>🗄</button>
                    <button title="Delete" onClick={() => onHide([id])}>🗑</button>
                    <button
                      title={isUnread ? 'Mark as read' : 'Mark as unread'}
                      onClick={() => (isUnread ? onMarkRead([id]) : onMarkUnread([id]))}
                    >
                      {isUnread ? '📖' : '✉'}
                    </button>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ToolbarBtn({ icon, title, onClick, danger }) {
  return (
    <button className={`toolbar-btn ${danger ? 'danger' : ''}`} title={title} onClick={onClick}>
      {icon}
    </button>
  );
}
