// client/src/components/ClientDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

/** Constant options (match your register form so spelling stays consistent) */
const LANG_OPTIONS = [
  'English', 'Bengali', 'Hindi', 'Urdu', 'Arabic',
  'Chinese', 'French', 'Spanish', 'German', 'Tamil',
];

const SPECIALTY_OPTIONS = [
  'Family', 'Commercial', 'Workplace', 'Property',
  'Online ADR', 'Consumer', 'Community', 'Financial',
];

const ClientDashboard = () => {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  // ----- auth gate (same as before) -----
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decoded = jwtDecode(token);
      setName(decoded.name || 'Client');
    } catch (err) {
      console.error('Invalid token:', err);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // ===== FR-8: Upcoming sessions (mini list) =====
  const [upcoming, setUpcoming] = useState([]);
  const loadUpcoming = async () => {
    try {
      const { data } = await axios.get('/api/schedule/my-appointments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const items = Array.isArray(data.appointments) ? data.appointments : [];
      const now = Date.now();
      const filtered = items
        .filter(a => a.status === 'Scheduled' && new Date(a.end).getTime() >= now)
        .sort((a,b) => new Date(a.start) - new Date(b.start))
        .slice(0, 3);
      setUpcoming(filtered);
    } catch {
      setUpcoming([]);
    }
  };
  useEffect(() => { loadUpcoming(); }, []);

  // ===== FR-6: Mediator Directory state =====
  const [filters, setFilters] = useState({
    q: '',
    languages: [],
    specialties: [],
    country: '',
    city: '',
    yearsMin: '',
    yearsMax: '',
    rateMin: '',
    rateMax: '',
    // experience_desc | experience_asc | name_asc | name_desc | rate_asc | rate_desc | rating_desc
    sort: 'experience_desc',
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // array of mediators
  const [error, setError] = useState('');

  // Details modal
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState(null); // { user, profile }
  const [detailErr, setDetailErr] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  // Helpers to update filters
  const onText = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const toggleFromList = (key, val) => {
    setFilters((f) => {
      const arr = new Set(f[key]);
      if (arr.has(val)) arr.delete(val);
      else arr.add(val);
      return { ...f, [key]: Array.from(arr) };
    });
  };
  const resetFilters = () =>
    setFilters({
      q: '',
      languages: [],
      specialties: [],
      country: '',
      city: '',
      yearsMin: '',
      yearsMax: '',
      rateMin: '',
      rateMax: '',
      sort: 'experience_desc',
    });

  // Build query params to match backend controller
  const buildParams = () => {
    const p = {};
    if (filters.q) p.q = filters.q;
    if (filters.country) p.country = filters.country;
    if (filters.city) p.city = filters.city;
    if (filters.yearsMin !== '' && !isNaN(Number(filters.yearsMin))) p.minExp = Number(filters.yearsMin);
    if (filters.yearsMax !== '' && !isNaN(Number(filters.yearsMax))) p.maxExp = Number(filters.yearsMax);
    if (filters.rateMin !== '' && !isNaN(Number(filters.rateMin))) p.minRate = Number(filters.rateMin);
    if (filters.rateMax !== '' && !isNaN(Number(filters.rateMax))) p.maxRate = Number(filters.rateMax);

    if (filters.sort) {
      // Map UI values to backend sort keys
      const sortMap = {
        experience_desc: 'expDesc',
        experience_asc: 'expAsc',
        name_asc: 'nameAsc',
        name_desc: 'nameDesc',
        rate_asc: 'rateAsc',
        rate_desc: 'rateDesc',
        rating_desc: 'ratingDesc',
      };
      p.sort = sortMap[filters.sort] || 'expDesc';
    }

    // Backend expects singular names, comma-separated (it splits on ',')
    if (filters.languages.length) p.language = filters.languages.join(',');
    if (filters.specialties.length) p.specialization = filters.specialties.join(',');
    return p;
  };

  // Search action
  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/mediators', {
        params: buildParams(),
      });
      // Accept both shapes: {items:[...]} or {mediators:[...]} or raw array
      const arr = Array.isArray(data)
        ? data
        : data.items || data.mediators || data.results || [];
      setResults(arr);
    } catch (err) {
      console.error('Mediator search failed:', err);
      setError(
        err?.response?.data?.message ||
          (err?.response?.status ? `Error ${err.response.status}` : 'Network error')
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    search(); // run once with empty filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open detail modal (public via /api/mediators/:id or protected via /api/mediator-profiles/:userId)
  const openDetail = async (userId) => {
    setShowDetail(true);
    setDetail(null);
    setDetailErr('');
    setDetailLoading(true);

    try {
      // Try public show route first (if you implemented it)
      try {
        const { data } = await axios.get(`/api/mediators/${userId}`);
        // expect { user, profile } or { mediator: { user, profile } }
        const payload = data.mediator || data;
        if (payload?.user || payload?.profile) {
          setDetail({ user: payload.user, profile: payload.profile });
        } else {
          // fallback to protected profile route
          throw new Error('Fallback to protected route');
        }
      } catch {
        const { data } = await axios.get(`/api/mediator-profiles/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDetail({ user: null, profile: data.profile });
      }
    } catch (err) {
      console.error('Load detail failed:', err);
      setDetailErr(
        err?.response?.data?.message ||
          (err?.response?.status ? `Error ${err.response.status}` : 'Network error')
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetail(null);
    setDetailErr('');
    setDetailLoading(false);
  };

  // Normalize each item from the API to a consistent shape for the card
  const normalizeItem = (row) => {
    // Many backends return { user, profile }, but handle simple shapes too
    const user = row.user || row._user || row.u || null;
    const profile = row.profile || row || {};
    return { user, profile };
  };

  return (
    <div style={styles.container}>
      <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>

      <h2 style={styles.title}>Welcome to Your Dashboard</h2>
      <p style={styles.subtitle}>Hello, <strong>{name}</strong>!</p>

      {/* ===== NEW: Messages quick access ===== */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Messages (Chat)</h3>
          <button style={styles.linkBtn} onClick={() => navigate('/messages')}>
            Open Messages
          </button>
        </div>
        <p style={styles.muted}>Chat with your assigned mediator for accepted cases.</p>
      </div>

      {/* ===== NEW: Schedule Session (FR-8 entry point + upcoming) ===== */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Schedule Session</h3>
          <button style={styles.primaryBtn} onClick={() => navigate('/schedule/client')}>
            Open Scheduler
          </button>
        </div>
        <p style={styles.muted}>Pick an assigned case and choose a time from your mediator’s availability.</p>

        <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
          {upcoming.length === 0 ? (
            <div style={styles.muted}>No upcoming sessions yet.</div>
          ) : (
            upcoming.map(a => (
              <div key={a._id} style={styles.listItem}>
                <div><strong>{a.caseId?.title || 'Case'}</strong></div>
                <div style={styles.small}>With: {a.mediatorId?.name || 'Mediator'}</div>
                <div>{new Date(a.start).toLocaleString()} — {new Date(a.end).toLocaleString()}</div>
                <span style={styles.badge}>{a.status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== Quick Case Tracker ===== */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Case Tracker</h3>
          <button style={styles.linkBtn} onClick={() => navigate('/cases')}>Open Cases Page</button>
        </div>
        <p style={styles.muted}>Submit, view, and track your dispute cases.</p>
      </div>

      {/* ===== FR-6: Mediator Directory ===== */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Find Mediators</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.ghostBtn} onClick={resetFilters}>Reset</button>
            <button style={styles.primaryBtn} onClick={search} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersGrid}>
          <div style={styles.filterCol}>
            <label style={styles.label}>Keyword</label>
            <input
              value={filters.q}
              onChange={onText('q')}
              placeholder="e.g., family, workplace..."
              style={styles.input}
            />
          </div>

          <div style={styles.filterCol}>
            <label style={styles.label}>Country</label>
            <input
              value={filters.country}
              onChange={onText('country')}
              placeholder="Bangladesh"
              style={styles.input}
            />
          </div>

          <div style={styles.filterCol}>
            <label style={styles.label}>City</label>
            <input
              value={filters.city}
              onChange={onText('city')}
              placeholder="Dhaka"
              style={styles.input}
            />
          </div>

          <div style={styles.filterColRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Min Experience (years)</label>
              <input
                type="number"
                min="0"
                value={filters.yearsMin}
                onChange={onText('yearsMin')}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Max Experience (years)</label>
              <input
                type="number"
                min="0"
                value={filters.yearsMax}
                onChange={onText('yearsMax')}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.filterColRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Min Rate (৳/hr)</label>
              <input
                type="number"
                min="0"
                value={filters.rateMin}
                onChange={onText('rateMin')}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Max Rate (৳/hr)</label>
              <input
                type="number"
                min="0"
                value={filters.rateMax}
                onChange={onText('rateMax')}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.filterCol}>
            <label style={styles.label}>Sort</label>
            <select
              value={filters.sort}
              onChange={onText('sort')}
              style={styles.input}
            >
              <option value="experience_desc">Experience (high → low)</option>
              <option value="experience_asc">Experience (low → high)</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="rate_asc">Rate (low → high)</option>
              <option value="rate_desc">Rate (high → low)</option>
              <option value="rating_desc">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Checkbox groups */}
        <div style={styles.checkboxGroups}>
          <div style={styles.checkboxGroup}>
            <div style={styles.groupTitle}>Languages</div>
            <div style={styles.pillBox}>
              {LANG_OPTIONS.map((l) => {
                const checked = filters.languages.includes(l);
                return (
                  <label key={l} style={{ ...styles.chkLabel, ...(checked ? styles.chkActive : {}) }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFromList('languages', l)}
                      style={styles.chkInput}
                    />
                    {l}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={styles.checkboxGroup}>
            <div style={styles.groupTitle}>Specialties</div>
            <div style={styles.pillBox}>
              {SPECIALTY_OPTIONS.map((s) => {
                const checked = filters.specialties.includes(s);
                return (
                  <label key={s} style={{ ...styles.chkLabel, ...(checked ? styles.chkActive : {}) }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFromList('specialties', s)}
                      style={styles.chkInput}
                    />
                    {s}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <div style={styles.errorBox}>Error: {error}</div>}

        {/* Results */}
        <div style={styles.resultsGrid}>
          {!loading && !error && results.length === 0 && (
            <div style={styles.muted}>No mediators match your filters yet.</div>
          )}

          {results.map((row, idx) => {
            const { user, profile } = normalizeItem(row);
            const displayName = user?.name || profile?.name || 'Mediator';
            const years = profile?.yearsExperience ?? 0;
            const city = profile?.location?.city || '—';
            const country = profile?.location?.country || '—';
            const langs = Array.isArray(profile?.languages) ? profile.languages : [];
            const specs = Array.isArray(profile?.specialties) ? profile.specialties : [];

            return (
              <div key={user?._id || idx} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardTitle}>{displayName}</div>
                    <div style={styles.cardSub}>
                      {city}, {country} • {years}y experience
                    </div>
                  </div>
                  {profile?.profilePhotoUrl ? (
                    <img
                      src={profile.profilePhotoUrl}
                      alt="profile"
                      style={styles.avatar}
                    />
                  ) : null}
                </div>

                <div style={styles.chipRow}>
                  {langs.map((l, i) => (
                    <span key={`l-${i}`} style={styles.chip}>{l}</span>
                  ))}
                </div>
                <div style={styles.chipRow}>
                  {specs.map((s, i) => (
                    <span key={`s-${i}`} style={styles.chipAlt}>{s}</span>
                  ))}
                </div>

                <div style={styles.cardActions}>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() => openDetail(user?._id || row._id)}
                  >
                    View Details
                  </button>
                  <button
                    style={styles.primaryBtn}
                    onClick={() => alert('Request flow coming soon')}
                  >
                    Request Mediation
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Details Modal ===== */}
      {showDetail && (
        <div style={styles.modalOverlay} onClick={closeDetail}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Mediator Details</h3>
              <button onClick={closeDetail} style={styles.closeBtn}>×</button>
            </div>
            <div style={styles.modalBody}>
              {detailLoading && <p>Loading...</p>}
              {!detailLoading && detailErr && (
                <div style={styles.errorBox}>Error: {detailErr}</div>
              )}
              {!detailLoading && !detailErr && detail && (
                <>
                  {detail.profile?.profilePhotoUrl && (
                    <img
                      src={detail.profile.profilePhotoUrl}
                      alt="profile"
                      style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb', marginBottom: 10 }}
                    />
                  )}
                  <div style={{ marginBottom: 8 }}>
                    <strong>Bio:</strong>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {detail.profile?.bio || '—'}
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Languages:</strong>{' '}
                    {(detail.profile?.languages || []).join(', ') || '—'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Specialties:</strong>{' '}
                    {(detail.profile?.specialties || []).join(', ') || '—'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Location:</strong>{' '}
                    {detail.profile?.location?.city || '—'},{' '}
                    {detail.profile?.location?.country || '—'}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Experience:</strong>{' '}
                    {detail.profile?.yearsExperience ?? 0} years
                  </div>
                </>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={closeDetail} style={styles.secondaryBtn}>Close</button>
              <button onClick={() => alert('Request flow coming soon')} style={styles.primaryBtn}>
                Request Mediation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============ styles ============ */
const styles = {
  container: {
    textAlign: 'left',
    padding: '2rem',
    position: 'relative',
    background: '#f6f8f7',
    minHeight: '100vh',
  },
  logoutButton: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    backgroundColor: '#cc0000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  title: {
    color: '#006400',
    fontSize: '2rem',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '1.05rem',
    marginBottom: '1.25rem',
  },

  sectionCard: {
    background: '#fff',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 18,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    margin: 0,
    color: '#0f5132',
  },
  muted: {
    color: '#64748b',
    margin: 0,
  },

  linkBtn: {
    background: '#0f766e',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  primaryBtn: {
    background: '#0f5132',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryBtn: {
    background: '#e2e8f0',
    color: '#111827',
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  ghostBtn: {
    background: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },

  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  filterCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  filterColRow: {
    display: 'flex',
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: '#475569',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    outlineColor: '#0f5132',
    fontSize: 14,
    background: '#fff',
  },

  checkboxGroups: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  checkboxGroup: {
    background: '#f9fafb',
    border: '1px dashed #e5e7eb',
    borderRadius: 10,
    padding: 10,
  },
  groupTitle: {
    fontWeight: 700,
    color: '#0f5132',
    marginBottom: 8,
  },
  pillBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chkLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 9999,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    userSelect: 'none',
  },
  chkActive: {
    background: '#e2f3ea',
    borderColor: '#b6e2cd',
    color: '#0f5132',
  },
  chkInput: { display: 'none' },

  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 14,
    marginTop: 12,
  },
  card: {
    background: '#fff',
    borderRadius: 10,
    padding: 12,
    border: '1px solid #e5e7eb',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: { fontWeight: 700, color: '#0f172a' },
  cardSub: { color: '#64748b', fontSize: 13 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: {
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 9999,
    background: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
  },
  chipAlt: {
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 9999,
    background: '#f0fdf4',
    color: '#065f46',
    border: '1px solid #bbf7d0',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid #e5e7eb',
  },
  cardActions: { display: 'flex', gap: 8, marginTop: 8 },

  // New mini-list styles
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

  // Modal
  modalOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, zIndex: 9999,
  },
  modal: {
    width: '100%', maxWidth: 560, background: '#fff',
    borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', background: '#d1e7dd', color: '#0f5132',
  },
  modalBody: { padding: 16, minHeight: 120 },
  modalFooter: { padding: '12px 16px', borderTop: '1px solid #eee', display: 'flex', gap: 8, justifyContent: 'flex-end' },

  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: '0.9rem',
    marginTop: 8,
  },

  logoutButton: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    backgroundColor: '#cc0000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default ClientDashboard;
