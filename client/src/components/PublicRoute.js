// src/components/PublicRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  return token
    ? <Navigate to="/dashboard" replace state={{ from: location }} />
    : children;
};

export default PublicRoute;
