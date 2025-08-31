// client/src/components/MediatorDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const green = '#14532d';

const MediatorDashboard = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('Mediator');
  const [id, setId] = useState(null); // mediatorId
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // ✅ upcoming sessions (FR-8 mini preview)
  const [upcoming, setUpcoming] = useState([]);

  // ✅ reviews state
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false); // hidden by default

  // Auth + role guard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      const decoded = jwtDecode(token);
      setName(decoded.name || 'Mediator');
      setId(decoded.id); // store userId for review fetch
      if (decoded.role !== 'Mediator') {
        navigate('/dashboard');
      }
    } catch {
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  // Load cases assigned to me
  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/cases/assigned', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCases(data.cases || []);
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          (e?.response?.status ? `Error ${e.response.status}` : 'Network error')
      );
    } finally {
      setLoading(false);
    }
  };

  // Load upcoming sessions for mediator (FR-8)
  const loadUpcoming = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const { data } = await axios.get('/api/schedule/my-appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = Array.isArray(data.appointments) ? data.appointments : [];
      const now = Date.now();
      const filtered = items
        .filter(a => a.status === 'Scheduled' && new Date(a.end).getTime() >= now)
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 3);
      setUpcoming(filtered);
    } catch {
      setUpcoming([]);
    }
  };

  // Load my reviews
  const loadReviews = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token') || '';
      const cfg = { headers: { Authorization: `Bearer ${token}` } };

      const summary = await axios.get(`/api/mediators/${id}/review-summary`, cfg);
      setAvgRating(summary.data?.avgRating ?? 0);
      setReviewCount(summary.data?.count ?? 0);

      const list = await axios.get(`/api/mediators/${id}/reviews?limit=20&page=1`, cfg);
      setReviews(list.data?.reviews || []);
    } catch {
      setAvgRating(0);
      setReviewCount(0);
      setReviews([]);
    }
  };

  useEffect(() => {
    load();
    loadUpcoming();
  }, []);

  useEffect(() => {
    loadReviews();
  }, [id]);

  const counts = useMemo(() => ({ assigned: cases.length }), [cases]);

  const recent = useMemo(
    () =>
      [...cases]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5),
    [cases]
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>

        <h2 style={styles.title}>Mediator Dashboard</h2>
        <p style={styles.subtitle}>
          Welcome, <strong>{name}</strong>!
        </p>
        <p style={styles.description}>
          Review cases assigned to you and track recent activity.
        </p>

        {/* Actions */}
        <div style={styles.actionsRow}>
          <button onClick={load} style={styles.refreshBtn} title="Refresh tracker">
            Refresh
          </button>
          <button
            onClick={() => navigate('/messages')}
            style={styles.messagesBtn}
            title="Open chat threads"
          >
            Open Messages
          </button>
        </div>

        {/* ✅ NEW: Mediator Profile Card with collapsible reviews */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>My Profile</h3>
          <div style={{ marginBottom: 6 }}>
            <strong>{name}</strong>
          </div>
          <div style={{ marginBottom: 8 }}>
            ⭐ {avgRating} / 5 ({reviewCount} reviews)
          </div>
          <button
            style={styles.linkBtn}
            onClick={() => setShowReviews(s => !s)}
          >
            {showReviews ? 'Hide Reviews' : 'Show Reviews'}
          </button>

          {showReviews && (
            <div style={styles.reviewScroll}>
              {reviews.length === 0 ? (
                <div style={styles.muted}>No reviews yet.</div>
              ) : (
                reviews.map((r, i) => (
                  <div key={i} style={styles.reviewBox}>
                    <div>⭐ {r.rating}</div>
                    <div style={styles.mutedSmall}>{r.comment || 'No comment'}</div>
                    <div style={styles.mutedSmall}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ✅ NEW: Scheduling (FR-8) */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Scheduling</h3>
            <button style={styles.linkBtn} onClick={() => navigate('/schedule/mediator')}>
              Manage Availability
            </button>
          </div>
          <p style={styles.muted}>
            Add availability slots and see your next sessions. Clients can only book inside your available windows.
          </p>

          {/* Upcoming mini-list */}
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {upcoming.length === 0 ? (
              <div style={styles.muted}>No upcoming sessions.</div>
            ) : (
              upcoming.map(a => (
                <div key={a._id} style={styles.listItem}>
                  <div><strong>{a.caseId?.title || 'Case'}</strong></div>
                  <div style={styles.small}>Client: {a.clientId?.name || '—'}</div>
                  <div>{new Date(a.start).toLocaleString()} — {new Date(a.end).toLocaleString()}</div>
                  <span style={styles.badge}>{a.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages info card */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Messages (Chat)</h3>
            <button style={styles.linkBtn} onClick={() => navigate('/messages')}>
              Go to Messages
            </button>
          </div>
          <p style={styles.muted}>
            Chat with clients for cases that are assigned to you. Each thread is scoped to a case.
          </p>
        </div>

        {/* Tracker */}
        <div style={styles.trackerBar}>
          <div style={{ ...styles.trackItem, background: '#dcfce7' }}>
            <div style={styles.trackLabel}>Assigned to Me</div>
            <div style={styles.trackValue}>{loading ? '—' : counts.assigned}</div>
          </div>
        </div>

        {err && <div style={styles.errorBox}>{err}</div>}

        {/* Recent Assigned Cases */}
        <div style={styles.tableCard}>
          <div style={styles.tableHeaderRow}>
            <h3 style={{ margin: 0, color: green }}>Recently Assigned</h3>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Claimant</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: 12, color: '#64748b' }}>
                    {loading ? 'Loading…' : 'No cases assigned yet.'}
                  </td>
                </tr>
              ) : (
                recent.map((c) => (
                  <tr key={c._id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700 }}>{c.title}</div>
                      <div style={styles.mutedSmall}>
                        {c.category} • {c.jurisdiction}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {c.claimantId?.name || '—'}
                      <div style={styles.mutedSmall}>{c.claimantId?.email || ''}</div>
                    </td>
                    <td style={styles.td}>{new Date(c.createdAt).toLocaleString()}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.smallBtn}
                        onClick={() => navigate(`/cases/${c._id}`)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* styles */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f5f5',
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: 1100,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    boxShadow: '0 14px 32px rgba(0,0,0,0.08)',
    padding: '28px 24px',
  },
  logoutButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: '8px 12px',
    backgroundColor: '#cc0000',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
  },
  title: { margin: 0, color: '#14532d', fontSize: '1.9rem' },
  subtitle: { margin: '6px 0 4px', color: '#334155' },
  description: { margin: 0, color: '#475569' },

  actionsRow: { display: 'flex', gap: 10, marginTop: 16, marginBottom: 10 },
  refreshBtn: {
    padding: '10px 14px',
    background: '#0f766e',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
  },
  messagesBtn: {
    padding: '10px 14px',
    background: '#0b5ed7',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
  },

  // Cards
  sectionCard: {
    background: '#fff',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 18,
    border: '1px solid #e5e7eb',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { margin: 0, color: '#0f5132' },
  linkBtn: {
    background: '#0b5ed7',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  muted: { color: '#64748b', margin: 0 },

  // Reviews
  reviewScroll: {
    maxHeight: 180,
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 8,
    background: '#f9fafb',
    marginTop: 6,
  },
  reviewBox: { borderBottom: '1px solid #e2e8f0', padding: '6px 4px' },
  mutedSmall: { color: '#94a3b8', fontSize: 12 },

  // Mini list
  listItem: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    background: '#f8fafc',
    padding: 10,
  },
  small: { fontSize: 12, color: '#64748b' },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 12,
    background: '#e0f2fe',
    color: '#075985',
    marginTop: 4,
  },

  // Tracker
  trackerBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 12,
  },
  trackItem: {
    borderRadius: 12,
    padding: 12,
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackLabel: { color: '#334155', fontWeight: 600 },
  trackValue: { color: '#14532d', fontWeight: 800, fontSize: 22 },

  // Table
  tableCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
    marginTop: 6,
    marginBottom: 14,
  },
  tableHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderBottom: '1px solid #e5e7eb',
    background: '#e7f3ec',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    background: '#e2f3e8',
    color: '#14532d',
    borderBottom: '1px solid #e5e7eb',
  },
  td: { padding: '10px 14px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' },
  smallBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    border: 'none',
    background: '#14532d',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export default MediatorDashboard;
