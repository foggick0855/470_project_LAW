import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

import AdminDashboard from './AdminDashboard';
import MediatorDashboard from './MediatorDashboard';
import ClientDashboard from './ClientDashboard';

const DashboardRouter = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      console.log("Decoded JWT:", decoded); // 🔍 for debugging
      setRole(decoded.role);
    } catch (err) {
      console.error('Invalid token:', err);
      localStorage.removeItem('token');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  if (loading) {
    return <p style={{ textAlign: 'center' }}>Loading dashboard...</p>;
  }

  switch (role) {
    case 'Admin':
      return <AdminDashboard />;
    case 'Mediator':
      return <MediatorDashboard />;
    case 'Client':
      return <ClientDashboard />;
    default:
      return <p style={{ textAlign: 'center' }}>Unauthorized role</p>;
  }
};

export default DashboardRouter;
