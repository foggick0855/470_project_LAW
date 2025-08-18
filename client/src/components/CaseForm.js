import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

export default function CaseForm() {
  const navigate = useNavigate();

  // Optional guard: only Clients should use this page
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

  const [form, setForm] = useState({
    title: '',
    category: 'Property',
    description: '',
    amountInDispute: '',
    jurisdiction: '',
    respondentName: '',
    respondentEmail: '',
    respondentPhone: '',
    confidential: false,
    urgent: false,
    agree: false, // for submit only
  });

  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const totalSize = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onFiles = (e) => {
    setError('');
    const picked = Array.from(e.target.files || []);
    const all = [...files, ...picked];

    if (all.length > MAX_FILES) {
      setError(`You can upload up to ${MAX_FILES} files.`);
      return;
    }

    for (const file of picked) {
      if (!ALLOWED.includes(file.type)) {
        setError('Only PDF, JPG, or PNG files are allowed.');
        return;
      }
      if (file.size > MAX_SIZE) {
        setError('Each file must be 10MB or smaller.');
        return;
      }
    }
    setFiles(all);
  };

  const removeFileAt = (idx) => setFiles((arr) => arr.filter((_, i) => i !== idx));

  const validateRequired = () => {
    if (!form.title || !form.description || !form.jurisdiction || !form.category) {
      setError('Please fill all required fields.');
      return false;
    }
    return true;
  };

  const submitToAPI = async (submit) => {
    setError('');
    if (!validateRequired()) return;
    if (submit && !form.agree) {
      setError('Please agree to the terms to submit.');
      return;
    }

    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        title: form.title,
        category: form.category,
        description: form.description,
        amountInDispute: form.amountInDispute ? Number(form.amountInDispute) : undefined,
        jurisdiction: form.jurisdiction,
        respondent: {
          name: form.respondentName || undefined,
          email: form.respondentEmail || undefined,
          phone: form.respondentPhone || undefined,
        },
        confidential: form.confidential,
        urgent: form.urgent,
        submit,
      };

      // 1) Create case (Draft or Submitted)
      const { data } = await axios.post('/api/cases', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const created = data?.case;
      if (!created?._id) throw new Error('Case creation failed');

      // 2) Upload attachments if any
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f) => fd.append('files', f, f.name));
        await axios.post(`/api/cases/${created._id}/attachments`, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // 3) Navigate to detail page
      navigate(`/cases/${created._id}`);
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
      <form style={card} onSubmit={(e) => e.preventDefault()}>
        <h2 style={h2}>Submit a Case</h2>
        {error && <div style={errorBox}>{error}</div>}

        <label style={label}>Title *</label>
        <input name="title" value={form.title} onChange={onChange} style={input} placeholder="Short summary of the dispute" required />

        <label style={label}>Category *</label>
        <select name="category" value={form.category} onChange={onChange} style={input}>
          <option>Property</option>
          <option>Family</option>
          <option>Employment</option>
          <option>Commercial</option>
          <option>Other</option>
        </select>

        <label style={label}>Description *</label>
        <textarea name="description" value={form.description} onChange={onChange} style={textarea} rows={6} placeholder="Explain what happened…" required />

        <div style={grid2}>
          <div>
            <label style={label}>Amount in Dispute (optional)</label>
            <input name="amountInDispute" value={form.amountInDispute} onChange={onChange} style={input} type="number" min="0" />
          </div>
          <div>
            <label style={label}>Jurisdiction *</label>
            <input name="jurisdiction" value={form.jurisdiction} onChange={onChange} style={input} placeholder="e.g., Dhaka" required />
          </div>
        </div>

        <h3 style={h3}>Respondent (optional)</h3>
        <div style={grid3}>
          <input name="respondentName" value={form.respondentName} onChange={onChange} style={input} placeholder="Respondent name" />
          <input name="respondentEmail" value={form.respondentEmail} onChange={onChange} style={input} placeholder="Respondent email" type="email" />
          <input name="respondentPhone" value={form.respondentPhone} onChange={onChange} style={input} placeholder="Respondent phone" />
        </div>

        <h3 style={h3}>Evidence</h3>
        <input type="file" multiple accept=".pdf,image/jpeg,image/png" onChange={onFiles} />
        <div style={{ fontSize: 12, color: '#475569', margin: '6px 0 10px' }}>
          Allowed: PDF, JPG, PNG. Max {MAX_FILES} files, {MAX_SIZE / (1024 * 1024)}MB each.
        </div>
        {files.length > 0 && (
          <div style={fileList}>
            {files.map((f, i) => (
              <div key={i} style={fileItem}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                <div style={{ fontSize: 12 }}>{(f.size / (1024 * 1024)).toFixed(2)} MB</div>
                <button type="button" onClick={() => removeFileAt(i)} style={removeBtn}>Remove</button>
              </div>
            ))}
            <div style={{ fontSize: 12, color: '#475569' }}>Total size: {(totalSize / (1024 * 1024)).toFixed(2)} MB</div>
          </div>
        )}

        <div style={rowBetween}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" name="confidential" checked={form.confidential} onChange={onChange} /> Confidential
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" name="urgent" checked={form.urgent} onChange={onChange} /> Mark as urgent
          </label>
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" name="agree" checked={form.agree} onChange={onChange} /> I confirm the information is accurate and I agree to the terms.
          </label>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>(Required for Submit; not required for Save Draft)</div>
        </div>

        <div style={btnRow}>
          <button type="button" onClick={() => submitToAPI(false)} style={{ ...btn, background: '#475569' }} disabled={busy}>
            {busy ? 'Working…' : 'Save Draft'}
          </button>
          <button type="button" onClick={() => submitToAPI(true)} style={btn} disabled={busy}>
            {busy ? 'Working…' : 'Submit Case'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* styles */
const wrap = { minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16 };
const card = { background: '#fff', width: '100%', maxWidth: 820, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: 20, border: '1px solid #e5e7eb' };
const h2 = { margin: 0, marginBottom: 10, color: '#14532d' };
const h3 = { margin: '16px 0 8px', color: '#14532d' };
const label = { fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' };
const input = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 10 };
const textarea = { ...input, resize: 'vertical' };
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };
const rowBetween = { display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 };
const btnRow = { display: 'flex', gap: 10, marginTop: 12 };
const btn = { padding: '10px 14px', border: 'none', borderRadius: 8, background: '#14532d', color: '#fff', fontWeight: 600, cursor: 'pointer' };
const errorBox = { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 10 };
const fileList = { display: 'grid', gap: 6, marginTop: 8, marginBottom: 4 };
const fileItem = { display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px' };
const removeBtn = { border: 'none', borderRadius: 6, padding: '6px 8px', background: '#7f1d1d', color: '#fff', cursor: 'pointer' };
