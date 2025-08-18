// client/src/components/LoginForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const LoginForm = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const res = await axios.post('/api/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      // Optional: alert(`Welcome back, ${res.data.name}`);
      navigate('/dashboard');
    } catch (err) {
      const status = err?.response?.status;
      const rawMsg = err?.response?.data?.message || 'Login failed';
      const msg = rawMsg.toLowerCase();

      // Show the reason inline, DO NOT redirect anywhere
      if (status === 403) {
        if (msg.includes('pending')) {
          setError('Your mediator profile is pending admin approval');
          setBusy(false);
          return;
        }
        if (msg.includes('banned') || msg.includes('rejected')) {
          setError('Your profile is banned. Please contact support.');
          setBusy(false);
          return;
        }
      }

      setError(rawMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Login</h2>

        {error && <div style={styles.errorBox}>{error}</div>}

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          style={styles.input}
          autoComplete="email"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          style={styles.input}
          autoComplete="current-password"
        />
        <button type="submit" style={styles.button} disabled={busy}>
          {busy ? 'Logging in…' : 'Login'}
        </button>

        <p style={styles.registerText}>
          New here?{' '}
          <Link to="/register" style={styles.registerLink}>
            Register
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
    height: '100vh',
    backgroundColor: '#f4f4f4',
    padding: '12px',
  },
  form: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    width: '350px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  title: {
    marginBottom: '0.5rem',
    color: '#006400', // bottle green
    textAlign: 'center',
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    outlineColor: '#006400',
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#006400',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  registerText: {
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  registerLink: {
    color: '#006400',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  errorBox: {
    background: '#2b2a2a',
    color: '#fca5a5',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: '0.95rem',
  },
};

export default LoginForm;
