// client/src/components/MediatorSchedulePage.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const authHeaders = () => {
  const t = localStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
};
const isoLocal = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00`);

export default function MediatorSchedulePage() {
  const navigate = useNavigate();

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [note, setNote] = useState('');

  const [availability, setAvailability] = useState([]);
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (!tok) return navigate('/login');
    try {
      const d = jwtDecode(tok);
      if (d?.role !== 'Mediator') navigate('/dashboard');
    } catch {
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const load = () => {
    fetch('/api/schedule/my-availability', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setAvailability(Array.isArray(d.availability) ? d.availability : []))
      .catch(() => setAvailability([]));

    fetch('/api/schedule/my-appointments', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setAppts(Array.isArray(d.appointments) ? d.appointments : []))
      .catch(() => setAppts([]));
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    const start = isoLocal(date, startTime);
    const end = isoLocal(date, endTime);
    if (end <= start) return alert('End time must be after start time');
    const r = await fetch('/api/schedule/availability', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ start: start.toISOString(), end: end.toISOString(), note }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return alert(d.message || 'Failed to save');
    setNote('');
    load();
  };

  const removeSlot = async (id) => {
    if (!window.confirm('Delete this availability slot?')) return;
    const r = await fetch(`/api/schedule/availability/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return alert(d.message || 'Failed');
    load();
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    const r = await fetch(`/api/schedule/appointments/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return alert(d.message || 'Failed');
    load();
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{ justifySelf: 'start' }}>
          <Link to="/dashboard" style={S.link}>&larr; Back to Dashboard</Link>
        </div>
        <h3 style={{ margin: 0 }}>My Availability & Sessions</h3>
        <div />
      </div>

      {/* Add availability */}
      <form onSubmit={add} style={S.card}>
        <h4 style={{ marginTop: 0 }}>Add Availability</h4>
        <div style={S.grid4}>
          <div style={S.row}>
            <label style={S.label}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.input} required />
          </div>
          <div style={S.row}>
            <label style={S.label}>Start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={S.input} required />
          </div>
          <div style={S.row}>
            <label style={S.label}>End</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={S.input} required />
          </div>
          <div style={S.row}>
            <label style={S.label}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} style={S.input} placeholder="optional" />
          </div>
        </div>
        <button type="submit" style={S.primary}>Add Slot</button>
      </form>

      {/* My availability list */}
      <div style={S.card}>
        <h4 style={{ marginTop: 0 }}>My Availability</h4>
        {availability.length === 0 ? (
          <div style={S.muted}>No availability yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 10 }}>
            {availability.map(a => (
              <div key={a._id} style={S.slot}>
                <div style={S.slotTime}>
                  {new Date(a.start).toLocaleString()} — {new Date(a.end).toLocaleString()}
                </div>
                {a.note && <div style={S.sm}>{a.note}</div>}
                <button style={S.danger} onClick={() => removeSlot(a._id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming sessions */}
      <div style={S.card}>
        <h4 style={{ marginTop: 0 }}>Upcoming Sessions</h4>
        {appts.length === 0 ? (
          <div style={S.muted}>No scheduled sessions.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {appts.map(a => (
              <div key={a._id} style={S.appt}>
                <div style={{ fontWeight: 700 }}>{a.caseId?.title || 'Case'}</div>
                <div style={S.sm}>Client: {a.clientId?.name || '—'}</div>
                <div>{new Date(a.start).toLocaleString()} — {new Date(a.end).toLocaleString()}</div>
                <div style={S.badge}>{a.status}</div>
                {a.status === 'Scheduled' && (
                  <button style={S.cancel} onClick={() => cancel(a._id)}>Cancel</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  wrap: { maxWidth: 980, margin: '0 auto', padding: 16 },
  header: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: 10 },
  link: { textDecoration: 'none', color: '#0b5ed7', fontWeight: 600 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 },
  row: { display: 'flex', gap: 8, alignItems: 'center' },
  label: { width: 100, color: '#475569' },
  input: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' },
  muted: { color: '#64748b' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 },
  primary: { border: '1px solid #14532d', background: '#14532d', color: '#fff', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 6 },
  slot: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#f8fafc', display: 'grid', gap: 6 },
  slotTime: { color: '#111827' },
  sm: { color: '#475569', fontSize: 13 },
  danger: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, justifySelf: 'start' },
  appt: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#f8fafc', display: 'grid', gap: 4, gridTemplateColumns: '1fr auto', alignItems: 'center' },
  badge: { justifySelf: 'start', fontSize: 12, padding: '2px 8px', borderRadius: 9999, background: '#e0f2fe', color: '#075985', marginTop: 4 },
  cancel: { justifySelf: 'end', border: '1px solid #991b1b', background: '#fff', color: '#991b1b', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
};
