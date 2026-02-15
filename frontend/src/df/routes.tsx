import { Route } from 'react-router-dom';
import { DfLayout } from './components/DfLayout';
import { DfDashboardPage } from '@pages/DfDashboardPage';
import { DfErasureRequestsPage } from './pages/DfErasureRequestsPage';
import { DfCorrectionRequestsPage } from './pages/DfCorrectionRequestsPage';
import { DfPurposeManagementPage } from './pages/DfPurposeManagementPage';
import { DfProcessorRegistryPage } from './pages/DfProcessorRegistryPage';
import { ConsentListPage } from '@pages/ConsentListPage';
import { ActivityLogPage } from '@pages/ActivityLogPage';
import { RoleGuard } from '@components/common/RoleGuard';

/**
 * Data Fiduciary route tree.
 * All routes are prefixed with /df/* via the parent mount in App.tsx.
 * Protected by RoleGuard — only DF_CLIENT, ADMIN, and SUPER_ADMIN roles allowed.
 */
export const dfRoutes = (
  <Route
    path="df"
    element={
      <RoleGuard allowedRoles={['DF_CLIENT', 'ADMIN', 'SUPER_ADMIN']} fallback="/dp/dashboard">
        <DfLayout />
      </RoleGuard>
    }
  >
    <Route index element={<DfDashboardPage />} />
    <Route path="dashboard" element={<DfDashboardPage />} />
    <Route path="erasure-requests" element={<DfErasureRequestsPage />} />
    <Route path="correction-requests" element={<DfCorrectionRequestsPage />} />
    <Route path="purposes" element={<DfPurposeManagementPage />} />
    <Route path="processors" element={<DfProcessorRegistryPage />} />
    <Route path="consents" element={<ConsentListPage />} />
    <Route path="audit-trail" element={<ActivityLogPage />} />
  </Route>
);
