import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AuthRedirector = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded?.role === 'Admin') {
          navigate('/dashboard');
        } else if (decoded?.role === 'Mediator') {
          navigate('/dashboard');
        } else if (decoded?.role === 'Client') {
          navigate('/dashboard');
        } else {
          navigate('/login'); // fallback if role is unknown
        }
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('token');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]); // ✅ navigate included to fix the warning

  return null;
};

export default AuthRedirector;
