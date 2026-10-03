import React, { useState, useMemo } from 'react';

function fullDate(ts, dateStr) {
  const d = ts ? new Date(Number(ts)) : dateStr ? new Date(dateStr) : null;
  if (!d || isNaN(d)) return dateStr || '';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export default function EmailDetail({
  email,
  view,
  isStarred,
  onBack,
  onToggleStar,
  onHide,
  onRestore,
  onMarkUnread,
}) {
  const [tab, setTab] = useState('html');

  const hasHtml = Boolean(email.html);
  const hasText = Boolean(email.text);
  const effectiveTab = tab === 'html' && !hasHtml ? (hasText ? 'text' : 'raw') : tab;
  const attachments = email.attachments || [];

  const toList = useMemo(() => {
    if (Array.isArray(email.to)) return email.to.join(', ');
    return email.to || '';
  }, [email.to]);

  return (
    <div className="detail">
      <div className="detail-toolbar">
        <button className="icon-btn" onClick={onBack} title="Back to list">
          ←
        </button>
        <span className="toolbar-divider" />
        {view === 'trash' ? (
          <button className="icon-btn" onClick={onRestore} title="Restore">
            ↩
          </button>
        ) : (
          <button className="icon-btn" onClick={onHide} title="Archive">
            🗄
          </button>
        )}
        <button className="icon-btn" onClick={onHide} title="Delete">
          🗑
        </button>
        <button className="icon-btn" onClick={onMarkUnread} title="Mark as unread">
          ✉
        </button>
        <button
          className={`icon-btn star-toolbar-btn ${isStarred ? 'starred' : ''}`}
          onClick={onToggleStar}
          title={isStarred ? 'Unstar' : 'Star'}
        >
          {isStarred ? '★' : '☆'}
        </button>
      </div>

      <div className="detail-header">
        <h2>{email.subject || '(no subject)'}</h2>
        {email.tag && (
          <span className="label-chip" style={{ '--chip-color': 'var(--accent)' }}>
            {email.tag}
          </span>
        )}

        <div className="detail-sender-row">
          <div className="avatar" style={{ background: hashColor(email.from) }}>
            {initials(email.from)}
          </div>
          <div className="detail-sender-info">
            <div>
              <strong>{(email.from || 'Unknown').replace(/<.*?>/g, '').trim()}</strong>{' '}
              <span className="muted">{(email.from || '').match(/<(.+)>/)?.[1] || ''}</span>
            </div>
            <div className="muted small">
              to {toList || 'me'} · {fullDate(email.timestamp, email.date)}
            </div>
          </div>
        </div>
      </div>

      <div className="view-toggle">
        <button className={effectiveTab === 'html' ? 'active' : ''} disabled={!hasHtml} onClick={() => setTab('html')}>
          HTML
        </button>
        <button className={effectiveTab === 'text' ? 'active' : ''} disabled={!hasText} onClick={() => setTab('text')}>
          Plain text
        </button>
        <button className={effectiveTab === 'raw' ? 'active' : ''} onClick={() => setTab('raw')}>
          Raw JSON
        </button>
        {attachments.length > 0 && <span className="attach-count">📎 {attachments.length}</span>}
      </div>

      <div className="detail-body">
        {effectiveTab === 'html' && hasHtml && (
          <iframe title="email-html" sandbox="" className="html-frame" srcDoc={email.html} />
        )}
        {effectiveTab === 'text' && hasText && <pre className="text-view">{email.text}</pre>}
        {effectiveTab === 'raw' && <pre className="raw-view">{JSON.stringify(email, null, 2)}</pre>}
        {!hasHtml && !hasText && effectiveTab !== 'raw' && (
          <div className="empty-state">
            <p className="muted">No renderable body for this message — check Raw JSON.</p>
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="attachments">
          {attachments.map((a, i) => (
            <div className="attachment" key={i}>
              📎 {a.filename || `attachment-${i + 1}`}
              {a.contentType ? <span className="muted"> · {a.contentType}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
