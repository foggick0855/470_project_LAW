// client/src/components/RegisterForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const GREEN = '#14532d';

// Controlled vocabulary (edit as you like)
const LANG_OPTIONS = [
  'English',
  'Bengali',
  'Hindi',
  'Urdu',
  'Arabic',
  'Chinese',
  'Spanish',
];
const SPEC_OPTIONS = [
  'Family',
  'Property',
  'Commercial',
  'Workplace',
  'Consumer',
  'Construction',
  'Technology',
  'Banking/Finance',
];

const RegisterForm = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Base user fields
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Client', // Client | Mediator
  });

  // Mediator-only profile fields (no hourlyRate, no client qualification)
  const [medForm, setMedForm] = useState({
    bio: '',
    country: '',
    city: '',
    yearsExperience: '',
  });

  // Checkbox selections
  const [langSel, setLangSel] = useState([]);  // array of strings
  const [specSel, setSpecSel] = useState([]);  // array of strings

  // Optional "Other" inputs to avoid blocking users
  const [otherLangs, setOtherLangs] = useState(''); // comma separated optional
  const [otherSpecs, setOtherSpecs] = useState(''); // comma separated optional

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onMedChange = (e) => setMedForm({ ...medForm, [e.target.name]: e.target.value });

  const isMediator = form.role === 'Mediator';

  const toggle = (value, list, setList) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const parseComma = (s) =>
    (s || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };

      if (isMediator) {
        // Merge checkbox choices with any "Other" typed values
        const langs = Array.from(new Set([...langSel, ...parseComma(otherLangs)]));
        const specs = Array.from(new Set([...specSel, ...parseComma(otherSpecs)]));

        payload.mediatorProfile = {
          bio: medForm.bio?.trim() || '',
          languages: langs,                  // ✅ array (no typos)
          specialties: specs,                // ✅ array (no typos)
          location: { country: medForm.country?.trim(), city: medForm.city?.trim() },
          yearsExperience: medForm.yearsExperience,
        };
      }

      await axios.post('/api/auth/register', payload);

      alert(
        isMediator
          ? 'Registration submitted. Your mediator profile is pending admin approval.'
          : 'Registration successful. You can now log in.'
      );
      navigate('/login');
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
    <div style={styles.wrapper}>
      <form onSubmit={onSubmit} style={styles.form}>
        <h2 style={styles.title}>Register</h2>

        {error && <div style={styles.errorBox}>{error}</div>}

        <label style={styles.label}>Full Name</label>
        <input
          name="name"
          type="text"
          placeholder="e.g., Mahadi Hasan"
          value={form.name}
          onChange={onChange}
          required
          style={styles.input}
        />

        <label style={styles.label}>Email</label>
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange}
          required
          style={styles.input}
          autoComplete="email"
        />

        <label style={styles.label}>Password</label>
        <input
          name="password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={onChange}
          required
          style={styles.input}
          autoComplete="new-password"
        />

        <label style={styles.label}>Register As</label>
        <select name="role" value={form.role} onChange={onChange} style={styles.input}>
          <option value="Client">Client</option>
          <option value="Mediator">Mediator</option>
        </select>

        {/* Mediator directory fields */}
        {isMediator && (
          <div style={styles.mediatorBox}>
            <h3 style={styles.subheading}>Mediator Directory Profile</h3>

            <label style={styles.smallLabel}>Short Bio</label>
            <textarea
              name="bio"
              placeholder="Introduce your practice briefly"
              value={medForm.bio}
              onChange={onMedChange}
              rows={3}
              style={styles.textarea}
            />

            {/* Languages (checkboxes) */}
            <label style={styles.smallLabel}>Languages</label>
            <div style={styles.checkGrid}>
              {LANG_OPTIONS.map((lang) => (
                <label key={lang} style={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={langSel.includes(lang)}
                    onChange={() => toggle(lang, langSel, setLangSel)}
                  />
                  <span>{lang}</span>
                </label>
              ))}
            </div>
            <input
              type="text"
              placeholder="Other languages (comma separated, optional)"
              value={otherLangs}
              onChange={(e) => setOtherLangs(e.target.value)}
              style={{ ...styles.input, marginTop: 8 }}
            />

            {/* Specialties (checkboxes) */}
            <label style={styles.smallLabel}>Specialties</label>
            <div style={styles.checkGrid}>
              {SPEC_OPTIONS.map((spec) => (
                <label key={spec} style={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={specSel.includes(spec)}
                    onChange={() => toggle(spec, specSel, setSpecSel)}
                  />
                  <span>{spec}</span>
                </label>
              ))}
            </div>
            <input
              type="text"
              placeholder="Other specialties (comma separated, optional)"
              value={otherSpecs}
              onChange={(e) => setOtherSpecs(e.target.value)}
              style={{ ...styles.input, marginTop: 8 }}
            />

            <label style={styles.smallLabel}>Country</label>
            <input
              name="country"
              type="text"
              placeholder="Bangladesh"
              value={medForm.country}
              onChange={onMedChange}
              style={styles.input}
            />

            <label style={styles.smallLabel}>City</label>
            <input
              name="city"
              type="text"
              placeholder="Dhaka"
              value={medForm.city}
              onChange={onMedChange}
              style={styles.input}
            />

            <label style={styles.smallLabel}>Years of experience</label>
            <input
              name="yearsExperience"
              type="number"
              min="0"
              placeholder="e.g., 5"
              value={medForm.yearsExperience}
              onChange={onMedChange}
              style={styles.input}
            />
          </div>
        )}

        <button type="submit" style={styles.button} disabled={busy}>
          {busy ? 'Creating account…' : 'Register'}
        </button>

        <p style={styles.loginText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.loginLink}>
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f4f6f8',
    padding: '24px 12px',
  },
  form: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: 720,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  title: { marginBottom: '0.25rem', color: GREEN, textAlign: 'center' },
  label: { fontSize: 14, color: '#334155', marginTop: 8 },
  smallLabel: { fontSize: 13, color: '#334155', marginTop: 10, marginBottom: 6 },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outlineColor: GREEN,
    width: '100%',
  },
  textarea: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outlineColor: GREEN,
    resize: 'vertical',
    width: '100%',
  },
  mediatorBox: {
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  subheading: { margin: '0 0 8px', color: GREEN, fontSize: '1.05rem' },
  checkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 8,
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
  },
  button: {
    marginTop: 8,
    padding: '0.9rem',
    backgroundColor: GREEN,
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 700,
  },
  loginText: { textAlign: 'center', fontSize: '0.95rem', marginTop: 6 },
  loginLink: { color: GREEN, textDecoration: 'none', fontWeight: 'bold' },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 6,
  },
};

export default RegisterForm;
