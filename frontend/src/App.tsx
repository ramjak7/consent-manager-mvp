import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@pages/LoginPage';
import { AuthCallbackPage } from '@pages/AuthCallbackPage';
import { DashboardPage } from '@pages/DashboardPage';
import { ConsentListPage } from '@pages/ConsentListPage';
import { ErasureRequestPage } from '@pages/ErasureRequestPage';
import { ErasureRequestListPage } from '@pages/ErasureRequestListPage';
import { ActivityLogPage } from '@pages/ActivityLogPage';
import { Layout } from '@components/layout/Layout';
import { ProtectedRoute } from '@components/common/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="consents" element={<ConsentListPage />} />
          <Route path="erasure-request" element={<ErasureRequestPage />} />
          <Route path="erasure-requests" element={<ErasureRequestListPage />} />
          <Route path="activity-log" element={<ActivityLogPage />} />
          {/* Add more protected routes here */}
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
