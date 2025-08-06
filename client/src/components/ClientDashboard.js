import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ClientDashboard = () => {
  const [name, setName] = useState('');
  const navigate = useNavigate();

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

  return (
    <div style={styles.container}>
      <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
      <h2 style={styles.title}>Welcome to Your Dashboard</h2>
      <p style={styles.subtitle}>Hello, <strong>{name}</strong>!</p>
      <p style={styles.description}>
        Here you can access mediation services, upload documents, and track cases.
      </p>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    padding: '2rem',
    position: 'relative',
  },
  logoutButton: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    backgroundColor: '#cc0000', // red
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  title: {
    color: '#006400', // bottlegreen
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '1rem',
  },
  description: {
    fontSize: '1.1rem',
  },
};

export default ClientDashboard;
