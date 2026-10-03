import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchEmails, TestmailError } from './api.js';
import { useLocalSet } from './useLocalSet.js';
import Sidebar from './Sidebar.jsx';
import EmailList from './EmailList.jsx';
import EmailDetail from './EmailDetail.jsx';

const LS_KEY = 'testmail-viewer:config';
const POLL_MS = 15000;

function loadConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConfig(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

const idOf = (e) => e.message_id || e.id;

export default function App() {
  const [config, setConfig] = useState(loadConfig);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [view, setView] = useState('inbox'); // inbox | starred | trash
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('testmail-viewer:theme') || 'light');
  const [showSettings, setShowSettings] = useState(!loadConfig());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const abortRef = useRef(null);

  const ns = config?.namespace || 'default';
  const read = useLocalSet(`testmail-viewer:read:${ns}`);
  const starred = useLocalSet(`testmail-viewer:starred:${ns}`);
  const hidden = useLocalSet(`testmail-viewer:hidden:${ns}`);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('testmail-viewer:theme', theme);
  }, [theme]);

  const load = useCallback(
    async (silent = false) => {
      if (!config?.apikey || !config?.namespace) return;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await fetchEmails({
          apikey: config.apikey,
          namespace: config.namespace,
          limit: 50,
          signal: controller.signal,
        });
        const list = (data.emails || []).slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setEmails(list);
        setLastUpdated(Date.now());
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err instanceof TestmailError ? err.message : 'Something went wrong fetching your inbox.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [config]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh || !config) return;
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, config, load]);

  const tags = useMemo(() => {
    const set = new Set(emails.filter((e) => !hidden.set.has(idOf(e))).map((e) => e.tag).filter(Boolean));
    return Array.from(set).sort();
  }, [emails, hidden.set]);

  const counts = useMemo(() => {
    const visible = emails.filter((e) => !hidden.set.has(idOf(e)));
    return {
      unread: visible.filter((e) => !read.set.has(idOf(e))).length,
      starred: visible.filter((e) => starred.set.has(idOf(e))).length,
      trash: emails.filter((e) => hidden.set.has(idOf(e))).length,
    };
  }, [emails, read.set, starred.set, hidden.set]);

  const filtered = useMemo(() => {
    let list = emails;
    if (view === 'trash') {
      list = list.filter((e) => hidden.set.has(idOf(e)));
    } else {
      list = list.filter((e) => !hidden.set.has(idOf(e)));
      if (view === 'starred') list = list.filter((e) => starred.set.has(idOf(e)));
      if (tagFilter) list = list.filter((e) => e.tag === tagFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          (e.subject || '').toLowerCase().includes(q) ||
          (e.from || '').toLowerCase().includes(q) ||
          (e.tag || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [emails, view, tagFilter, query, hidden.set, starred.set]);

  const selected = useMemo(() => emails.find((e) => idOf(e) === selectedId) || null, [emails, selectedId]);

  const handleSaveSettings = (cfg) => {
    setConfig(cfg);
    saveConfig(cfg);
    setShowSettings(false);
    setEmails([]);
    setSelectedId(null);
  };

  const openEmail = (id) => {
    setSelectedId(id);
    read.add(id);
  };

  const closeEmail = () => setSelectedId(null);

  const hideIds = (ids) => {
    const list = ids || Array.from(selectedRows);
    hidden.add(list);
    setSelectedRows(new Set());
    if (list.includes(selectedId)) setSelectedId(null);
  };

  const restoreIds = (ids) => {
    const list = ids || Array.from(selectedRows);
    hidden.remove(list);
    setSelectedRows(new Set());
    if (list.includes(selectedId)) setSelectedId(null);
  };

  const markRead = (ids) => {
    read.add(ids || Array.from(selectedRows));
    setSelectedRows(new Set());
  };

  const markUnread = (ids) => {
    read.remove(ids || Array.from(selectedRows));
    setSelectedRows(new Set());
  };

  const toggleRow = (id) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  if (showSettings || !config) {
    return (
      <SettingsGate
        initial={config}
        onSave={handleSaveSettings}
        onCancel={config ? () => setShowSettings(false) : null}
      />
    );
  }

  return (
    <div className="gapp">
      <header className="gtopbar">
        <button className="hamburger" onClick={() => setSidebarCollapsed((v) => !v)} title="Toggle menu">
          ☰
        </button>
        <div className="glogo">
          <span className="glogo-icon">📬</span>
          <span className="glogo-text">Testmail</span>
        </div>

        <div className="gsearch-wrap">
          <span className="gsearch-icon">⌕</span>
          <input
            className="gsearch"
            placeholder="Search mail"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="gtopbar-actions">
          <button
            className={`icon-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? 'Auto-refresh on (every 15s)' : 'Auto-refresh off'}
          >
            {autoRefresh ? '⏱' : '⏸'}
          </button>
          <button
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            ⚙
          </button>
          <div className="gavatar" title={config.namespace}>
            {config.namespace.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {error && (
        <div className="banner error">
          {error}
          <button onClick={() => load()}>Retry</button>
        </div>
      )}

      <div className="gbody">
        <Sidebar
          collapsed={sidebarCollapsed}
          view={view}
          tagFilter={tagFilter}
          tags={tags}
          counts={counts}
          loading={loading}
          onRefresh={() => load()}
          onSelectView={(v) => {
            setView(v);
            setTagFilter('');
            setSelectedId(null);
            setSelectedRows(new Set());
          }}
          onSelectTag={(t) => {
            setView('inbox');
            setTagFilter(t);
            setSelectedId(null);
            setSelectedRows(new Set());
          }}
        />

        <main className="gcontent">
          {selected ? (
            <EmailDetail
              email={selected}
              view={view}
              isStarred={starred.set.has(idOf(selected))}
              onBack={closeEmail}
              onToggleStar={() => starred.toggle(idOf(selected))}
              onHide={() => hideIds([idOf(selected)])}
              onRestore={() => restoreIds([idOf(selected)])}
              onMarkUnread={() => {
                markUnread([idOf(selected)]);
                closeEmail();
              }}
            />
          ) : filtered.length === 0 && !loading ? (
            <EmptyState view={view} namespace={config.namespace} />
          ) : (
            <EmailList
              emails={filtered}
              idOf={idOf}
              read={read.set}
              starred={starred.set}
              view={view}
              selectedRows={selectedRows}
              total={filtered.length}
              onOpen={openEmail}
              onToggleStar={(id) => starred.toggle(id)}
              onToggleRow={toggleRow}
              onSelectAll={(ids) => setSelectedRows(new Set(ids))}
              onMarkRead={(ids) => markRead(ids)}
              onMarkUnread={(ids) => markUnread(ids)}
              onHide={(ids) => hideIds(ids)}
              onRestore={(ids) => restoreIds(ids)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ view, namespace }) {
  if (view === 'trash') {
    return (
      <div className="empty-state center">
        <div className="empty-emoji">🗑</div>
        <p>Trash is empty</p>
      </div>
    );
  }
  if (view === 'starred') {
    return (
      <div className="empty-state center">
        <div className="empty-emoji">⭐</div>
        <p>No starred emails yet</p>
        <p className="muted">Star a message from the list to keep it handy here.</p>
      </div>
    );
  }
  return (
    <div className="empty-state center">
      <div className="empty-emoji">✉️</div>
      <p>No emails yet</p>
      <p className="muted">
        Send a test email to any address like <code>{namespace}.hello@inbox.testmail.app</code> and it'll show up
        here.
      </p>
    </div>
  );
}

function SettingsGate({ initial, onSave, onCancel }) {
  const [apikey, setApikey] = useState(initial?.apikey || '');
  const [namespace, setNamespace] = useState(initial?.namespace || '');
  const [touched, setTouched] = useState(false);

  const valid = apikey.trim() && namespace.trim();

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-header">
          <span className="brand-icon large">📬</span>
          <h1>Testmail Viewer</h1>
          <p className="muted">
            Connect your{' '}
            <a href="https://testmail.app" target="_blank" rel="noreferrer">
              testmail.app
            </a>{' '}
            account to browse incoming test emails in real time.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (valid) onSave({ apikey: apikey.trim(), namespace: namespace.trim() });
          }}
        >
          <label className="field">
            <span>API key</span>
            <input
              type="password"
              value={apikey}
              onChange={(e) => setApikey(e.target.value)}
              placeholder="paste your testmail.app API key"
              autoFocus
            />
          </label>
          <label className="field">
            <span>Namespace</span>
            <input
              type="text"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              placeholder="e.g. acmeinc"
            />
          </label>
          {touched && !valid && <div className="field-error">Both fields are required.</div>}
          <div className="gate-actions">
            <button type="submit" className="primary-btn" disabled={!valid}>
              Connect inbox
            </button>
            {onCancel && (
              <button type="button" className="ghost-btn" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
        <p className="fine-print muted">
          Stored only in this browser's local storage — never sent anywhere but testmail.app.
        </p>
      </div>
    </div>
  );
}
