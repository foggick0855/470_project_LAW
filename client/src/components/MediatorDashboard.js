// client/src/components/MediatorDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const green = '#14532d';

const MediatorDashboard = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('Mediator');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Auth + role guard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      const decoded = jwtDecode(token);
      setName(decoded.name || 'Mediator');
      if (decoded.role !== 'Mediator') {
        // If someone lands here by mistake, bounce to general router
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

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({ assigned: cases.length }),
    [cases]
  );

  const recent = useMemo(
    () => [...cases].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5),
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
    right: 14, // keep logout on the right
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
  mutedSmall: { color: '#64748b', fontSize: 12 },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 10,
  },
};

export default MediatorDashboard;
