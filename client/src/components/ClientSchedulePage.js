// client/src/components/ClientSchedulePage.js
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const authHeaders = () => {
  const t = localStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
};
const isoLocal = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00`);

export default function ClientSchedulePage() {
  const navigate = useNavigate();
  const [me, setMe] = useState({ id: '', name: '' });

  // Eligible cases via existing threads endpoint (assigned cases)
  const [threads, setThreads] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedMediator, setSelectedMediator] = useState(null);

  // Availability for chosen mediator
  const [availability, setAvailability] = useState([]);
  // Booking fields (defaults to clicked slot)
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [note, setNote] = useState('');

  // My upcoming sessions
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (!tok) return navigate('/login');
    try {
      const d = jwtDecode(tok);
      setMe({ id: d?.id || d?._id || d?.userId || '', name: d?.name || '' });
      if (d?.role !== 'Client') navigate('/dashboard'); // guard
    } catch {
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    fetch('/api/messages/threads', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setThreads(Array.isArray(data.threads) ? data.threads : []))
      .catch(() => setThreads([]));
  }, []);

  const onPickCase = (cid) => {
    setSelectedCaseId(cid);
    const th = threads.find(t => String(t.caseId) === String(cid));
    const cp = th?.counterpart || null; // mediator
    setSelectedMediator(cp || null);
    if (cp?._id) {
      fetch(`/api/schedule/availability?mediatorId=${cp._id}`, { headers: authHeaders() })
        .then(r => r.json())
        .then(d => setAvailability(Array.isArray(d.availability) ? d.availability : []))
        .catch(() => setAvailability([]));
    } else {
      setAvailability([]);
    }
  };

  const myCases = useMemo(() => threads.map(t => ({ id: t.caseId, title: t.caseTitle, mediator: t.counterpart })), [threads]);

  const loadAppts = () => {
    fetch('/api/schedule/my-appointments', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setAppts(Array.isArray(d.appointments) ? d.appointments : []))
      .catch(() => setAppts([]));
  };
  useEffect(() => { loadAppts(); }, []);

  const quickFillFromSlot = (slot) => {
    // fill date/time from slot start/end (local)
    const s = new Date(slot.start);
    const e = new Date(slot.end);
    const pad = (n) => (n < 10 ? `0${n}` : String(n));
    const d = `${s.getFullYear()}-${pad(s.getMonth()+1)}-${pad(s.getDate())}`;
    const st = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
    const et = `${pad(e.getHours())}:${pad(e.getMinutes())}`;
    setDate(d);
    setStartTime(st);
    setEndTime(et);
  };

  const book = async (e) => {
    e.preventDefault();
    if (!selectedCaseId || !selectedMediator?._id) return alert('Pick a case first');
    const start = isoLocal(date, startTime);
    const end = isoLocal(date, endTime);
    if (end <= start) return alert('End time must be after start time');

    const res = await fetch('/api/schedule/appointments', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        caseId: selectedCaseId,
        start: start.toISOString(),
        end: end.toISOString(),
        note,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.message || 'Failed to book');
    alert('Session scheduled!');
    setNote('');
    loadAppts();
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    const r = await fetch(`/api/schedule/appointments/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return alert(d.message || 'Failed to cancel');
    loadAppts();
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={{ justifySelf: 'start' }}>
          <Link to="/dashboard" style={S.link}>&larr; Back to Dashboard</Link>
        </div>
        <h3 style={{ margin: 0 }}>Schedule a Session</h3>
        <div />
      </div>

      {/* Pick case */}
      <div style={S.card}>
        <div style={S.row}>
          <label style={S.label}>Choose Case</label>
          <select value={selectedCaseId} onChange={(e) => onPickCase(e.target.value)} style={S.input}>
            <option value="">— Select —</option>
            {myCases.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        {selectedMediator && (
          <div style={{ color: '#475569', marginTop: 8 }}>
            Mediator: <strong>{selectedMediator.name}</strong> {selectedMediator.role ? `(${selectedMediator.role})` : ''}
          </div>
        )}
      </div>

      {/* Mediator availability */}
      <div style={S.card}>
        <h4 style={{ marginTop: 0 }}>Mediator Availability</h4>
        {availability.length === 0 ? (
          <div style={S.muted}>No availability found (or pick a case).</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
            {availability.map(a => (
              <div key={a._id} style={S.slot}>
                <div style={S.slotTime}>
                  {new Date(a.start).toLocaleString()} — {new Date(a.end).toLocaleString()}
                </div>
                <button style={S.btn} onClick={() => quickFillFromSlot(a)}>Use This Slot</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking form */}
      <form onSubmit={book} style={S.card}>
        <h4 style={{ marginTop: 0 }}>Book Session</h4>
        <div style={S.grid2}>
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
            <label style={S.label}>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} style={S.input} placeholder="e.g., focus topics" />
          </div>
        </div>
        <button type="submit" style={S.primary}>Schedule</button>
      </form>

      {/* My sessions */}
      <div style={S.card}>
        <h4 style={{ marginTop: 0 }}>My Upcoming Sessions</h4>
        {appts.length === 0 ? (
          <div style={S.muted}>Nothing scheduled yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {appts.map(a => (
              <div key={a._id} style={S.appt}>
                <div style={{ fontWeight: 700 }}>{a.caseId?.title || 'Case'}</div>
                <div style={S.sm}>With: {a.mediatorId?.name || 'Mediator'}</div>
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
  label: { width: 120, color: '#475569' },
  input: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' },
  muted: { color: '#64748b' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 },
  btn: { border: '1px solid #0b5ed7', background: '#fff', color: '#0b5ed7', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
  primary: { border: '1px solid #14532d', background: '#14532d', color: '#fff', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 6 },
  slot: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#f8fafc' },
  slotTime: { marginBottom: 6, color: '#111827' },
  appt: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#f8fafc', display: 'grid', gap: 4, gridTemplateColumns: '1fr auto', alignItems: 'center' },
  sm: { color: '#475569', fontSize: 13 },
  badge: { justifySelf: 'start', fontSize: 12, padding: '2px 8px', borderRadius: 9999, background: '#e0f2fe', color: '#075985', marginTop: 4 },
  cancel: { justifySelf: 'end', border: '1px solid #991b1b', background: '#fff', color: '#991b1b', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
};
