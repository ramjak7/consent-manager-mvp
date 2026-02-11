# Frontend Implementation Guide

**Project:** Data Principal Dashboard  
**Version:** 1.0.0  
**Last Updated:** 2026-02-11  
**Target Audience:** Frontend Developers

---

## Quick Start (5 Minutes)

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- Code editor (VS Code recommended)
- Backend API running on `http://localhost:3000`

### Setup

```bash
# 1. Create React project with Vite
cd frontend
npm create vite@latest . -- --template react-ts

# 2. Install core dependencies
npm install

# 3. Install additional libraries
npm install react-router-dom@6 axios react-query@5
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install react-i18next i18next
npm install zod react-hook-form @hookform/resolvers
npm install date-fns
npm install sonner  # For toast notifications

# 4. Install Dev dependencies
npm install -D @types/node
npm install -D autoprefixer postcss tailwindcss
npx tailwindcss init -p

# 5. Install UI library (choose one):
# Option A: Shadcn/UI (recommended)
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs

# Option B: Material-UI
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled

# Option C: Chakra UI
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion

# 6. Install testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event happy-dom

# 7. Start development server
npm run dev
```

---

## Project Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── robots.txt
│   └── manifest.json
│
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Root component
│   ├── vite-env.d.ts           # Vite types
│   │
│   ├── assets/                  # Static assets
│   │   ├── icons/
│   │   ├── images/
│   │   └── fonts/
│   │
│   ├── components/              # Reusable components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   │
│   │   ├── consent/
│   │   │   ├── ConsentCard.tsx
│   │   │   ├── ConsentTable.tsx
│   │   │   ├── ConsentDetailModal.tsx
│   │   │   ├── RevokeConsentModal.tsx
│   │   │   └── ConsentStatusBadge.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   └── ui/                  # Shadcn/UI components
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       └── ...
│   │
│   ├── pages/                   # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ConsentListPage.tsx
│   │   ├── ConsentDetailPage.tsx
│   │   ├── ErasureRequestPage.tsx
│   │   ├── ActivityLogPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── HelpPage.tsx
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useConsents.ts
│   │   ├── useErasureRequests.ts
│   │   └── useDebounce.ts
│   │
│   ├── api/                     # API integration
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.api.ts
│   │   ├── consent.api.ts
│   │   ├── erasure.api.ts
│   │   └── audit.api.ts
│   │
│   ├── types/                   # TypeScript types
│   │   ├── consent.types.ts
│   │   ├── user.types.ts
│   │   ├── erasure.types.ts
│   │   └── api.types.ts
│   │
│   ├── utils/                   # Utility functions
│   │   ├── date.utils.ts
│   │   ├── format.utils.ts
│   │   └── validation.utils.ts
│   │
│   ├── store/                   # State management (optional)
│   │   ├── authStore.ts        # Zustand store
│   │   └── index.ts
│   │
│   ├── i18n/                    # Internationalization
│   │   ├── config.ts
│   │   └── locales/
│   │       ├── en.json
│   │       ├── hi.json
│   │       └── ta.json
│   │
│   ├── styles/                  # Global styles
│   │   ├── globals.css
│   │   └── tailwind.css
│   │
│   └── __tests__/               # Tests
│       ├── components/
│       ├── pages/
│       └── utils/
│
├── .env.development              # Dev environment variables
├── .env.production               # Prod environment variables
├── .eslintrc.js                 # ESLint config
├── .prettierrc                  # Prettier config
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite config
├── tailwind.config.js           # Tailwind config
├── package.json
└── README.md
```

---

## Step-by-Step Implementation

### Step 1: Configure Vite & TypeScript

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@api': path.resolve(__dirname, './src/api'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@pages/*": ["./src/pages/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@api/*": ["./src/api/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

### Step 2: Set Up Tailwind CSS

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976D2',
          hover: '#135BA1',
          light: '#E3F2FD',
        },
        success: {
          DEFAULT: '#2E7D32',
          light: '#E8F5E9',
        },
        warning: {
          DEFAULT: '#F57C00',
          light: '#FFF3E0',
        },
        error: {
          DEFAULT: '#C62828',
          light: '#FFEBEE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        hindi: ['Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

**src/styles/globals.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded font-medium transition-colors;
  }

  .btn-danger {
    @apply bg-error hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors;
  }

  .badge-active {
    @apply bg-success-light text-success px-2 py-1 rounded text-sm font-medium;
  }

  .badge-expired {
    @apply bg-warning-light text-warning px-2 py-1 rounded text-sm font-medium;
  }

  .badge-revoked {
    @apply bg-error-light text-error px-2 py-1 rounded text-sm font-medium;
  }
}
```

---

### Step 3: Set Up API Client

**src/api/client.ts:**
```typescript
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Create Axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for httpOnly cookies
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // JWT token is in httpOnly cookie, so no need to add manually
    // But if using localStorage:
    // const token = localStorage.getItem('auth_token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Session expired, redirect to login
      window.location.href = '/login?session_expired=true';
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      console.error('Too many requests. Please try again later.');
    }
    return Promise.reject(error);
  }
);

// Type-safe API response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

// Generic API call wrapper
export async function apiRequest<T>(
  config: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}
```

**src/api/consent.api.ts:**
```typescript
import { apiRequest } from './client';
import {
  Consent,
  ConsentListResponse,
  ConsentGrantRequest,
  ConsentRevokeRequest,
} from '@types/consent.types';

export const consentApi = {
  /**
   * Get all consents for authenticated user
   */
  async getConsents(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ConsentListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);

    return apiRequest<ConsentListResponse>({
      method: 'GET',
      url: `/api/consents?${queryParams.toString()}`,
    });
  },

  /**
   * Get consent by ID
   */
  async getConsentById(consentId: string): Promise<Consent> {
    return apiRequest<Consent>({
      method: 'GET',
      url: `/consents/${consentId}`,
    });
  },

  /**
   * Grant new consent
   */
  async grantConsent(data: ConsentGrantRequest): Promise<Consent> {
    return apiRequest<Consent>({
      method: 'POST',
      url: '/consents',
      data,
    });
  },

  /**
   * Revoke consent
   */
  async revokeConsent(
    consentId: string,
    data: ConsentRevokeRequest
  ): Promise<{ consentId: string; status: string; revokedAt: string }> {
    return apiRequest({
      method: 'POST',
      url: `/consents/${consentId}/revoke`,
      data,
    });
  },

  /**
   * Download consent receipt (JSON)
   */
  async downloadReceiptJSON(consentId: string): Promise<Blob> {
    const response = await apiRequest<Blob>({
      method: 'GET',
      url: `/consents/${consentId}/receipt`,
      responseType: 'blob',
    });
    return response;
  },

  /**
   * Download consent receipt (PDF)
   */
  async downloadReceiptPDF(consentId: string): Promise<Blob> {
    const response = await apiRequest<Blob>({
      method: 'GET',
      url: `/consents/${consentId}/receipt.pdf`,
      responseType: 'blob',
    });
    return response;
  },
};
```

---

### Step 4: Set Up React Query

**src/main.tsx:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './styles/globals.css';
import './i18n/config';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

### Step 5: Create Custom Hooks

**src/hooks/useConsents.ts:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consentApi } from '@api/consent.api';
import { toast } from 'sonner';

export function useConsents(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['consents', params],
    queryFn: () => consentApi.getConsents(params),
  });
}

export function useConsentDetail(consentId: string) {
  return useQuery({
    queryKey: ['consent', consentId],
    queryFn: () => consentApi.getConsentById(consentId),
    enabled: !!consentId,
  });
}

export function useRevokeConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      consentId,
      data,
    }: {
      consentId: string;
      data: { reason: string; comments?: string };
    }) => consentApi.revokeConsent(consentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      toast.success('Consent revoked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to revoke consent');
    },
  });
}
```

---

### Step 6: Create Type Definitions

**src/types/consent.types.ts:**
```typescript
export interface Consent {
  consentId: string;
  userId: string;
  purpose: string;
  dataTypes: string[];
  organization: string;
  status: ConsentStatus;
  validUntil: string;
  grantedAt: string;
  approvedAt?: string;
  revokedAt?: string;
  version: number;
  noticeId: string;
  noticeVersion: string;
  language: Language;
}

export type ConsentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REQUESTED';
export type Language = 'en' | 'hi' | 'ta';

export interface ConsentListResponse {
  consents: Consent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ConsentGrantRequest {
  userId: string;
  purpose: string;
  dataTypes: string[];
  validUntil: string;
  noticeId: string;
  noticeVersion: string;
  language: Language;
}

export interface ConsentRevokeRequest {
  reason:
    | 'NO_LONGER_USING'
    | 'PRIVACY_CONCERNS'
    | 'SWITCHING_SERVICE'
    | 'QUALITY_ISSUES'
    | 'OTHER';
  comments?: string;
}
```

---

### Step 7: Build Core Components

**src/components/consent/ConsentStatusBadge.tsx:**
```typescript
import { ConsentStatus } from '@types/consent.types';

interface ConsentStatusBadgeProps {
  status: ConsentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function ConsentStatusBadge({
  status,
  size = 'md',
}: ConsentStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const statusConfig = {
    ACTIVE: {
      icon: '✅',
      label: 'Active',
      className: 'badge-active',
    },
    EXPIRED: {
      icon: '⏰',
      label: 'Expired',
      className: 'badge-expired',
    },
    REVOKED: {
      icon: '❌',
      label: 'Revoked',
      className: 'badge-revoked',
    },
    REQUESTED: {
      icon: '🕐',
      label: 'Requested',
      className: 'bg-blue-100 text-blue-700',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${config.className} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
```

**src/components/consent/ConsentTable.tsx:**
```typescript
import { Consent } from '@types/consent.types';
import { ConsentStatusBadge } from './ConsentStatusBadge';
import { formatDate } from '@utils/date.utils';

interface ConsentTableProps {
  consents: Consent[];
  onRowClick: (consent: Consent) => void;
}

export function ConsentTable({ consents, onRowClick }: ConsentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Organization
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Purpose
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data Types
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valid Until
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {consents.map((consent) => (
            <tr
              key={consent.consentId}
              onClick={() => onRowClick(consent)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {consent.organization}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {consent.purpose}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {consent.dataTypes.slice(0, 2).join(', ')}
                {consent.dataTypes.length > 2 &&
                  ` +${consent.dataTypes.length - 2} more`}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <ConsentStatusBadge status={consent.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(consent.validUntil)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Step 8: Build Pages

**src/pages/DashboardPage.tsx:**
```typescript
import { useConsents } from '@hooks/useConsents';
import { ConsentStatusBadge } from '@components/consent/ConsentStatusBadge';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

export function DashboardPage() {
  const { data, isLoading, error } = useConsents({ limit: 5 });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorMessage error={error} />;

  const activeCount =
    data?.consents.filter((c) => c.status === 'ACTIVE').length || 0;
  const expiredCount =
    data?.consents.filter((c) => c.status === 'EXPIRED').length || 0;
  const revokedCount =
    data?.consents.filter((c) => c.status === 'REVOKED').length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Data Principal Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Consents</p>
              <p className="text-3xl font-bold text-success">{activeCount}</p>
            </div>
            <ConsentStatusBadge status="ACTIVE" size="lg" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expired Consents</p>
              <p className="text-3xl font-bold text-warning">{expiredCount}</p>
            </div>
            <ConsentStatusBadge status="EXPIRED" size="lg" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revoked Consents</p>
              <p className="text-3xl font-bold text-error">{revokedCount}</p>
            </div>
            <ConsentStatusBadge status="REVOKED" size="lg" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <button className="btn-primary">Grant New Consent</button>
          <button className="btn-danger">Request Data Erasure</button>
          <button className="btn-primary">View All Consents</button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {data?.consents.slice(0, 5).map((consent) => (
            <div
              key={consent.consentId}
              className="flex items-center justify-between py-3 border-b last:border-b-0"
            >
              <div className="flex-1">
                <p className="font-medium">{consent.organization}</p>
                <p className="text-sm text-gray-500">{consent.purpose}</p>
              </div>
              <div className="flex items-center gap-4">
                <ConsentStatusBadge status={consent.status} />
                <button className="text-primary hover:underline text-sm">
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Step 9: Set Up Routing

**src/App.tsx:**
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from '@components/layout/Layout';
import { DashboardPage } from '@pages/DashboardPage';
import { ConsentListPage } from '@pages/ConsentListPage';
import { LoginPage } from '@pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="consents" element={<ConsentListPage />} />
          {/* Add more routes */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### Step 10: Testing

**src/__tests__/components/ConsentStatusBadge.test.tsx:**
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConsentStatusBadge } from '@components/consent/ConsentStatusBadge';

describe('ConsentStatusBadge', () => {
  it('renders active status', () => {
    render(<ConsentStatusBadge status="ACTIVE" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders revoked status', () => {
    render(<ConsentStatusBadge status="REVOKED" />);
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('applies correct size class', () => {
    const { container } = render(<ConsentStatusBadge status="ACTIVE" size="lg" />);
    expect(container.firstChild).toHaveClass('text-base');
  });
});
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@api': path.resolve(__dirname, './src/api'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
});
```

---

## Environment Variables

**.env.development:**
```env
VITE_API_URL=http://localhost:3000
VITE_OAUTH_CLIENT_ID=your-oauth-client-id
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

**.env.production:**
```env
VITE_API_URL=https://api.consentmanager.gov.in
VITE_OAUTH_CLIENT_ID=prod-oauth-client-id
VITE_OAUTH_REDIRECT_URI=https://dashboard.consentmanager.gov.in/auth/callback
```

---

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Static Hosting

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**AWS S3 + CloudFront:**
```bash
aws s3 sync dist/ s3://your-bucket-name/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Best Practices

### 1. Component Organization
- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components small and focused
- Use TypeScript for type safety

### 2. State Management
- Use React Query for server state
- Use local state (useState) for UI state
- Use Zustand/Context for global client state (if needed)

### 3. Performance
- Code split routes with React.lazy()
- Memoize expensive computations with useMemo()
- Use React.memo() for expensive components
- Optimize images (WebP, lazy loading)

### 4. Security
- Never store JWT in localStorage (use httpOnly cookies)
- Validate all user inputs client-side
- Sanitize user-generated content
- Use HTTPS in production

### 5. Accessibility
- Use semantic HTML elements
- Add ARIA labels where needed
- Test with keyboard navigation
- Use focus management in modals

---

## Troubleshooting

### Issue: API requests fail with CORS error

**Solution:**
- Ensure backend has CORS enabled for frontend domain
- Check `withCredentials: true` in Axios config
- Verify backend allows credentials in CORS config

### Issue: OAuth callback fails

**Solution:**
- Check redirect URI matches exactly in OAuth provider
- Verify client ID is correct
- Check browser console for errors
- Ensure backend `/auth/callback` endpoint works

### Issue: TypeScript errors on imports

**Solution:**
- Check tsconfig.json path aliases
- Restart VS Code TypeScript server
- Run `npm run typecheck` to find issues

---

## Next Steps

1. ✅ Complete Phase 1 implementation (4 weeks)
2. ✅ Add unit tests (80% coverage target)
3. ✅ Add integration tests (Cypress/Playwright)
4. ✅ Accessibility audit (WAVE, axe DevTools)
5. ✅ Performance optimization (Lighthouse score >90)
6. ✅ Deploy to staging environment
7. ✅ User acceptance testing
8. ✅ Deploy to production

---

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Vite Documentation](https://vitejs.dev/)

---

**Questions? Contact:**
- Slack: #consent-manager-frontend
- Email: frontend-team@consentmanager.gov.in

**Happy Coding! 🚀**
