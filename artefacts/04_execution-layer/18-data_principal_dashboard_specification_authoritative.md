# 18. Data Principal Dashboard Specification (P0-1)

**Document ID:** `18-data_principal_dashboard_specification_authoritative.md`  
**Version:** 1.0.0  
**Status:** 📋 Specification (Ready for Implementation)  
**Last Updated:** 2026-02-11  
**Owner:** Product Team  
**Traceability:** DPDP Act 2023 §11 (Right to Access), §12 (Right to Correction), §13 (Right to Erasure)

---

## Executive Summary

The Data Principal Dashboard is a self-service web portal that enables Indian citizens to exercise their data rights under the DPDP Act 2023. This specification defines requirements, user flows, API integrations, and implementation guidance for frontend development.

### Key Features

1. **Consent Management** - View, grant, revoke, modify consent
2. **Data Access** - Download consent receipts (JSON/PDF)
3. **Right to Erasure** - Request data deletion
4. **Audit Trail** - View consent history and data processing activities
5. **Multi-language Support** - English, Hindi, Tamil (extensible)
6. **OAuth2 Authentication** - Secure login with Aadhaar/DigiLocker integration

### Compliance Alignment

| DPDP Section | Requirement | Implementation |
|--------------|-------------|----------------|
| §11 | Right to access personal data | Consent list, receipt download |
| §12 | Right to correction | Consent modification (future) |
| §13 | Right to erasure | Erasure request workflow |
| §14 | Right to grievance redressal | Contact support integration |
| §15 | Right to nominate | Nominee management (future) |

---

## Table of Contents

1. [User Personas](#1-user-personas)
2. [User Stories & Acceptance Criteria](#2-user-stories--acceptance-criteria)
3. [Information Architecture](#3-information-architecture)
4. [Wireframes & UI Specifications](#4-wireframes--ui-specifications)
5. [API Integration Specification](#5-api-integration-specification)
6. [Authentication Flow](#6-authentication-flow)
7. [Component Breakdown](#7-component-breakdown)
8. [Data Models](#8-data-models)
9. [Error Handling & Edge Cases](#9-error-handling--edge-cases)
10. [Multi-language Support](#10-multi-language-support)
11. [Accessibility Requirements](#11-accessibility-requirements)
12. [Security Requirements](#12-security-requirements)
13. [Performance Requirements](#13-performance-requirements)
14. [Testing Strategy](#14-testing-strategy)
15. [Implementation Phases](#15-implementation-phases)

---

## 1. User Personas

### Primary Persona: Priya Sharma (Urban Professional)

**Demographics:**
- Age: 32
- Location: Mumbai, Maharashtra
- Education: MBA
- Tech Savvy: High
- Primary Language: English (reads Hindi)

**Goals:**
- Understand what data is being collected about her
- Control which organizations can access her data
- Revoke consent when she stops using a service
- Download proof of consent for records

**Pain Points:**
- Overwhelmed by privacy policies
- Unsure which companies have her data
- Wants quick access to manage consents
- Worried about data breaches

### Secondary Persona: Rajesh Kumar (Small Business Owner)

**Demographics:**
- Age: 45
- Location: Jaipur, Rajasthan
- Education: B.Com
- Tech Savvy: Medium
- Primary Language: Hindi (reads English)

**Goals:**
- Manage consents for his business accounts
- Understand what permissions he's granted
- Ensure compliance with DPDP Act
- Get help when confused

**Pain Points:**
- Legal terminology is confusing
- Prefers Hindi interface
- Needs clear guidance on what to do
- Limited time for complex processes

### Tertiary Persona: Lakshmi Devi (Retired Teacher)

**Demographics:**
- Age: 62
- Location: Chennai, Tamil Nadu
- Education: B.Ed
- Tech Savvy: Low
- Primary Language: Tamil (reads English)

**Goals:**
- Protect her privacy online
- Manage consent for pension portal
- Request deletion of old accounts
- Get help from family/support

**Pain Points:**
- Intimidated by technology
- Needs simple, clear instructions
- Prefers Tamil interface
- Worries about making mistakes

---

## 2. User Stories & Acceptance Criteria

### Epic 1: Authentication & Onboarding

#### US-1.1: User Login with OAuth2

**As a** Data Principal  
**I want to** log in securely using my Aadhaar/DigiLocker account  
**So that** I can access my consent dashboard with verified identity

**Acceptance Criteria:**
- [ ] User can click "Login with Aadhaar" button
- [ ] OAuth2 flow redirects to DigiLocker
- [ ] User authenticates with Aadhaar OTP
- [ ] System receives OAuth2 token with user claims
- [ ] JWT token is stored securely (httpOnly cookie)
- [ ] User is redirected to dashboard with welcome message
- [ ] Failed login shows user-friendly error message

**Priority:** P0 (Critical)  
**Estimate:** 5 days  
**Dependencies:** OAuth2 provider setup

---

#### US-1.2: Dashboard Overview

**As a** Data Principal  
**I want to** see a summary of my consents when I login  
**So that** I quickly understand my data sharing status

**Acceptance Criteria:**
- [ ] Dashboard shows total active consents count
- [ ] Dashboard shows expired consents count
- [ ] Dashboard shows revoked consents count
- [ ] Dashboard shows recent consent activity (last 5)
- [ ] Each metric is clickable to filter consent list
- [ ] Dashboard loads in < 2 seconds
- [ ] Mobile responsive layout works on 360px width

**Priority:** P0 (Critical)  
**Estimate:** 3 days  
**Dependencies:** Consent list API

---

### Epic 2: Consent Management

#### US-2.1: View All Consents

**As a** Data Principal  
**I want to** view all my consents in a searchable table  
**So that** I can find specific consents quickly

**Acceptance Criteria:**
- [ ] Table shows: Purpose, Data Types, Organization, Status, Valid Until
- [ ] Table is sortable by date, purpose, status
- [ ] Table is filterable by status (Active, Expired, Revoked)
- [ ] Search box filters by purpose or organization name
- [ ] Pagination shows 20 consents per page
- [ ] Column headers have tooltips explaining fields
- [ ] Mobile view shows stacked card layout

**Priority:** P0 (Critical)  
**Estimate:** 5 days  
**Dependencies:** GET /consents API (needs implementation)

**API Requirements:**
```typescript
GET /api/consents?userId={userId}&page=1&limit=20&status=ACTIVE&search=banking
Response:
{
  "consents": [
    {
      "consentId": "uuid",
      "purpose": "Credit Verification",
      "dataTypes": ["PAN", "Aadhaar", "Income"],
      "organization": "HDFC Bank",
      "status": "ACTIVE",
      "validUntil": "2027-02-11T00:00:00Z",
      "grantedAt": "2026-02-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

#### US-2.2: View Consent Details

**As a** Data Principal  
**I want to** view detailed information about a specific consent  
**So that** I understand exactly what I've agreed to

**Acceptance Criteria:**
- [ ] Clicking consent row shows detail modal/page
- [ ] Details show: Full purpose description
- [ ] Details show: Complete list of data types
- [ ] Details show: Organization contact information
- [ ] Details show: Consent grant date and expiry date
- [ ] Details show: Privacy notice link (if available)
- [ ] Details show: Consent version number
- [ ] Details have "Download Receipt" button
- [ ] Details have "Revoke Consent" button (if active)

**Priority:** P0 (Critical)  
**Estimate:** 3 days  
**Dependencies:** GET /consents/:id API

---

#### US-2.3: Grant New Consent

**As a** Data Principal  
**I want to** grant consent for a new service  
**So that** I can start using the service with my data

**Acceptance Criteria:**
- [ ] User can access grant consent form
- [ ] Form shows: Service name, Purpose, Data types requested
- [ ] Form shows: Privacy notice (with "I have read" checkbox)
- [ ] Form shows: Validity period (dropdown: 1 year, 2 years, 5 years)
- [ ] Form validates all required fields
- [ ] User confirms with OTP/password verification
- [ ] Success message shows consent ID and receipt download link
- [ ] Failed grant shows error message with retry option

**Priority:** P1 (Important)  
**Estimate:** 5 days  
**Dependencies:** POST /consents API

**API Requirements:**
```typescript
POST /api/consents
Body:
{
  "userId": "user-uuid",
  "purpose": "Loan Application",
  "dataTypes": ["PAN", "Aadhaar", "Bank Statement"],
  "validUntil": "2027-02-11T00:00:00Z",
  "noticeId": "notice-uuid",
  "noticeVersion": "v1.0",
  "language": "en"
}
Response:
{
  "consentId": "consent-uuid",
  "status": "REQUESTED",
  "approvalToken": "token",
  "approvalExpiresAt": "2026-02-11T10:15:00Z"
}
```

---

#### US-2.4: Revoke Active Consent

**As a** Data Principal  
**I want to** revoke an active consent  
**So that** organizations stop using my data immediately

**Acceptance Criteria:**
- [ ] User clicks "Revoke" button on consent detail
- [ ] Confirmation modal appears with warning message
- [ ] Modal explains consequences (service may stop working)
- [ ] User confirms revocation with reason (dropdown)
- [ ] System sends revocation request to API
- [ ] Success message confirms revocation timestamp
- [ ] Consent status changes to "REVOKED" in list
- [ ] Organization receives webhook notification (backend)
- [ ] User can download revocation receipt

**Priority:** P0 (Critical)  
**Estimate:** 3 days  
**Dependencies:** POST /consents/:id/revoke API

**Revocation Reasons:**
- No longer using service
- Privacy concerns
- Switching to another service
- Service quality issues
- Other (free text)

---

#### US-2.5: Download Consent Receipt

**As a** Data Principal  
**I want to** download a consent receipt in PDF/JSON format  
**So that** I have proof of my consent for records

**Acceptance Criteria:**
- [ ] User clicks "Download Receipt" button
- [ ] Dropdown shows format options: JSON, PDF
- [ ] JSON download includes ISO/IEC 29184 compliant data
- [ ] PDF download is formatted and printable
- [ ] Receipt includes: Consent ID, Purpose, Data types, Timestamps
- [ ] Receipt includes: Organization details, Privacy notice reference
- [ ] Receipt includes: Digital signature/hash (if available)
- [ ] Download starts immediately (no page reload)

**Priority:** P0 (Critical)  
**Estimate:** 2 days  
**Dependencies:** GET /consents/:id/receipt, GET /consents/:id/receipt.pdf

---

### Epic 3: Data Access & Erasure

#### US-3.1: Request Data Erasure

**As a** Data Principal  
**I want to** request deletion of my data from an organization  
**So that** I exercise my right to erasure under DPDP Act

**Acceptance Criteria:**
- [ ] User accesses "Request Erasure" from consent detail
- [ ] Form shows warning about service disruption
- [ ] Form requires reason selection (mandatory)
- [ ] Form allows additional comments (optional)
- [ ] Form requires confirmation with password/OTP
- [ ] System validates erasure eligibility (legal holds, etc.)
- [ ] Success message shows request ID and timeline (30 days)
- [ ] User receives email confirmation with request details
- [ ] Request status is trackable in dashboard

**Priority:** P0 (Critical)  
**Estimate:** 5 days  
**Dependencies:** POST /api/erasure-requests API (needs implementation)

**API Requirements:**
```typescript
POST /api/erasure-requests
Body:
{
  "userId": "user-uuid",
  "consentId": "consent-uuid",
  "reason": "NO_LONGER_USING_SERVICE",
  "comments": "Switched to competitor",
  "confirmationToken": "otp-token"
}
Response:
{
  "requestId": "erasure-uuid",
  "status": "PENDING",
  "expectedCompletionDate": "2026-03-13T00:00:00Z",
  "trackingUrl": "/erasure-requests/erasure-uuid"
}
```

---

#### US-3.2: Track Erasure Request Status

**As a** Data Principal  
**I want to** track the status of my erasure request  
**So that** I know when my data has been deleted

**Acceptance Criteria:**
- [ ] Dashboard shows erasure requests section
- [ ] Each request shows: Request ID, Organization, Status, Date
- [ ] Status options: Pending, In Progress, Completed, Rejected
- [ ] User can click request to see detailed status
- [ ] Detail shows: Timeline, Organization response, Next steps
- [ ] User receives email when status changes
- [ ] Completed requests show confirmation certificate
- [ ] Rejected requests show reason and appeal process

**Priority:** P0 (Critical)  
**Estimate:** 3 days  
**Dependencies:** GET /api/erasure-requests API

---

### Epic 4: Audit & Transparency

#### US-4.1: View Consent History

**As a** Data Principal  
**I want to** view the complete history of a consent  
**So that** I can audit what happened with my consent

**Acceptance Criteria:**
- [ ] Consent detail page has "History" tab
- [ ] History shows timeline of events (grant, approve, revoke, expire)
- [ ] Each event shows: Timestamp, Event type, Actor (if applicable)
- [ ] Events are displayed in reverse chronological order
- [ ] User can filter by event type
- [ ] History is downloadable as CSV/JSON
- [ ] History loads incrementally (pagination)

**Priority:** P1 (Important)  
**Estimate:** 3 days  
**Dependencies:** GET /audit?consentId={id} API (backend filter needed)

---

#### US-4.2: View Data Processing Activities

**As a** Data Principal  
**I want to** see when organizations accessed my data  
**So that** I can verify data usage is legitimate

**Acceptance Criteria:**
- [ ] Dashboard has "Processing Activity" section
- [ ] Activity log shows: Date, Organization, Purpose, Data accessed
- [ ] Log is filterable by date range and organization
- [ ] Log shows processing allowed vs denied
- [ ] User can export log as PDF report
- [ ] Suspicious activity is highlighted (e.g., denied requests)
- [ ] User can report suspicious activity

**Priority:** P2 (Nice to have)  
**Estimate:** 5 days  
**Dependencies:** GET /audit?eventType=PROCESSING_* API

---

### Epic 5: User Settings & Support

#### US-5.1: Update Profile Settings

**As a** Data Principal  
**I want to** update my profile settings  
**So that** I receive notifications in my preferred language

**Acceptance Criteria:**
- [ ] User can access Settings page
- [ ] Settings include: Preferred language (English, Hindi, Tamil)
- [ ] Settings include: Email notifications (on/off)
- [ ] Settings include: SMS notifications (on/off)
- [ ] Settings include: Notification preferences (consent expiry, processing activity)
- [ ] Changes are saved with confirmation message
- [ ] Language change applies immediately to UI

**Priority:** P1 (Important)  
**Estimate:** 3 days  
**Dependencies:** PATCH /api/users/me/preferences API

---

#### US-5.2: Access Help & Support

**As a** Data Principal  
**I want to** access help documentation and support  
**So that** I can resolve issues independently

**Acceptance Criteria:**
- [ ] Dashboard has "Help" link in navigation
- [ ] Help page has searchable FAQ
- [ ] Help page has video tutorials (English, Hindi, Tamil)
- [ ] Help page has contact support form
- [ ] Support form validates required fields
- [ ] User receives confirmation email with ticket ID
- [ ] Help content is available in all supported languages

**Priority:** P1 (Important)  
**Estimate:** 5 days  
**Dependencies:** Static content, email integration

---

## 3. Information Architecture

### Site Map

```
Data Principal Dashboard
│
├── 🏠 Home / Overview
│   ├── Consent Summary Cards
│   ├── Recent Activity Feed
│   └── Quick Actions (Grant, Revoke, Request Erasure)
│
├── 📋 My Consents
│   ├── All Consents (Table View)
│   ├── Active Consents (Filtered)
│   ├── Expired Consents (Filtered)
│   ├── Revoked Consents (Filtered)
│   └── Consent Detail
│       ├── Overview Tab
│       ├── History Tab
│       └── Actions (Revoke, Download Receipt, Request Erasure)
│
├── 🗑️ Erasure Requests
│   ├── Active Requests (Table)
│   ├── Completed Requests (Table)
│   └── Request Detail
│       ├── Status Timeline
│       ├── Organization Response
│       └── Confirmation Certificate (if completed)
│
├── 📊 Activity Log
│   ├── Processing Activity (Table)
│   ├── Filters (Date range, Organization, Event type)
│   └── Export Options (PDF, CSV)
│
├── ⚙️ Settings
│   ├── Profile Information
│   ├── Language Preferences
│   ├── Notification Preferences
│   └── Privacy Settings
│
├── ❓ Help & Support
│   ├── FAQ (Searchable)
│   ├── Video Tutorials
│   ├── Contact Support Form
│   └── Documentation Links
│
└── 👤 User Profile
    ├── User Information (from OAuth2)
    ├── Linked Accounts
    └── Logout
```

---

## 4. Wireframes & UI Specifications

### 4.1 Dashboard Overview (Home Page)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏠 Data Principal Dashboard                    [हिंदी] [தமிழ்] [EN] │
│                                                                     │
│ Welcome, Priya Sharma                            [⚙️ Settings] [Logout] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📊 CONSENT SUMMARY                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   ACTIVE     │  │   EXPIRED    │  │   REVOKED    │              │
│  │     42       │  │      8       │  │      5       │              │
│  │ consents     │  │ consents     │  │ consents     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  🎯 QUICK ACTIONS                                                    │
│  [+ Grant New Consent]  [🗑️ Request Data Erasure]  [📥 View Receipts] │
│                                                                      │
│  📋 RECENT ACTIVITY                                     [View All →] │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ✅ Consent Granted • HDFC Bank • Credit Verification • 2h ago  │ │
│  │ ❌ Consent Revoked • Zomato • Food Recommendations • 1d ago    │ │
│  │ ⏰ Consent Expiring Soon • Flipkart • Purchase History • 7d    │ │
│  │ 🔍 Data Accessed • Amazon • Product Recommendations • 2d ago  │ │
│  │ ✅ Consent Granted • PhonePe • Payment Processing • 5d ago     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ⚠️ ALERTS                                                           │
│  • 3 consents expiring in next 30 days - Review now →              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- **Desktop (>1024px):** 3-column summary cards, side-by-side
- **Tablet (768px-1024px):** 3-column summary cards, stacked quick actions
- **Mobile (<768px):** Single column, cards stack vertically

**Interactions:**
- Clicking summary cards filters consent list by status
- Quick action buttons navigate to respective forms
- Recent activity items link to consent details
- Alert banner is dismissible but reappears if unresolved

---

### 4.2 Consent List Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📋 My Consents                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [🔍 Search consents...]                                             │
│                                                                      │
│  Filters: [All ▼] [Active ▼] [Expired ▼] [Revoked ▼]               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Organization   Purpose           Data Types    Status  Valid Until│
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ HDFC Bank     Credit Verification PAN, Aadhaar ✅ ACTIVE 2027-02-11│
│  │ Amazon        Recommendations     Purchase Hist✅ ACTIVE 2028-01-15│
│  │ Zomato        Food Delivery       Location     ❌ REVOKED    -    │
│  │ Flipkart      Shopping           Phone,Email   ⏰ EXPIRING 2026-03│
│  │ PhonePe       Payment Processing  Bank Account ✅ ACTIVE 2027-06-01│
│  │ Swiggy        Order History      Location      ✅ ACTIVE 2026-12-25│
│  │ ...                                                              │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Showing 1-20 of 42 consents        [← Prev] [1] [2] [3] [Next →]  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Mobile View (Card Layout):**
```
┌───────────────────────────┐
│ 📋 My Consents            │
├───────────────────────────┤
│ [🔍 Search...]            │
│ [Filter ▼] [Sort ▼]       │
│                           │
│ ┌───────────────────────┐ │
│ │ HDFC Bank             │ │
│ │ Credit Verification   │ │
│ │ ✅ ACTIVE             │ │
│ │ Valid: 2027-02-11     │ │
│ │ [View Details →]      │ │
│ └───────────────────────┘ │
│                           │
│ ┌───────────────────────┐ │
│ │ Amazon                │ │
│ │ Recommendations       │ │
│ │ ✅ ACTIVE             │ │
│ │ Valid: 2028-01-15     │ │
│ │ [View Details →]      │ │
│ └───────────────────────┘ │
│                           │
└───────────────────────────┘
```

**Interactions:**
- Click row/card to open consent detail modal
- Search filters table in real-time (client-side)
- Filter dropdowns show count for each status
- Sort arrows in column headers
- Pagination preserves filters and search

---

### 4.3 Consent Detail Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ Consent Details                                              [✕ Close]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Overview] [History] [Actions]                                     │
│                                                                      │
│  🏦 HDFC Bank Limited                                                │
│  Credit Verification & Loan Processing                              │
│                                                                      │
│  📋 PURPOSE                                                          │
│  This consent allows HDFC Bank to verify your credit history for    │
│  loan application processing. Your PAN and Aadhaar will be verified │
│  with CIBIL and other credit bureaus.                               │
│                                                                      │
│  📊 DATA TYPES SHARED                                                │
│  • PAN Card Number                                                  │
│  • Aadhaar Number                                                   │
│  • Annual Income Details                                            │
│  • Employment Information                                           │
│                                                                      │
│  📅 VALIDITY                                                         │
│  Granted: 2026-02-11 10:00 AM                                       │
│  Expires: 2027-02-11 11:59 PM                                       │
│  Status:  ✅ ACTIVE (378 days remaining)                            │
│                                                                      │
│  📄 PRIVACY NOTICE                                                   │
│  [View Privacy Notice →] Version 2.1 (English)                      │
│                                                                      │
│  📞 ORGANIZATION CONTACT                                             │
│  Data Protection Officer: privacy@hdfcbank.com                      │
│  Support: 1800-XXX-XXXX                                             │
│                                                                      │
│  🔒 CONSENT ID                                                       │
│  consent_01HQXXX...                                                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ [📥 Download Receipt (JSON)] [📥 Download Receipt (PDF)]       │ │
│  │ [❌ Revoke Consent]          [🗑️ Request Data Erasure]         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**History Tab:**
```
│  [Overview] [History] [Actions]                                     │
│                                                                      │
│  📅 CONSENT HISTORY                                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ✅ CONSENT GRANTED                             2026-02-11 10:00 │ │
│  │    User granted consent via web portal                          │ │
│  │                                                                 │ │
│  │ ✅ CONSENT APPROVED                            2026-02-11 10:01 │ │
│  │    User confirmed with OTP verification                         │ │
│  │                                                                 │ │
│  │ 🔍 DATA ACCESSED                               2026-02-11 14:30 │ │
│  │    HDFC Bank processed credit verification                      │ │
│  │                                                                 │ │
│  │ 🔍 DATA ACCESSED                               2026-02-12 09:15 │ │
│  │    HDFC Bank processed loan application                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [📥 Download History (CSV)]                                         │
```

---

### 4.4 Revoke Consent Confirmation

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️  Confirm Consent Revocation                          [✕ Cancel] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  You are about to revoke consent for:                               │
│                                                                      │
│  🏦 HDFC Bank - Credit Verification                                  │
│                                                                      │
│  ⚠️  IMPORTANT: After revocation                                     │
│  • HDFC Bank will stop processing your data immediately             │
│  • Your loan application may be paused or cancelled                 │
│  • This action cannot be undone (you'll need to grant again)        │
│                                                                      │
│  📝 Please select a reason for revocation:                           │
│  [Dropdown: Select reason ▼]                                        │
│    • No longer using service                                        │
│    • Privacy concerns                                               │
│    • Switching to another service                                   │
│    • Service quality issues                                         │
│    • Other (please specify)                                         │
│                                                                      │
│  💬 Additional comments (optional):                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ☐ I understand the consequences of revoking this consent           │
│                                                                      │
│  [Cancel]                              [Confirm Revocation]         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Validation:**
- Reason must be selected
- Checkbox must be checked
- Confirm button disabled until valid

**Success State:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ ✅ Consent Revoked Successfully                        [✕ Close]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Your consent has been revoked on 2026-02-11 15:30:00 IST          │
│                                                                      │
│  Consent ID: consent_01HQXXX...                                     │
│  Organization: HDFC Bank                                            │
│                                                                      │
│  What happens next:                                                 │
│  1. HDFC Bank has been notified of the revocation                   │
│  2. They must stop processing your data immediately                 │
│  3. You will receive a confirmation email                           │
│  4. You can download a revocation receipt below                     │
│                                                                      │
│  [📥 Download Revocation Receipt (PDF)]                             │
│                                                                      │
│  [Close]                                                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 4.5 Erasure Request Form

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🗑️ Request Data Erasure                              [✕ Cancel]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Request deletion of your data from:                                │
│  🏦 HDFC Bank Limited                                                │
│                                                                      │
│  ⚠️  IMPORTANT INFORMATION                                           │
│                                                                      │
│  Under DPDP Act 2023 Section 13, you have the right to request     │
│  erasure of your personal data. However:                            │
│                                                                      │
│  • Organization has 30 days to respond                              │
│  • Some data may be retained for legal compliance                   │
│  • Active services may be terminated                                │
│  • This action is irreversible                                      │
│                                                                      │
│  📋 ERASURE DETAILS                                                  │
│                                                                      │
│  Reason for erasure: *                                              │
│  [Dropdown: Select reason ▼]                                        │
│    • No longer using service                                        │
│    • Data no longer necessary for original purpose                  │
│    • Consent withdrawn                                              │
│    • Personal preference                                            │
│    • Data security concerns                                         │
│    • Other (please specify)                                         │
│                                                                      │
│  Additional details:                                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  🔐 CONFIRMATION                                                     │
│                                                                      │
│  To proceed, please enter your registered mobile OTP:               │
│  [______] (OTP sent to +91-XXXXX-XX890) [Resend OTP]               │
│                                                                      │
│  ☐ I acknowledge that this will terminate my active services        │
│  ☐ I have read and understood the erasure policy                    │
│                                                                      │
│  [Cancel]                              [Submit Erasure Request]     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Success State:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ ✅ Erasure Request Submitted                           [✕ Close]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Your data erasure request has been submitted successfully.         │
│                                                                      │
│  Request ID: erasure_01HQYYY...                                     │
│  Organization: HDFC Bank                                            │
│  Submitted: 2026-02-11 15:45:00 IST                                 │
│                                                                      │
│  📅 TIMELINE                                                         │
│  • Expected response: Within 30 days (by 2026-03-13)                │
│  • You will receive email updates on progress                       │
│  • Track status in "Erasure Requests" section                       │
│                                                                      │
│  📞 NEXT STEPS                                                       │
│  • Organization will review your request                            │
│  • You may be contacted for additional verification                 │
│  • Confirmation certificate will be issued upon completion          │
│                                                                      │
│  [View Erasure Requests] [Download Confirmation]                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. API Integration Specification

### 5.1 Required Backend APIs

#### **Consent List API** (NEW - Needs Implementation)

```typescript
GET /api/consents
Query Parameters:
  - userId: string (required)
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
  - status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REQUESTED' (optional)
  - search: string (optional, searches purpose and organization)
  - sortBy: 'grantedAt' | 'validUntil' | 'purpose' (default: 'grantedAt')
  - sortOrder: 'asc' | 'desc' (default: 'desc')

Response:
{
  "consents": [
    {
      "consentId": "string",
      "userId": "string",
      "purpose": "string",
      "dataTypes": ["string"],
      "organization": "string", // NEW: needs organization lookup
      "status": "ACTIVE" | "EXPIRED" | "REVOKED" | "REQUESTED",
      "validUntil": "ISO8601",
      "grantedAt": "ISO8601",
      "version": number,
      "noticeId": "string",
      "noticeVersion": "string",
      "language": "string"
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "pages": number
  }
}

Status Codes:
  - 200: Success
  - 401: Unauthorized (invalid JWT)
  - 403: Forbidden (userId mismatch)
  - 500: Server error
```

**Backend Implementation Notes:**
- Filter consents by userId (security critical!)
- Support full-text search on purpose field
- Join with organizations table (if exists) or embed org name in consents
- Cache results for 5 minutes per user

---

#### **Consent Detail API** (Existing)

```typescript
GET /consents/:id
Headers:
  Authorization: Bearer <jwt-token>

Response:
{
  "consentId": "string",
  "userId": "string",
  "purpose": "string",
  "dataTypes": ["string"],
  "status": "ACTIVE" | "EXPIRED" | "REVOKED" | "REQUESTED",
  "validUntil": "ISO8601",
  "grantedAt": "ISO8601",
  "approvedAt": "ISO8601",
  "revokedAt": "ISO8601" | null,
  "version": number,
  "noticeId": "string",
  "noticeVersion": "string",
  "language": "string"
}
```

**Security:** Verify consent.userId matches authenticated user's userId

---

#### **Grant Consent API** (Existing)

```typescript
POST /consents
Headers:
  Authorization: Bearer <jwt-token>
  Content-Type: application/json

Body:
{
  "userId": "string",
  "purpose": "string",
  "dataTypes": ["string"],
  "validUntil": "ISO8601",
  "noticeId": "string",
  "noticeVersion": "string",
  "language": "en" | "hi" | "ta"
}

Response:
{
  "consentId": "string",
  "status": "REQUESTED",
  "approvalToken": "string",
  "approvalExpiresAt": "ISO8601"
}
```

---

#### **Revoke Consent API** (Existing)

```typescript
POST /consents/:id/revoke
Headers:
  Authorization: Bearer <jwt-token>
  Content-Type: application/json

Body:
{
  "reason": "NO_LONGER_USING" | "PRIVACY_CONCERNS" | "SWITCHING_SERVICE" | "QUALITY_ISSUES" | "OTHER",
  "comments": "string" (optional)
}

Response:
{
  "consentId": "string",
  "status": "REVOKED",
  "revokedAt": "ISO8601"
}
```

---

#### **Download Receipt APIs** (Existing)

```typescript
GET /consents/:id/receipt
Response: JSON (ISO/IEC 29184 compliant)

GET /consents/:id/receipt.pdf
Response: PDF file (Content-Type: application/pdf)
```

---

#### **Erasure Request API** (NEW - Needs Implementation)

```typescript
POST /api/erasure-requests
Headers:
  Authorization: Bearer <jwt-token>
  Content-Type: application/json

Body:
{
  "userId": "string",
  "consentId": "string",
  "reason": "NO_LONGER_USING" | "DATA_NOT_NECESSARY" | "CONSENT_WITHDRAWN" | "PERSONAL_PREFERENCE" | "SECURITY_CONCERNS" | "OTHER",
  "comments": "string" (optional),
  "confirmationToken": "string" (OTP token)
}

Response:
{
  "requestId": "string",
  "userId": "string",
  "consentId": "string",
  "status": "PENDING",
  "submittedAt": "ISO8601",
  "expectedCompletionDate": "ISO8601", // 30 days from submission
  "trackingUrl": "string"
}

Status Codes:
  - 201: Created
  - 400: Invalid request (invalid OTP, missing fields)
  - 401: Unauthorized
  - 409: Conflict (duplicate request)
  - 500: Server error
```

---

#### **Erasure Request Status API** (NEW - Needs Implementation)

```typescript
GET /api/erasure-requests
Query Parameters:
  - userId: string (required)
  - status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' (optional)
  - page: number (default: 1)
  - limit: number (default: 20)

Response:
{
  "requests": [
    {
      "requestId": "string",
      "userId": "string",
      "consentId": "string",
      "organization": "string",
      "status": "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED",
      "submittedAt": "ISO8601",
      "completedAt": "ISO8601" | null,
      "expectedCompletionDate": "ISO8601",
      "reason": "string",
      "organizationResponse": "string" | null,
      "rejectionReason": "string" | null
    }
  ],
  "pagination": { ... }
}

GET /api/erasure-requests/:id
Response: Single erasure request with full details + timeline
```

---

#### **User Profile API** (Existing - OAuth2)

```typescript
GET /api/users/me
Headers:
  Authorization: Bearer <jwt-token>

Response:
{
  "user": {
    "userId": "string",
    "email": "string",
    "name": "string",
    "isActive": boolean,
    "createdAt": "ISO8601",
    "lastLoginAt": "ISO8601"
  },
  "roles": [
    {
      "roleName": "DP_USER",
      "description": "Data Principal user"
    }
  ],
  "permissions": [
    {
      "permissionName": "CONSENT_CREATE",
      "resource": "consent",
      "action": "create"
    }
  ]
}
```

---

#### **Audit Log API** (Existing - Needs Filtering)

```typescript
GET /audit
Query Parameters:
  - userId: string (optional, for DP dashboard)
  - consentId: string (optional)
  - eventType: string (optional, e.g., 'CONSENT_GRANTED', 'PROCESSING_ALLOWED')
  - startDate: ISO8601 (optional)
  - endDate: ISO8601 (optional)
  - page: number (default: 1)
  - limit: number (default: 20)

Response:
{
  "logs": [
    {
      "auditId": "string",
      "eventType": "string",
      "consentId": "string",
      "userId": "string",
      "timestamp": "ISO8601",
      "details": { ... }
    }
  ],
  "pagination": { ... }
}
```

**Backend Change Needed:** Add userId filter support (currently admin-only)

---

### 5.2 API Error Handling

**Standard Error Response:**
```typescript
{
  "error": "string", // Error code (e.g., "CONSENT_NOT_FOUND")
  "message": "string", // Human-readable message
  "details": { ... } // Additional context (optional)
}
```

**Common Error Codes:**
- `UNAUTHORIZED`: Missing or invalid JWT token
- `FORBIDDEN`: User doesn't have permission
- `CONSENT_NOT_FOUND`: Consent ID doesn't exist
- `CONSENT_NOT_OWNED`: Consent belongs to another user
- `CONSENT_ALREADY_REVOKED`: Cannot revoke a revoked consent
- `INVALID_OTP`: OTP verification failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

---

## 6. Authentication Flow

### 6.1 OAuth2 Login Flow (Aadhaar/DigiLocker)

```
┌─────────┐                    ┌──────────────┐                    ┌──────────────┐
│  User   │                    │   Frontend   │                    │   Backend    │
│ Browser │                    │  (React)     │                    │  (Express)   │
└────┬────┘                    └──────┬───────┘                    └──────┬───────┘
     │                                │                                   │
     │  1. Click "Login with Aadhaar"│                                   │
     ├────────────────────────────────>                                   │
     │                                │                                   │
     │                                │  2. GET /auth/login               │
     │                                ├──────────────────────────────────>│
     │                                │                                   │
     │                                │  3. Redirect to DigiLocker        │
     │                                │<──────────────────────────────────┤
     │                                │  (OAuth2 authorization URL)       │
     │                                │                                   │
     │  4. Redirect to DigiLocker     │                                   │
     │<────────────────────────────────                                   │
     │                                                                    │
     ├───────────────────────────────────────────┐                       │
     │  DigiLocker:                              │                       │
     │  5. User authenticates with Aadhaar OTP   │                       │
     │  6. User grants consent to share profile  │                       │
     │<──────────────────────────────────────────┘                       │
     │                                                                    │
     │  7. Redirect to /auth/callback?code=xxx                           │
     ├───────────────────────────────────────────────────────────────────>│
     │                                                                    │
     │                                            8. Exchange code for    │
     │                                               access token         │
     │                                            9. Fetch user profile   │
     │                                            10. Create/update user  │
     │                                            11. Generate JWT        │
     │                                                                    │
     │  12. Set httpOnly cookie + redirect home                          │
     │<───────────────────────────────────────────────────────────────────│
     │                                                                    │
     │  13. Request dashboard data                                       │
     │  (JWT in cookie)                                                  │
     ├───────────────────────────────────────────────────────────────────>│
     │                                                                    │
     │  14. Validate JWT + return data                                   │
     │<───────────────────────────────────────────────────────────────────│
     │                                                                    │
```

### 6.2 JWT Token Management

**Token Storage:**
- **Recommended:** httpOnly cookie (XSS protection)
- **Alternative:** Secure session storage (not localStorage!)

**Token Refresh:**
```javascript
// Frontend: Axios interceptor
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Logout Flow:**
```
1. User clicks "Logout"
2. Frontend calls POST /auth/logout
3. Backend invalidates session/cookie
4. Frontend clears local state
5. Redirect to home/login page
```

---

## 7. Component Breakdown

### 7.1 Component Hierarchy

```
App
├── AuthProvider
│   ├── LoginPage
│   │   └── OAuth2LoginButton
│   └── AuthCallback
│
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   ├── LanguageSwitcher
│   │   └── UserMenu
│   ├── Sidebar (optional)
│   └── Footer
│
└── Routes (Protected)
    ├── DashboardPage
    │   ├── ConsentSummaryCards
    │   ├── QuickActionButtons
    │   ├── RecentActivityFeed
    │   └── AlertBanner
    │
    ├── ConsentListPage
    │   ├── ConsentSearchBar
    │   ├── ConsentFilters
    │   ├── ConsentTable
    │   │   ├── ConsentTableRow
    │   │   └── ConsentStatusBadge
    │   └── Pagination
    │
    ├── ConsentDetailModal
    │   ├── ConsentOverviewTab
    │   │   ├── ConsentPurpose
    │   │   ├── DataTypesList
    │   │   ├── ValidityInfo
    │   │   └── OrganizationContact
    │   ├── ConsentHistoryTab
    │   │   └── ConsentTimeline
    │   └── ConsentActionsTab
    │       ├── DownloadReceiptButton
    │       ├── RevokeConsentButton
    │       └── RequestErasureButton
    │
    ├── RevokeConsentModal
    │   ├── RevokeReasonSelect
    │   ├── RevokeCommentsTextarea
    │   └── RevokeConfirmCheckbox
    │
    ├── ErasureRequestPage
    │   ├── ErasureRequestForm
    │   │   ├── ErasureReasonSelect
    │   │   ├── ErasureCommentsTextarea
    │   │   ├── OTPInput
    │   │   └── ErasureConfirmCheckboxes
    │   └── ErasureRequestList
    │       ├── ErasureRequestTable
    │       └── ErasureRequestDetailModal
    │
    ├── ActivityLogPage
    │   ├── ActivityFilters
    │   ├── ActivityTable
    │   └── ExportButton
    │
    ├── SettingsPage
    │   ├── ProfileSettings
    │   ├── LanguageSettings
    │   └── NotificationSettings
    │
    └── HelpPage
        ├── FAQAccordion
        ├── VideoTutorials
        └── ContactSupportForm
```

---

### 7.2 Shared Components Library

#### **ConsentStatusBadge**
```typescript
interface Props {
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REQUESTED';
  size?: 'sm' | 'md' | 'lg';
}

// Visual:
// ✅ ACTIVE    (green)
// ⏰ EXPIRED   (orange)
// ❌ REVOKED   (red)
// 🕐 REQUESTED (blue)
```

#### **DataTypeChip**
```typescript
interface Props {
  dataType: string;
  removable?: boolean;
  onRemove?: () => void;
}

// Visual:
// [PAN Card ×] [Aadhaar ×] [Bank Account ×]
```

#### **ConfirmationModal**
```typescript
interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  warningText?: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: 'primary' | 'danger';
}
```

#### **LoadingSpinner**
```typescript
interface Props {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}
```

#### **ErrorMessage**
```typescript
interface Props {
  error: Error | string;
  retry?: () => void;
  fullScreen?: boolean;
}
```

#### **EmptyState**
```typescript
interface Props {
  icon: ReactNode;
  title: string;
  message: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}
```

---

## 8. Data Models

### 8.1 TypeScript Interfaces

```typescript
// Consent Model
interface Consent {
  consentId: string;
  userId: string;
  purpose: string;
  dataTypes: string[];
  organization: string;
  status: ConsentStatus;
  validUntil: string; // ISO8601
  grantedAt: string; // ISO8601
  approvedAt?: string; // ISO8601
  revokedAt?: string; // ISO8601
  version: number;
  noticeId: string;
  noticeVersion: string;
  language: Language;
}

type ConsentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REQUESTED';
type Language = 'en' | 'hi' | 'ta';

// Erasure Request Model
interface ErasureRequest {
  requestId: string;
  userId: string;
  consentId: string;
  organization: string;
  status: ErasureStatus;
  reason: ErasureReason;
  comments?: string;
  submittedAt: string; // ISO8601
  completedAt?: string; // ISO8601
  expectedCompletionDate: string; // ISO8601
  organizationResponse?: string;
  rejectionReason?: string;
}

type ErasureStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
type ErasureReason =
  | 'NO_LONGER_USING'
  | 'DATA_NOT_NECESSARY'
  | 'CONSENT_WITHDRAWN'
  | 'PERSONAL_PREFERENCE'
  | 'SECURITY_CONCERNS'
  | 'OTHER';

// Audit Log Entry
interface AuditLogEntry {
  auditId: string;
  eventType: string;
  consentId: string;
  userId: string;
  timestamp: string; // ISO8601
  details: Record<string, any>;
}

// User Model
interface User {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  aadhaarId?: string; // Masked (XXXX-XXXX-1234)
  isActive: boolean;
  createdAt: string; // ISO8601
  lastLoginAt: string; // ISO8601
  preferences: UserPreferences;
}

interface UserPreferences {
  language: Language;
  emailNotifications: boolean;
  smsNotifications: boolean;
  notifyConsentExpiry: boolean;
  notifyProcessingActivity: boolean;
}

// Pagination Model
interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// API Response Models
interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}
```

---

## 9. Error Handling & Edge Cases

### 9.1 Network Errors

**Scenario:** API request fails due to network issues

**Handling:**
```typescript
// Retry logic with exponential backoff
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries = 3
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** i * 1000));
    }
  }
};
```

**UI:**
```
┌──────────────────────────────────────┐
│ ⚠️ Connection Error                  │
│                                      │
│ Unable to load consents due to       │
│ network issues. Please check your    │
│ internet connection.                 │
│                                      │
│ [Retry] [Dismiss]                    │
└──────────────────────────────────────┘
```

---

### 9.2 Session Expiry

**Scenario:** JWT token expires during user session

**Handling:**
```typescript
// Axios interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state
      localStorage.removeItem('auth_token');
      // Redirect to login
      window.location.href = '/login?session_expired=true';
    }
    return Promise.reject(error);
  }
);
```

**UI:**
```
┌──────────────────────────────────────┐
│ 🔒 Session Expired                   │
│                                      │
│ Your session has expired for your    │
│ security. Please log in again to     │
│ continue.                            │
│                                      │
│ [Login Again]                        │
└──────────────────────────────────────┘
```

---

### 9.3 Empty State

**Scenario:** User has no consents yet

**UI:**
```
┌──────────────────────────────────────┐
│          📋                          │
│                                      │
│     No Consents Yet                  │
│                                      │
│  You haven't granted any consents.   │
│  When you do, they'll appear here.   │
│                                      │
│  [Grant Your First Consent]          │
│                                      │
└──────────────────────────────────────┘
```

---

### 9.4 Permission Denied

**Scenario:** User tries to revoke already revoked consent

**Handling:**
```typescript
if (consent.status === 'REVOKED') {
  toast.error('This consent has already been revoked');
  return;
}
```

**UI:**
```
┌──────────────────────────────────────┐
│ ⚠️ Cannot Revoke Consent             │
│                                      │
│ This consent has already been        │
│ revoked on 2026-01-15.               │
│                                      │
│ [View Revocation Details] [Close]    │
└──────────────────────────────────────┘
```

---

### 9.5 Validation Errors

**Scenario:** User submits form with missing fields

**Handling:**
```typescript
// Form validation with Zod
const erasureSchema = z.object({
  reason: z.string().min(1, 'Please select a reason'),
  comments: z.string().max(500, 'Comments must be under 500 characters'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  confirmTerms: z.literal(true, { message: 'You must accept terms' }),
});
```

**UI:**
```
┌──────────────────────────────────────┐
│ Reason for erasure: *                │
│ [Please select ▼]                    │
│ ⚠️ Please select a reason            │
│                                      │
│ Enter OTP: *                         │
│ [______]                             │
│ ⚠️ OTP must be 6 digits              │
│                                      │
│ ☐ I accept terms                     │
│ ⚠️ You must accept terms             │
│                                      │
│ [Submit] (disabled)                  │
└──────────────────────────────────────┘
```

---

### 9.6 Rate Limiting

**Scenario:** User makes too many requests

**Handling:**
```typescript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'];
  toast.error(
    `Too many requests. Please try again in ${retryAfter} seconds.`
  );
}
```

**UI:**
```
┌──────────────────────────────────────┐
│ ⏱️ Too Many Requests                 │
│                                      │
│ You've made too many requests.       │
│ Please wait 60 seconds before        │
│ trying again.                        │
│                                      │
│ [OK]                                 │
└──────────────────────────────────────┘
```

---

## 10. Multi-language Support

### 10.1 Internationalization (i18n)

**Library:** react-i18next

**Setup:**
```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ta: { translation: ta },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});
```

---

### 10.2 Translation Keys

**Example: locales/en.json**
```json
{
  "dashboard": {
    "title": "Data Principal Dashboard",
    "welcome": "Welcome, {{name}}",
    "summary": {
      "active": "Active Consents",
      "expired": "Expired Consents",
      "revoked": "Revoked Consents"
    },
    "quickActions": {
      "grant": "Grant New Consent",
      "requestErasure": "Request Data Erasure",
      "viewReceipts": "View Receipts"
    }
  },
  "consent": {
    "list": {
      "title": "My Consents",
      "search": "Search consents...",
      "filters": {
        "all": "All",
        "active": "Active",
        "expired": "Expired",
        "revoked": "Revoked"
      }
    },
    "detail": {
      "purpose": "Purpose",
      "dataTypes": "Data Types Shared",
      "validity": "Validity",
      "status": "Status",
      "organization": "Organization",
      "contact": "Organization Contact"
    },
    "revoke": {
      "title": "Revoke Consent",
      "warning": "After revocation, the organization will stop processing your data immediately.",
      "reason": "Please select a reason for revocation",
      "confirm": "I understand the consequences",
      "success": "Consent revoked successfully"
    }
  },
  "erasure": {
    "title": "Request Data Erasure",
    "warning": "This action is irreversible and may terminate active services.",
    "reason": "Reason for erasure",
    "timeline": "Expected response: Within 30 days",
    "success": "Erasure request submitted successfully"
  },
  "errors": {
    "networkError": "Unable to connect. Please check your internet connection.",
    "sessionExpired": "Your session has expired. Please log in again.",
    "permissionDenied": "You don't have permission to perform this action.",
    "notFound": "The requested resource was not found.",
    "serverError": "Something went wrong. Please try again later."
  }
}
```

**Example: locales/hi.json** (Hindi)
```json
{
  "dashboard": {
    "title": "डेटा प्रिंसिपल डैशबोर्ड",
    "welcome": "स्वागत है, {{name}}",
    "summary": {
      "active": "सक्रिय सहमति",
      "expired": "समाप्त सहमति",
      "revoked": "रद्द सहमति"
    }
  }
  // ... (full translation)
}
```

**Example: locales/ta.json** (Tamil)
```json
{
  "dashboard": {
    "title": "தரவு முதன்மை டாஷ்போர்டு",
    "welcome": "வரவேற்கிறோம், {{name}}",
    "summary": {
      "active": "செயலில் உள்ள ஒப்புதல்",
      "expired": "காலாவதியான ஒப்புதல்",
      "revoked": "ரத்து செய்யப்பட்ட ஒப்புதல்"
    }
  }
  // ... (full translation)
}
```

---

### 10.3 Right-to-Left (RTL) Support

**Note:** Hindi and Tamil are LTR languages, so RTL is not required for this phase. However, for future Arabic/Urdu support:

```typescript
// App.tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.dir = i18n.dir();
  }, [i18n.language]);

  return <div className="app">{/* ... */}</div>;
}
```

---

## 11. Accessibility Requirements

### 11.1 WCAG 2.1 Level AA Compliance

**Keyboard Navigation:**
- All interactive elements accessible via Tab key
- Logical tab order (top-to-bottom, left-to-right)
- Focus indicators visible (2px outline)
- Escape key closes modals
- Enter/Space activates buttons

**Screen Reader Support:**
- ARIA labels on all form inputs
- ARIA live regions for dynamic content (toasts, alerts)
- ARIA roles (button, dialog, menu, etc.)
- Descriptive link text (no "click here")

**Color Contrast:**
- Text: 4.5:1 minimum (normal text)
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum
- Don't rely solely on color for information

**Focus Management:**
- Focus trapped in modal when open
- Focus returns to trigger element on close
- Skip to main content link

---

### 11.2 Implementation Examples

**Accessible Button:**
```typescript
<button
  type="button"
  aria-label="Revoke consent for HDFC Bank"
  onClick={handleRevoke}
  disabled={isRevoking}
>
  {isRevoking ? 'Revoking...' : 'Revoke Consent'}
</button>
```

**Accessible Modal:**
```typescript
<Dialog
  open={isOpen}
  onClose={onClose}
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <DialogTitle id="modal-title">Revoke Consent</DialogTitle>
  <DialogContent id="modal-description">
    {/* ... */}
  </DialogContent>
</Dialog>
```

**Accessible Form:**
```typescript
<label htmlFor="reason">
  Reason for revocation <span aria-label="required">*</span>
</label>
<select
  id="reason"
  name="reason"
  required
  aria-required="true"
  aria-describedby="reason-error"
>
  <option value="">Select reason</option>
  {/* ... */}
</select>
{errors.reason && (
  <p id="reason-error" role="alert" aria-live="polite">
    {errors.reason}
  </p>
)}
```

---

## 12. Security Requirements

### 12.1 Authentication & Authorization

**JWT Token Security:**
- Store in httpOnly cookie (XSS protection)
- Set Secure flag (HTTPS only)
- Set SameSite=Strict (CSRF protection)
- Short expiry (1 hour recommended)
- Refresh token flow for long sessions

**API Security:**
- CORS: Whitelist dashboard domain only
- CSRF tokens on state-changing requests
- Rate limiting per user (10 req/minute)
- Input validation on all endpoints

---

### 12.2 Data Protection

**Sensitive Data Display:**
- Mask Aadhaar: `XXXX-XXXX-1234`
- Mask PAN: `ABCDE****F`
- Mask Phone: `+91-XXXXX-XX890`
- Mask Email: `p***a@example.com`

**Audit Trail:**
- Log all consent create/revoke actions
- Log erasure requests
- Log login/logout events
- Store IP address and user agent

---

### 12.3 Input Validation

**Client-Side:**
```typescript
// Zod schema validation
const consentGrantSchema = z.object({
  purpose: z.string().min(10).max(200),
  dataTypes: z.array(z.string()).min(1).max(10),
  validUntil: z.string().datetime(),
  noticeId: z.string().uuid(),
  confirmTerms: z.literal(true),
});
```

**Server-Side:**
- Validate all inputs (never trust client)
- Sanitize HTML/SQL inputs
- Check userId ownership on all operations
- Verify JWT claims match request userId

---

## 13. Performance Requirements

### 13.1 Load Time Targets

| Page | Target | Max |
|------|--------|-----|
| Dashboard | 1.5s | 2s |
| Consent List | 2s | 3s |
| Consent Detail | 0.5s | 1s |
| Forms | Instant | 0.5s |

**Measurement:** Lighthouse Performance Score > 90

---

### 13.2 Optimization Strategies

**Code Splitting:**
```typescript
// Route-based code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ConsentListPage = lazy(() => import('./pages/ConsentListPage'));
const ErasureRequestPage = lazy(() => import('./pages/ErasureRequestPage'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/consents" element={<ConsentListPage />} />
    <Route path="/erasure" element={<ErasureRequestPage />} />
  </Routes>
</Suspense>
```

**Data Caching:**
```typescript
// React Query for data fetching
const { data, isLoading } = useQuery({
  queryKey: ['consents', userId, page, status],
  queryFn: () => fetchConsents(userId, page, status),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

**Pagination:**
- Limit: 20 items per page (adjustable)
- Virtual scrolling for large lists (100+ items)
- Infinite scroll for mobile

**Image Optimization:**
- SVG icons (not PNG)
- Lazy loading images below fold
- WebP format with fallback

---

## 14. Testing Strategy

### 14.1 Unit Testing

**Framework:** Jest + React Testing Library

**Coverage Targets:**
- Components: 80% coverage
- Utils: 90% coverage
- Hooks: 85% coverage

**Example Tests:**
```typescript
describe('ConsentStatusBadge', () => {
  it('renders active status with green color', () => {
    const { getByText } = render(<ConsentStatusBadge status="ACTIVE" />);
    expect(getByText('ACTIVE')).toHaveClass('badge-green');
  });

  it('renders revoked status with red color', () => {
    const { getByText } = render(<ConsentStatusBadge status="REVOKED" />);
    expect(getByText('REVOKED')).toHaveClass('badge-red');
  });
});

describe('ConsentListPage', () => {
  it('fetches and displays consents', async () => {
    const mockConsents = [/* ... */];
    mockAPI.get('/api/consents').reply(200, { consents: mockConsents });

    const { getByText } = render(<ConsentListPage />);

    await waitFor(() => {
      expect(getByText('HDFC Bank')).toBeInTheDocument();
    });
  });

  it('handles empty state', async () => {
    mockAPI.get('/api/consents').reply(200, { consents: [] });

    const { getByText } = render(<ConsentListPage />);

    await waitFor(() => {
      expect(getByText('No Consents Yet')).toBeInTheDocument();
    });
  });
});
```

---

### 14.2 Integration Testing

**Framework:** Cypress / Playwright

**Test Scenarios:**
1. **Login Flow**
   - User clicks "Login with Aadhaar"
   - OAuth2 flow completes
   - User redirected to dashboard

2. **View Consents**
   - User navigates to consent list
   - Consents load from API
   - User can search and filter

3. **Revoke Consent**
   - User opens consent detail
   - User clicks "Revoke"
   - Confirms revocation
   - Consent status changes to REVOKED

4. **Request Erasure**
   - User navigates to erasure page
   - Fills out form
   - Enters OTP
   - Request submitted successfully

---

### 14.3 Accessibility Testing

**Tools:**
- axe DevTools (browser extension)
- WAVE (WebAIM)
- Lighthouse Accessibility Score > 95

**Manual Testing:**
- Keyboard-only navigation
- Screen reader (NVDA/JAWS/VoiceOver)
- Color contrast checker
- Mobile screen reader (TalkBack/VoiceOver)

---

### 14.4 Performance Testing

**Tools:**
- Lighthouse CI
- WebPageTest
- Chrome DevTools Performance

**Metrics:**
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3s
- Cumulative Layout Shift (CLS) < 0.1

---

## 15. Implementation Phases

### Phase 1: Core MVP (4 weeks)

**Week 1: Setup & Authentication**
- [ ] Project setup (React, TypeScript, Vite)
- [ ] OAuth2 login integration
- [ ] JWT token management
- [ ] Protected route setup
- [ ] Basic layout (header, footer, navigation)

**Week 2: Dashboard & Consent List**
- [ ] Dashboard overview page
- [ ] Consent summary cards
- [ ] Consent list page
- [ ] Search and filter functionality
- [ ] Pagination

**Week 3: Consent Detail & Revoke**
- [ ] Consent detail modal
- [ ] Consent history tab
- [ ] Revoke consent flow
- [ ] Download receipt (JSON/PDF)
- [ ] Success/error messaging

**Week 4: Testing & Polish**
- [ ] Unit tests for core components
- [ ] Integration tests for critical flows
- [ ] Accessibility audit and fixes
- [ ] Performance optimization
- [ ] Bug fixes

**Deliverables:**
- Working dashboard with view/revoke functionality
- OAuth2 authentication
- 80% test coverage
- WCAG AA compliant

---

### Phase 2: Erasure & Audit (2 weeks)

**Week 5: Erasure Requests**
- [ ] Erasure request form
- [ ] OTP verification
- [ ] Request submission
- [ ] Request status tracking
- [ ] Timeline visualization

**Week 6: Activity Log**
- [ ] Audit log page
- [ ] Filtering by date/organization
- [ ] Processing activity view
- [ ] Export to PDF/CSV

**Deliverables:**
- Complete DPDP Act rights implementation
- Audit trail visibility
- Export functionality

---

### Phase 3: Settings & Support (1 week)

**Week 7: User Settings & Help**
- [ ] Profile settings page
- [ ] Language switcher (EN/HI/TA)
- [ ] Notification preferences
- [ ] FAQ page
- [ ] Contact support form

**Deliverables:**
- Multi-language support
- User customization
- Help documentation

---

### Phase 4: Grant Consent (1 week) [Optional]

**Week 8: Grant New Consent**
- [ ] Grant consent form
- [ ] Privacy notice display
- [ ] OTP confirmation
- [ ] Success receipt download

**Deliverables:**
- Full consent lifecycle (grant + revoke)

---

## Appendix A: Backend API Requirements

### APIs to Implement

1. **GET /api/consents** (NEW)
   - Filter by userId
   - Search by purpose/organization
   - Sort and paginate
   - Priority: HIGH

2. **POST /api/erasure-requests** (NEW)
   - Validate OTP
   - Create erasure request
   - Send notification to organization
   - Priority: HIGH

3. **GET /api/erasure-requests** (NEW)
   - Filter by userId
   - Track status
   - Priority: HIGH

4. **GET /audit** (MODIFY)
   - Add userId filter support
   - Currently admin-only
   - Priority: MEDIUM

5. **PATCH /api/users/me/preferences** (NEW)
   - Update language
   - Update notification settings
   - Priority: LOW

---

## Appendix B: Design System

### Color Palette

**Primary:**
- Primary: `#1976D2` (Blue)
- Primary Hover: `#135BA1`
- Primary Light: `#E3F2FD`

**Status:**
- Success (Active): `#2E7D32` (Green)
- Warning (Expiring): `#F57C00` (Orange)
- Error (Revoked): `#C62828` (Red)
- Info (Requested): `#0288D1` (Blue)

**Neutral:**
- Text Primary: `#212121`
- Text Secondary: `#757575`
- Background: `#FAFAFA`
- Border: `#E0E0E0`

### Typography

**Font Family:**
- English: Inter, system-ui
- Hindi: Noto Sans Devanagari, system-ui
- Tamil: Noto Sans Tamil, system-ui

**Scale:**
- h1: 32px / 2rem (bold)
- h2: 24px / 1.5rem (semibold)
- h3: 20px / 1.25rem (semibold)
- body: 16px / 1rem (regular)
- small: 14px / 0.875rem (regular)

### Spacing

**Scale:** 4px base unit
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

---

## Appendix C: Deployment Checklist

- [ ] Environment variables configured (.env.production)
- [ ] OAuth2 redirect URLs whitelisted
- [ ] CORS origins whitelisted
- [ ] HTTPS enabled (SSL certificate)
- [ ] CDN configured for static assets
- [ ] Error monitoring (Sentry/Rollbar)
- [ ] Analytics configured (Google Analytics/Matomo)
- [ ] Performance monitoring (Lighthouse CI)
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting configured
- [ ] Backup strategy in place
- [ ] Incident response plan documented

---

**END OF SPECIFICATION**

**Next Steps:**
1. Review specification with stakeholders
2. Assign frontend team
3. Set up development environment
4. Begin Phase 1 implementation
5. Start parallel backend API development

**Questions & Feedback:**
Contact: [Project Manager Email]  
Slack: #consent-manager-frontend
