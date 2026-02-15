import { Route } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { DashboardPage } from '@pages/DashboardPage';
import { ConsentListPage } from '@pages/ConsentListPage';
import { ConsentDetailPage } from '@pages/ConsentDetailPage';
import { GrantConsentPage } from '@pages/GrantConsentPage';
import { ErasureRequestPage } from '@pages/ErasureRequestPage';
import { ErasureRequestListPage } from '@pages/ErasureRequestListPage';
import { CorrectionRequestPage } from '@pages/CorrectionRequestPage';
import { ActivityLogPage } from '@pages/ActivityLogPage';

/**
 * Data Principal route tree.
 * All routes are prefixed with /dp/* via the parent mount in App.tsx.
 * Uses the existing Layout (DP sidebar nav).
 */
export const dpRoutes = (
  <Route path="dp" element={<Layout />}>
    <Route index element={<DashboardPage />} />
    <Route path="dashboard" element={<DashboardPage />} />
    <Route path="consents" element={<ConsentListPage />} />
    <Route path="consents/:id" element={<ConsentDetailPage />} />
    <Route path="grant-consent" element={<GrantConsentPage />} />
    <Route path="erasure-request" element={<ErasureRequestPage />} />
    <Route path="erasure-requests" element={<ErasureRequestListPage />} />
    <Route path="correction-request" element={<CorrectionRequestPage />} />
    <Route path="activity-log" element={<ActivityLogPage />} />
  </Route>
);
