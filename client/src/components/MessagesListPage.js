// client/src/components/MessagesListPage.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export default function MessagesListPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/messages/threads', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setThreads(Array.isArray(data.threads) ? data.threads : []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading threads…</div>;

  return (
    <div style={styles.wrap}>
      <h2 style={styles.h2}>Messages</h2>
      {threads.length === 0 ? (
        <div style={styles.empty}>No chat threads available yet.</div>
      ) : (
        <div style={styles.list}>
          {threads.map((t) => (
            <Link
              key={t.caseId}
              to={`/messages/${t.caseId}`}
              style={styles.thread}
            >
              <div style={styles.title}>{t.caseTitle}</div>
              <div style={styles.sub}>
                With: <strong>{t.counterpart?.name || '—'}</strong> ({t.counterpart?.role || ''})
              </div>
              {t.lastMessage ? (
                <div style={styles.preview}>
                  <span>{new Date(t.lastMessage.createdAt).toLocaleString()}</span>
                  <span> — </span>
                  <span>{t.lastMessage.body.slice(0, 100)}</span>
                </div>
              ) : (
                <div style={styles.previewMuted}>No messages yet</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { padding: 16, maxWidth: 800, margin: '0 auto' },
  h2: { margin: '8px 0 16px' },
  empty: { padding: 12, opacity: 0.8 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  thread: {
    textDecoration: 'none',
    color: 'inherit',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 12,
    background: '#fff',
  },
  title: { fontWeight: 600, marginBottom: 4 },
  sub: { fontSize: 14, color: '#444', marginBottom: 6 },
  preview: { fontSize: 13, color: '#333' },
  previewMuted: { fontSize: 13, color: '#888' },
};
