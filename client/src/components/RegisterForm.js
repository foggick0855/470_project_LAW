// client/src/components/RegisterForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RegisterForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Client',
    qualification: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    await axios.post('/api/auth/register', formData);
    alert('Registration successful! Please login.');
    navigate('/login');
  } catch (error) {
    alert(error.response?.data?.message || 'Registration failed');
  }
};


  const showMediatorFields = formData.role === 'Mediator';

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Register</h2>

        <input
          type="text"
          name="name"
          placeholder="Name"
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
          style={styles.input}
        />

        <label style={styles.label}>Select Role:</label>
        <select name="role" value={formData.role} onChange={handleChange} style={styles.input}>
          <option value="Client">Client</option>
          <option value="Mediator">Mediator</option>
        </select>

        {showMediatorFields && (
          <>
            <textarea
              name="qualification"
              placeholder="Qualification Summary"
              onChange={handleChange}
              style={styles.textarea}
            />
          </>
        )}

        <button type="submit" style={styles.button}>Register</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '2rem',
  },
  form: {
    background: '#f4fff4',
    padding: '2rem',
    borderRadius: '10px',
    width: '350px',
    boxShadow: '0 0 10px #ccc',
  },
  title: {
    textAlign: 'center',
    color: 'darkgreen',
    marginBottom: '1rem',
  },
  input: {
    padding: '0.75rem',
    marginBottom: '1rem',
    width: '100%',
    fontSize: '1rem',
  },
  textarea: {
    padding: '0.75rem',
    marginBottom: '1rem',
    width: '100%',
    fontSize: '1rem',
    height: '80px',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  button: {
    backgroundColor: 'darkgreen',
    color: 'white',
    padding: '0.75rem',
    border: 'none',
    width: '100%',
    fontSize: '1rem',
    cursor: 'pointer',
    borderRadius: '5px'
  },
};

export default RegisterForm;
