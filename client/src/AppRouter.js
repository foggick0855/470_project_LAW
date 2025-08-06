// src/AppRouter.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterForm from './components/RegisterForm';
import DashboardRouter from './components/DashboardRouter';
import PublicRoute from './components/PublicRoute';
import PrivateRoute from './components/PrivateRoute';

const AppRouter = () => (
  <Router>
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/register" element={<RegisterForm />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardRouter />
          </PrivateRoute>
        }
      />
    </Routes>
  </Router>
);

export default AppRouter;
