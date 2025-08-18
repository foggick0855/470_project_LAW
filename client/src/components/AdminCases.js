// client/src/components/AdminCases.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

export default function AdminCases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [mediators, setMediators] = useState([]);
  const [pick, setPick] = useState({}); // caseId -> mediatorId
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  // Guard admin only
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      const role = jwtDecode(token)?.role;
      if (role !== 'Admin') navigate('/dashboard');
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const load = async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');

      const [casesRes, usersRes] = await Promise.all([
        axios.get('/api/cases/submitted', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/users/all', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setCases(casesRes.data.cases || []);
      setMediators(usersRes.data.approvedMediators || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      setError(msg);
    }
  };

  useEffect(() => { load(); }, []);

  const assign = async (caseId) => {
    const mediatorId = pick[caseId];
    if (!mediatorId) {
      alert('Select a mediator first');
      return;
    }
    setBusyId(caseId);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.patch(
        `/api/cases/${caseId}/assign`,
        { mediatorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update this case in the list
      setCases((list) => list.map((c) => (c._id === caseId ? data.case : c)));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      setError(msg);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={headerRow}>
          <h2 style={{ margin: 0, color: '#14532d' }}>Case Intake</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnSecondary} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <button style={btn} onClick={load}>Refresh</button>
          </div>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        {cases.length === 0 ? (
          <div style={{ color: '#475569' }}>No submitted cases yet.</div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Title</th>
                <th style={th}>Claimant</th>
                <th style={th}>Status</th>
                <th style={th}>Created</th>
                <th style={th}>Mediator</th>
                <th style={th}>Assign</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const mAssigned = c.mediatorId ? (c.mediatorId.name || '—') : '—';
                return (
                  <tr key={c._id}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{c.title}</div>
                      <div style={mutedSmall}>{c.category} • {c.jurisdiction}</div>
                    </td>
                    <td style={td}>
                      {c.claimantId?.name || '—'}
                      <div style={mutedSmall}>{c.claimantId?.email || ''}</div>
                    </td>
                    <td style={td}>
                      <span style={{ ...chip, background: c.status === 'Submitted' ? '#fde68a' : '#bbf7d0' }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={td}>{new Date(c.createdAt).toLocaleString()}</td>
                    <td style={td}>{mAssigned}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          value={pick[c._id] || ''}
                          onChange={(e) => setPick((p) => ({ ...p, [c._id]: e.target.value }))}
                          style={select}
                        >
                          <option value="">Select mediator…</option>
                          {mediators.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name} ({m.email})
                            </option>
                          ))}
                        </select>
                        <button
                          style={btn}
                          onClick={() => assign(c._id)}
                          disabled={busyId === c._id}
                        >
                          {busyId === c._id ? 'Assigning…' : 'Assign'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* styles */
const wrap = { minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16 };
const card = { background: '#fff', width: '100%', maxWidth: 1100, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: 20, border: '1px solid #e5e7eb' };
const headerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };
const btn = { padding: '8px 12px', borderRadius: 8, border: 'none', background: '#14532d', color: '#fff', cursor: 'pointer', fontWeight: 600 };
const btnSecondary = { padding: '8px 12px', borderRadius: 8, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer', fontWeight: 600 };
const errorBox = { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 10 };
const table = { width: '100%', borderCollapse: 'collapse' };
const th = { textAlign: 'left', padding: '10px', borderBottom: '2px solid #e5e7eb', background: '#e2f3e8', color: '#14532d' };
const td = { padding: '10px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' };
const chip = { padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#065f46' };
const select = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff' };
const mutedSmall = { color: '#64748b', fontSize: 12 };
