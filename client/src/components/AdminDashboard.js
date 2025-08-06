// client/src/components/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [pendingMediators, setPendingMediators] = useState([]);
  const [approvedMediators, setApprovedMediators] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get('/api/users/all', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPendingMediators(data.pendingMediators);
        setApprovedMediators(data.approvedMediators);
        setClients(data.clients);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const renderTable = (title, data, actions) => (
    <div style={styles.tableContainer}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            {actions.map((a, i) => (
              <th key={i} style={styles.th}>{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(u => (
            <tr key={u._id}>
              <td style={styles.td}>{u.name}</td>
              <td style={styles.td}>{u.email}</td>
              {actions.map((a, i) => (
                <td key={i} style={styles.td}>
                  <button
                    onClick={() => a.handler(u)}
                    style={styles.actionButton}
                  >
                    {a.label}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={styles.container}>
      <button onClick={handleLogout} style={styles.logoutButton}>
        Logout
      </button>
      <h1 style={styles.header}>Admin Dashboard</h1>

      {renderTable(
        'Pending Mediator Requests',
        pendingMediators,
        [
          { label: 'Accept', handler: u => console.log('Accept', u) },
          { label: 'Check Summary', handler: u => console.log('Summary', u) },
          { label: 'Deny', handler: u => console.log('Deny', u) },
        ]
      )}

      {renderTable(
        'Approved Mediators',
        approvedMediators,
        [
          { label: 'Ban', handler: u => console.log('Ban', u) },
          { label: 'Delete', handler: u => console.log('Delete', u) },
        ]
      )}

      {renderTable(
        'Clients',
        clients,
        [
          { label: 'Ban', handler: u => console.log('Ban', u) },
          { label: 'Delete', handler: u => console.log('Delete', u) },
        ]
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    padding: '30px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
  },
  logoutButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  header: {
    fontSize: '2rem',
    color: '#14532d',
    textAlign: 'center',
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: '#0f5132',
    marginBottom: '10px',
  },
  tableContainer: {
    marginBottom: '40px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#d1e7dd',
    color: '#14532d',
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #eee',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#0f5132',
    color: '#fff',
  },
};

export default AdminDashboard;
