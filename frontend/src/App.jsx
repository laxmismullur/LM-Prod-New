import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { LMAuthProvider, useLMAuth } from './context/LMAuthContext';

import LMLayout from './components/LMLayout';
import LMDashboard from './pages/LMDashboard';
import LMDoctors from './pages/LMDoctors';
import LMPatients from './pages/LMPatients';
import LMAppointments from './pages/LMAppointments';
import LMMedicalRecords from './pages/LMMedicalRecords';
import LMBilling from './pages/LMBilling';
import LMLoginPage from './pages/LMLoginPage';
import LMAddStaff from './pages/LMAddStaff';


// ✅ Protected Route Component
function LMProtectedRoute({ children, roles }) {
  const { user } = useLMAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'PATIENT' ? '/patients' : '/'} replace />;
  }

  return children;
}

function LMRolePage({ roles, children }) {
  return <LMProtectedRoute roles={roles}>{children}</LMProtectedRoute>;
}


// ✅ Routes Component (THIS WAS MISSING)
function LMAppRoutes() {
  const { user } = useLMAuth();

  return (
    <Routes>

      {/* Login */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LMLoginPage />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <LMProtectedRoute>
            <LMLayout />
          </LMProtectedRoute>
        }
      >
        <Route index element={user?.role === 'PATIENT' ? <Navigate to="/patients" replace /> : <LMDashboard />} />
        <Route path="doctors" element={<LMRolePage roles={['ADMIN']}><LMDoctors /></LMRolePage>} />
        <Route path="patients" element={<LMRolePage roles={['ADMIN','DOCTOR','NURSE','RECEPTIONIST','PATIENT']}><LMPatients /></LMRolePage>} />
        <Route path="appointments" element={<LMRolePage roles={['ADMIN','DOCTOR','NURSE','RECEPTIONIST','PATIENT']}><LMAppointments /></LMRolePage>} />
        <Route path="medical-records" element={<LMRolePage roles={['ADMIN','DOCTOR','NURSE','PATIENT']}><LMMedicalRecords /></LMRolePage>} />
        <Route path="billing" element={<LMRolePage roles={['ADMIN','RECEPTIONIST','PATIENT']}><LMBilling /></LMRolePage>} />
        <Route path="notifications" element={<Navigate to="/" replace />} />
        <Route path="add-staff" element={<LMRolePage roles={['ADMIN']}><LMAddStaff /></LMRolePage>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}


// ✅ Main App
export default function App() {
  return (
    <LMAuthProvider>
      <BrowserRouter>
        <LMAppRoutes />
      </BrowserRouter>
    </LMAuthProvider>
  );
}
