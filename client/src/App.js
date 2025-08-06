// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import DashboardRouter from './components/DashboardRouter';
import PublicRoute from './components/PublicRoute';
import PrivateRoute from './components/PrivateRoute';
import AuthRedirector from './components/AuthRedirector';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthRedirector />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginForm />
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
};

export default App;
