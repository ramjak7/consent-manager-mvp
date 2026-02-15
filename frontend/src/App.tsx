import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from '@pages/LoginPage';
import { AuthCallbackPage } from '@pages/AuthCallbackPage';
import { PortalSelectorPage } from '@pages/PortalSelectorPage';
import { ProtectedRoute } from '@components/common/ProtectedRoute';
import { dpRoutes } from './dp/routes';
import { dfRoutes } from './df/routes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PortalSelectorPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected layout wrapper — all child routes require authentication */}
        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          {/* Data Principal Routes (/dp/*) */}
          {dpRoutes}
          {/* Data Fiduciary Routes (/df/*) */}
          {dfRoutes}
        </Route>

        {/* Legacy redirects */}
        <Route path="/dashboard" element={<Navigate to="/dp/dashboard" replace />} />
        <Route path="/consents" element={<Navigate to="/dp/consents" replace />} />
        <Route path="/df-dashboard" element={<Navigate to="/df/dashboard" replace />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
