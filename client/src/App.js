// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import DashboardRouter from './components/DashboardRouter';
import PublicRoute from './components/PublicRoute';
import PrivateRoute from './components/PrivateRoute';
import AuthRedirector from './components/AuthRedirector';

// Client case pages
import CaseForm from './components/CaseForm';
import MyCases from './components/MyCases';
import CaseDetail from './components/CaseDetail';

// Admin case intake
import AdminCases from './components/AdminCases';

// ✅ Chat pages
import MessagesListPage from './components/MessagesListPage';
import ChatPage from './components/ChatPage';

// Mediator schedule management
import ClientSchedulePage from './components/ClientSchedulePage';
import MediatorSchedulePage from './components/MediatorSchedulePage';

// ✅ NEW: Agreement Drafts page
import AgreementDraftsPage from './pages/AgreementDraftsPage';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Root: decide where to go based on token/role */}
        <Route path="/" element={<AuthRedirector />} />

        {/* Public auth routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginForm />
            </PublicRoute>
          }
        />
        <Route path="/register" element={<RegisterForm />} />

        {/* Private app area */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardRouter />
            </PrivateRoute>
          }
        />

        {/* Client case workflow */}
        <Route
          path="/cases"
          element={
            <PrivateRoute>
              <MyCases />
            </PrivateRoute>
          }
        />
        <Route
          path="/cases/new"
          element={
            <PrivateRoute>
              <CaseForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/cases/:id"
          element={
            <PrivateRoute>
              <CaseDetail />
            </PrivateRoute>
          }
        />

        {/* ✅ NEW: Agreements route */}
        <Route
          path="/cases/:caseId/agreements"
          element={
            <PrivateRoute>
              <AgreementDraftsPage />
            </PrivateRoute>
          }
        />

        {/* Admin case intake */}
        <Route
          path="/admin/cases"
          element={
            <PrivateRoute>
              <AdminCases />
            </PrivateRoute>
          }
        />

        {/* ✅ Messages */}
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <MessagesListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages/:caseId"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />

        {/* Mediator schedule management */}
        <Route
          path="/schedule/client"
          element={
            <PrivateRoute>
              <ClientSchedulePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/schedule/mediator"
          element={
            <PrivateRoute>
              <MediatorSchedulePage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
