// client/src/components/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [pendingMediators, setPendingMediators] = useState([]);
  const [approvedMediators, setApprovedMediators] = useState([]);
  const [clients, setClients] = useState([]);

  // Track in-flight actions per user-id (disables buttons on that row)
  const [workingById, setWorkingById] = useState({});

  // ===== Detail modal state =====
  const [showDetail, setShowDetail] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [detailProfile, setDetailProfile] = useState(null); // mediator profile
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get('/api/users/all', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setPendingMediators(data.pendingMediators || []);
        setApprovedMediators(data.approvedMediators || []);
        setClients(data.clients || []);
      } catch (err) {
        console.error('Failed to load users:', err);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };
    fetchUsers();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // ===== Approve Mediator =====
  const approveMediator = async (u) => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    setWorkingById((m) => ({ ...m, [u._id]: true }));
    try {
      const { data } = await axios.patch(
        `/api/users/mediators/${u._id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = data?.user || u;
      setPendingMediators((list) => list.filter((x) => x._id !== u._id));
      setApprovedMediators((list) => [updated, ...list]);

      if (detailUser && detailUser._id === u._id) {
        setDetailUser(updated);
      }
    } catch (err) {
      console.error('Approve mediator failed:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      alert(`Approve failed: ${msg}`);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setWorkingById((m) => {
        const n = { ...m };
        delete n[u._id];
        return n;
      });
    }
  };

  // ===== Deny Mediator =====
  const denyMediator = async (u) => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    const reason = window.prompt('Reason for denial? (optional)', '') || undefined;

    setWorkingById((m) => ({ ...m, [u._id]: true }));
    try {
      await axios.patch(
        `/api/users/mediators/${u._id}/deny`,
        reason ? { reason } : {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPendingMediators((list) => list.filter((x) => x._id !== u._id));

      if (detailUser && detailUser._id === u._id) {
        setShowDetail(false);
        setDetailUser(null);
        setDetailProfile(null);
      }
    } catch (err) {
      console.error('Deny mediator failed:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      alert(`Deny failed: ${msg}`);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setWorkingById((m) => {
        const n = { ...m };
        delete n[u._id];
        return n;
      });
    }
  };

  // ===== Open "Check Detail" (fetch user + mediator profile) =====
  const openDetail = async (u) => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    setShowDetail(true);
    setDetailUser(null);
    setDetailProfile(null);
    setDetailLoading(true);
    setDetailError('');

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1) Fetch base user
      const userRes = await axios.get(`/api/users/${u._id}`, { headers });
      setDetailUser(userRes?.data?.user || u);

      // 2) Try primary profile path
      try {
        const profileRes = await axios.get(`/api/mediator-profiles/${u._id}`, { headers });
        setDetailProfile(profileRes?.data?.profile || null);
      } catch (err1) {
        // 3) Fallback to alias path to avoid any param route collision
        try {
          const profileRes2 = await axios.get(`/api/mediator-profiles/user/${u._id}`, { headers });
          setDetailProfile(profileRes2?.data?.profile || null);
        } catch (err2) {
          const msg =
            err2?.response?.data?.message ||
            err2?.response?.statusText ||
            'Could not load mediator profile.';
          setDetailProfile(null);
          setDetailError(`Profile error: ${msg}`);
        }
      }
    } catch (err) {
      console.error('Fetch detail failed:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetailUser(null);
    setDetailProfile(null);
    setDetailError('');
  };

  // ===== Ban (works for any role) =====
  const banUser = async (u) => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    setWorkingById((m) => ({ ...m, [u._id]: true }));
    try {
      await axios.patch(`/api/users/${u._id}/ban`, {}, { headers: { Authorization: `Bearer ${token}` } });

      setApprovedMediators((list) => list.filter((x) => x._id !== u._id));
      setClients((list) => list.filter((x) => x._id !== u._id));
      setPendingMediators((list) => list.filter((x) => x._id !== u._id));

      if (detailUser && detailUser._id === u._id) {
        setShowDetail(false);
        setDetailUser(null);
        setDetailProfile(null);
      }
    } catch (err) {
      console.error('Ban user failed:', err);
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      alert(`Ban failed: ${msg}`);
    } finally {
      setWorkingById((m) => {
        const n = { ...m };
        delete n[u._id];
        return n;
      });
    }
  };

  const Pill = ({ children }) => (
    <span style={styles.pill}>{children}</span>
  );

  const renderTable = (title, data, actions) => (
    <div style={styles.tableContainer}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            {actions.map((a, i) => (
              <th key={i} style={styles.th}>{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((u) => {
            const isBusy = !!workingById[u._id];
            return (
              <tr key={u._id}>
                <td style={styles.td}>{u.name}</td>
                <td style={styles.td}>{u.email}</td>
                {actions.map((a, i) => (
                  <td key={i} style={styles.td}>
                    <button
                      onClick={() => a.handler(u)}
                      disabled={isBusy}
                      style={{
                        ...styles.actionButton,
                        opacity: isBusy ? 0.6 : 1,
                        pointerEvents: isBusy ? 'none' : 'auto',
                        backgroundColor: a.color || styles.actionButton.backgroundColor,
                      }}
                    >
                      {isBusy && a.primary ? 'Working...' : a.label}
                    </button>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={styles.container}>
      <button onClick={handleLogout} style={styles.logoutButton}>
        Logout
      </button>

      <h1 style={styles.header}>Admin Dashboard</h1>

      <div style={styles.toolbar}>
        <button
          onClick={() => navigate('/admin/cases')}
          style={styles.casesButton}
          title="Review submitted cases and assign mediators"
        >
          Go to Case Intake
        </button>
      </div>

      {renderTable('Pending Mediator Requests', pendingMediators, [
        { label: 'Accept', handler: approveMediator, primary: true, color: '#0f5132' },
        { label: 'Check Detail', handler: openDetail, color: '#14532d' },
        { label: 'Deny', handler: denyMediator, color: '#7f1d1d' },
      ])}

      {renderTable('Approved Mediators', approvedMediators, [
        { label: 'Ban', handler: banUser, color: '#7f1d1d' },
      ])}

      {renderTable('Clients', clients, [
        { label: 'Ban', handler: banUser, color: '#7f1d1d' },
      ])}

      {/* ===== Detail Modal ===== */}
      {showDetail && (
        <div style={styles.modalOverlay} onClick={closeDetail}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>User Details</h3>
              <button onClick={closeDetail} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.modalBody}>
              {detailLoading && <p>Loading...</p>}
              {!detailLoading && detailError && (
                <p style={{ color: '#b91c1c' }}>Error: {detailError}</p>
              )}
              {!detailLoading && !detailError && detailUser && (
                <>
                  {/* Top row: basic identity */}
                  <div style={{ lineHeight: 1.6, marginBottom: 10 }}>
                    <div><strong>Name:</strong> {detailUser.name}</div>
                    <div><strong>Email:</strong> {detailUser.email}</div>
                    <div><strong>Role:</strong> {detailUser.role}</div>
                    {'status' in detailUser && (
                      <div><strong>Status:</strong> {detailUser.status}</div>
                    )}
                    {detailUser.createdAt && (
                      <div>
                        <strong>Created:</strong>{' '}
                        {new Date(detailUser.createdAt).toLocaleString()}
                      </div>
                    )}
                    {detailUser.updatedAt && (
                      <div>
                        <strong>Updated:</strong>{' '}
                        {new Date(detailUser.updatedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Mediator-specific profile */}
                  {detailUser.role === 'Mediator' && (
                    <div style={styles.profileBox}>
                      <h4 style={{ margin: '0 0 6px', color: '#14532d' }}>Mediator Profile</h4>

                      {detailProfile ? (
                        <>
                          {detailProfile.profilePhotoUrl && (
                            <div style={{ marginBottom: 8 }}>
                              <img
                                src={detailProfile.profilePhotoUrl}
                                alt="profile"
                                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }}
                              />
                            </div>
                          )}

                          {detailProfile.bio && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>Bio:</strong>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{detailProfile.bio}</div>
                            </div>
                          )}

                          <div style={{ marginBottom: 8 }}>
                            <strong>Languages:</strong>{' '}
                            {Array.isArray(detailProfile.languages) && detailProfile.languages.length
                              ? detailProfile.languages.map((l, i) => <Pill key={`${l}-${i}`}>{l}</Pill>)
                              : '—'}
                          </div>

                          <div style={{ marginBottom: 8 }}>
                            <strong>Specialties:</strong>{' '}
                            {Array.isArray(detailProfile.specialties) && detailProfile.specialties.length
                              ? detailProfile.specialties.map((s, i) => <Pill key={`${s}-${i}`}>{s}</Pill>)
                              : '—'}
                          </div>

                          <div style={{ marginBottom: 8 }}>
                            <strong>Location:</strong>{' '}
                            {(detailProfile.location?.city || '—')},{' '}
                            {(detailProfile.location?.country || '—')}
                          </div>

                          <div style={{ marginBottom: 4 }}>
                            <strong>Experience:</strong>{' '}
                            {detailProfile.yearsExperience ?? 0} years
                          </div>
                        </>
                      ) : (
                        <div style={{ color: '#64748b' }}>
                          No mediator profile found for this user.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={styles.modalFooter}>
              {detailUser && detailUser.role === 'Mediator' && detailUser.status === 'Pending' && (
                <>
                  <button
                    style={{ ...styles.actionButton, marginRight: 8 }}
                    onClick={() => approveMediator(detailUser)}
                    disabled={!!workingById[detailUser._id]}
                  >
                    Approve
                  </button>
                  <button
                    style={{ ...styles.actionButton, backgroundColor: '#7f1d1d' }}
                    onClick={() => denyMediator(detailUser)}
                    disabled={!!workingById[detailUser._id]}
                  >
                    Deny
                  </button>
                </>
              )}
              {detailUser && detailUser.status === 'Accepted' && (
                <button
                  style={{ ...styles.actionButton, backgroundColor: '#7f1d1d' }}
                  onClick={() => banUser(detailUser)}
                  disabled={!!workingById[detailUser._id]}
                >
                  Ban
                </button>
              )}
              <button onClick={closeDetail} style={{ ...styles.actionButton, backgroundColor: '#475569' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    padding: '30px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  logoutButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  header: {
    fontSize: '2rem',
    color: '#14532d',
    textAlign: 'center',
    marginBottom: '16px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '20px',
  },
  casesButton: {
    padding: '8px 14px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#0f766e',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: '#0f5132',
    marginBottom: '10px',
  },
  tableContainer: {
    marginBottom: '28px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#d1e7dd',
    color: '#14532d',
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #eee',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#0f5132',
    color: '#fff',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: '#d1e7dd',
    color: '#0f5132',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    lineHeight: 1,
    color: '#0f5132',
  },
  modalBody: {
    padding: '16px',
    minHeight: 100,
  },
  modalFooter: {
    padding: '12px 16px',
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    borderTop: '1px solid #eee',
  },
  profileBox: {
    borderTop: '1px dashed #e5e7eb',
    paddingTop: 10,
    marginTop: 6,
  },
  pill: {
    display: 'inline-block',
    padding: '2px 8px',
    margin: '0 6px 6px 0',
    background: '#e2f3ea',
    color: '#0f5132',
    borderRadius: 9999,
    fontSize: 12,
    border: '1px solid #cfead9',
  },
};

export default AdminDashboard;
