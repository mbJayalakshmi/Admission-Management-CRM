import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Institutions from './pages/Institutions';
import Campuses     from './pages/Campuses';
import Departments  from './pages/Departments';
import Programs     from './pages/Programs';
import SeatMatrix   from './pages/SeatMatrix';
import Applicants   from './pages/Applicants';
import Allocate     from './pages/Allocate';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all roles */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin only */}
          <Route path="/institutions" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><Institutions /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/campuses" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><Campuses /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/departments" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><Departments /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/programs" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><Programs /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/seat-matrix" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><SeatMatrix /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin + Officer */}
          <Route path="/applicants" element={
            <ProtectedRoute roles={['admin', 'officer']}>
              <Layout><Applicants /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/allocate" element={
            <ProtectedRoute roles={['admin', 'officer']}>
              <Layout><Allocate /></Layout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
