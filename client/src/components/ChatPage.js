// client/src/components/ChatPage.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const toId = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return String(v._id || v.id || '');
  return String(v);
};

export default function ChatPage() {
  const { caseId } = useParams();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  // Case/thread info to show counterpart + title
  const [caseTitle, setCaseTitle] = useState('');
  const [counterpart, setCounterpart] = useState(null); // {_id,name,role}

  // Current user (from JWT)
  const [me, setMe] = useState({ _id: '', name: 'You' });

  const listRef = useRef(null);

  // Decode "me" from token once
  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    try {
      const d = jwtDecode(token);
      const myId = d?.id || d?._id || d?.userId || '';
      const myName = d?.name || 'You';
      setMe({ _id: String(myId), name: myName });
    } catch {
      setMe({ _id: '', name: 'You' });
    }
  }, []);

  // Load thread meta (to know counterpart name for this case)
  useEffect(() => {
    fetch('/api/messages/threads', { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data?.threads) ? data.threads : [];
        const t = arr.find((x) => String(x.caseId) === String(caseId));
        if (t) {
          setCaseTitle(t.caseTitle || '');
          setCounterpart(t.counterpart || null);
        }
      })
      .catch(() => {});
  }, [caseId]);

  const load = () => {
    setLoading(true);
    fetch(`/api/messages/${caseId}?limit=200`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data.messages) ? data.messages : []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [caseId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Name resolver for each message sender
  const nameById = useMemo(() => {
    const map = new Map();
    if (me?._id) map.set(String(me._id), me.name || 'You');
    if (counterpart?._id) map.set(String(counterpart._id), counterpart.name || 'User');
    return map;
  }, [me, counterpart]);

  const displayName = (senderId) => {
    const id = String(toId(senderId));
    return nameById.get(id) || 'User';
  };

  const onSend = async (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/messages/${caseId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ body: trimmed }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setBody('');
    } else {
      const err = await res.json().catch(() => ({ message: 'Failed' }));
      alert(err.message || 'Failed to send');
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/messages" style={styles.link}>&larr; Threads</Link>
        </div>
        <div style={styles.headerCenter}>
          <h3 style={{ margin: 0 }}>Case Chat{caseTitle ? ` — ${caseTitle}` : ''}</h3>
          {counterpart?.name && (
            <div style={styles.counterpart}>
              With: <strong>{counterpart.name}</strong>{' '}
              {counterpart.role ? `(${counterpart.role})` : ''}
            </div>
          )}
        </div>
        <div style={styles.headerRight}>
          {/* ✅ Back to Dashboard button */}
          <Link to="/dashboard" style={styles.dashboardBtn}>Back to Dashboard</Link>
        </div>
      </div>

      <div ref={listRef} style={styles.list}>
        {loading ? (
          <div style={{ padding: 8 }}>Loading messages…</div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 8, opacity: 0.7 }}>No messages yet. Say hello 👋</div>
        ) : (
          messages.map((m) => {
            const mine = String(toId(m.senderId)) === String(me._id);
            return (
              <div key={m._id} style={{ ...styles.msg, ...(mine ? styles.msgMine : {}) }}>
                <div style={styles.meta}>
                  <strong>{displayName(m.senderId)}</strong>
                  <span style={styles.dot}>•</span>
                  <span>{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div style={styles.body}>{m.body}</div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={onSend} style={styles.form}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your message…"
          rows={2}
          style={styles.input}
          maxLength={1000}
        />
        <button type="submit" style={styles.send}>Send</button>
      </form>
    </div>
  );
}

const styles = {
  wrap: { maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', padding: 12 },
  header: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '8px 0', marginBottom: 6 },
  headerLeft: { justifySelf: 'start' },
  headerCenter: { justifySelf: 'center', textAlign: 'center' },
  headerRight: { justifySelf: 'end' },
  link: { textDecoration: 'none', color: '#0b5ed7', fontWeight: 600 },
  dashboardBtn: {
    textDecoration: 'none',
    background: '#0b5ed7',
    color: '#fff',
    border: '1px solid #0b5ed7',
    borderRadius: 8,
    padding: '8px 12px',
    fontWeight: 700,
  },
  counterpart: { marginTop: 4, fontSize: 13, color: '#555' },

  list: { flex: 1, overflowY: 'auto', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8 },
  msg: { background: '#fff', border: '1px solid #e6e6e6', borderRadius: 8, padding: 10, marginBottom: 8, maxWidth: 620 },
  msgMine: { borderColor: '#cfe2ff', background: '#f8fbff' },
  meta: { fontSize: 12, color: '#555', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 },
  dot: { opacity: 0.6 },
  body: { whiteSpace: 'pre-wrap', color: '#111' },

  form: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ccc', resize: 'vertical', background: '#fff' },
  send: { padding: '8px 16px', borderRadius: 8, border: '1px solid #0b5ed7', background: '#0b5ed7', color: '#fff', cursor: 'pointer' },
};
