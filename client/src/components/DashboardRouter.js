// client/src/components/DashboardRouter.js
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

    // If no token, redirect to login once
    if (!token) {
      console.log('🚫 No token found. Redirecting...');
      setLoading(false); // Prevent infinite spinner
      navigate('/login', { replace: true });
      return;
    }

    try {
      const decoded = jwtDecode(token);
      console.log('✅ Decoded Token:', decoded);

      if (!decoded.role) {
        throw new Error('Token does not contain role');
      }

      setRole(decoded.role);
    } catch (err) {
      console.error('❌ Invalid token:', err.message);
      localStorage.removeItem('token');
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]); // ✅ Dependency is only navigate

  if (loading) return <p style={{ textAlign: 'center' }}>Loading dashboard...</p>;

  switch (role) {
    case 'Admin':
      return <AdminDashboard />;
    case 'Mediator':
      return <MediatorDashboard />;
    case 'Client':
      return <ClientDashboard />;
    default:
      return <p style={{ textAlign: 'center', color: 'red' }}>Unauthorized Role</p>;
  }
};

export default DashboardRouter;
