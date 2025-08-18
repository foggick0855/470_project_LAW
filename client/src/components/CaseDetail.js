import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function CaseDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [caze, setCaze] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Optional guard: clients only (owner enforced by backend anyway)
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

  const load = async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`/api/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCaze(data.case);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      setError(msg);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitDraft = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.patch(`/api/cases/${id}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCaze(data.case);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const removeAttachment = async (attId) => {
    if (!window.confirm('Remove this attachment?')) return;
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.delete(`/api/cases/${id}/attachments/${attId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCaze((prev) => ({ ...prev, attachments: data.attachments }));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status ? `Error ${err.response.status}` : 'Network error');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={headerRow}>
          <h2 style={{ margin: 0, color: '#14532d' }}>Case Detail</h2>
          <button style={btn} onClick={() => navigate('/cases')}>Back to My Cases</button>
        </div>

        {error && <div style={errorBox}>{error}</div>}
        {!caze ? (
          <div>Loading…</div>
        ) : (
          <>
            <div style={grid2}>
              <div>
                <div style={label}>Title</div>
                <div style={value}>{caze.title}</div>
              </div>
              <div>
                <div style={label}>Status</div>
                <span style={{ ...chip, background: caze.status === 'Draft' ? '#fde68a' : '#bbf7d0', color: '#065f46' }}>
                  {caze.status}
                </span>
              </div>
            </div>

            <div style={grid2}>
              <div>
                <div style={label}>Category</div>
                <div style={value}>{caze.category}</div>
              </div>
              <div>
                <div style={label}>Jurisdiction</div>
                <div style={value}>{caze.jurisdiction}</div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={label}>Description</div>
              <div style={value}>{caze.description}</div>
            </div>

            <div style={grid3}>
              <div>
                <div style={label}>Amount in Dispute</div>
                <div style={value}>{typeof caze.amountInDispute === 'number' ? caze.amountInDispute : '—'}</div>
              </div>
              <div>
                <div style={label}>Confidential</div>
                <div style={value}>{caze.confidential ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div style={label}>Urgent</div>
                <div style={value}>{caze.urgent ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={label}>Respondent</div>
              <div style={value}>
                {caze?.respondent?.name || '—'} {caze?.respondent?.email ? `• ${caze.respondent.email}` : ''}
                {caze?.respondent?.phone ? ` • ${caze.respondent.phone}` : ''}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={label}>Attachments</div>
              {(!caze.attachments || caze.attachments.length === 0) ? (
                <div style={muted}>No attachments</div>
              ) : (
                <div style={list}>
                  {caze.attachments.map((a) => (
                    <div key={a._id} style={attRow}>
                      <a href={a.url} target="_blank" rel="noreferrer" style={{ color: '#0f766e' }}>
                        {a.filename}
                      </a>
                      <div style={mutedSmall}>{(a.size / (1024 * 1024)).toFixed(2)} MB</div>
                      {caze.status === 'Draft' && (
                        <button style={removeBtn} onClick={() => removeAttachment(a._id)} disabled={busy}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {caze.status === 'Draft' && (
              <div style={{ marginTop: 16 }}>
                <button style={btnPrimary} onClick={submitDraft} disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit Draft'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const wrap = { minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16 };
const card = { background: '#fff', width: '100%', maxWidth: 900, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: 20, border: '1px solid #e5e7eb' };
const headerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };
const label = { fontSize: 13, color: '#334155', marginBottom: 6 };
const value = { fontSize: 15, color: '#0f172a' };
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 };
const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 6 };
const chip = { padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 };
const list = { display: 'grid', gap: 8, marginTop: 6 };
const attRow = { display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px' };
const muted = { color: '#475569' };
const mutedSmall = { color: '#64748b', fontSize: 12 };
const btn = { padding: '8px 12px', borderRadius: 8, border: 'none', background: '#475569', color: '#fff', cursor: 'pointer', fontWeight: 600 };
const btnPrimary = { padding: '10px 14px', borderRadius: 8, border: 'none', background: '#14532d', color: '#fff', cursor: 'pointer', fontWeight: 700, minWidth: 140 };
const errorBox = { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 10 };
