// client/src/components/MyCases.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function MyCases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [status, setStatus] = useState('All');
  const [error, setError] = useState('');

  // Guard: signed-in Client only
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      const role = jwtDecode(token)?.role;
      if (role !== 'Client') navigate('/dashboard');
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCases = async () => {
      setError('');
      try {
        const token = localStorage.getItem('token');
        const q = status === 'All' ? '' : `?status=${encodeURIComponent(status)}`;
        const { data } = await axios.get(`/api/cases/mine${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCases(data.cases || []);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
        setError(msg);
      }
    };
    fetchCases();
  }, [status]);

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={headerRow}>
          <h2 style={{ margin: 0, color: '#14532d' }}>My Cases</h2>
          <div style={controlsRow}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={select}>
              <option>All</option>
              <option>Draft</option>
              <option>Submitted</option>
            </select>
            <button style={btnSecondary} onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
            <button style={btnPrimary} onClick={() => navigate('/cases/new')}>
              New Case
            </button>
          </div>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        {cases.length === 0 ? (
          <div style={{ color: '#475569' }}>No cases yet.</div>
        ) : (
          <div style={grid}>
            {cases.map((c) => (
              <div key={c._id} style={item}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{c.title}</div>
                  <span
                    style={{
                      ...chip,
                      background: c.status === 'Draft' ? '#fde68a' : '#bbf7d0',
                      color: '#065f46',
                    }}
                  >
                    {c.status}
                  </span>
                </div>
                <div style={muted}>Category: {c.category}</div>
                <div style={muted}>Jurisdiction: {c.jurisdiction}</div>
                <div style={muted}>Created: {new Date(c.createdAt).toLocaleString()}</div>
                <button style={btnOpen} onClick={() => navigate(`/cases/${c._id}`)}>
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* styles */
const wrap = {
  minHeight: '100vh',
  background: '#f5f5f5',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: 16,
};
const card = {
  background: '#fff',
  width: '100%',
  maxWidth: 1000,
  borderRadius: 12,
  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
  padding: 20,
  border: '1px solid #e5e7eb',
};
const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
};
const controlsRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};
const select = {
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
};
const btnPrimary = {
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: '#14532d',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
};
const btnSecondary = {
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: '#475569',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
};
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: 12,
};
const item = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 12,
  background: '#f8fafc',
};
const chip = {
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};
const btnOpen = {
  marginTop: 10,
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: '#14532d',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
};
const muted = { fontSize: 13, color: '#475569', marginTop: 2 };
const errorBox = {
  background: '#fee2e2',
  color: '#991b1b',
  border: '1px solid #fecaca',
  borderRadius: 8,
  padding: '10px 12px',
  marginBottom: 10,
};
