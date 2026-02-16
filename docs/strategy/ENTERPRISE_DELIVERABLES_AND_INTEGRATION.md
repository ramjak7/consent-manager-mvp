# Enterprise Deliverables & Integration Guide — Consent Management System (CMS)

**Document ID:** STRAT-ENT-001  
**Version:** 1.0  
**Date:** 2026-02-16  
**Purpose:** Defines what the CMS delivers to enterprise customers, how they integrate it, and gaps vs competitors.

---

## 1. Product Packaging — Deployment Models

Enterprise CMSs are delivered in 3 deployment models:

| Model | Description | Who Uses It | Our Current Fit |
|-------|-------------|-------------|-----------------|
| **SaaS Multi-tenant** | Customer gets a tenant on our cloud. API keys + SDK. | SMBs, startups, mid-market | ✅ Current Railway/Vercel setup |
| **Dedicated SaaS** | Isolated instance per customer on our infra. | Banks, insurance, telecom (data sovereignty) | Needs infra automation |
| **On-Premise / Private Cloud** | Docker images/Helm charts deployed in customer's infra | RBI-regulated entities, defense, govt | Needs containerization |

**Industry reality**: Banks (RBI-regulated) and insurance (IRDAI) almost always demand **dedicated or on-premise**. Telecom and e-commerce often accept SaaS.

---

## 2. Enterprise Deliverables (What Competitors Ship)

### 2.1 Core Platform Components

| Component | What It Is | OneTrust | Securiti | Protean (India) | **Our CMP** |
|-----------|-----------|----------|----------|-----------------|-------------|
| **Consent Collection SDK** | JS/Mobile SDK customers embed in their apps to show consent notices and capture consent | ✅ | ✅ | ✅ | ❌ Not yet |
| **Consent Management API** | REST API for CRUD on consents, processing validation | ✅ | ✅ | ✅ | ✅ |
| **DP Self-Service Portal** | Web UI for Data Principals to view/revoke/export | ✅ | ✅ | ✅ | ✅ |
| **DF Admin Console** | Dashboard for Data Fiduciaries to manage compliance | ✅ | ✅ | ✅ | ✅ |
| **Consent Receipt Engine** | ISO 29184 receipts (JSON + PDF) | ✅ | ✅ | Partial | ✅ |
| **Purpose Management** | Define, version, and manage processing purposes | ✅ | ✅ | ✅ | ✅ |
| **Processor Registry** | Track third-party data processors and DPAs | ✅ | ✅ | ❌ | ✅ |
| **Webhook/Event System** | Real-time notifications to customer systems | ✅ | ✅ | ❌ | ✅ |
| **Audit Trail** | Immutable, tamper-evident compliance logs | ✅ | ✅ | ✅ | ✅ |
| **Notice Management** | Create/version multilingual consent notices | ✅ | ✅ | ✅ | Partial (artefacts exist, no UI) |
| **DSR Automation** | Data Subject Request workflows (erasure, correction, portability) | ✅ | ✅ | Partial | ✅ |
| **Preference Center** | Consumer-facing portal to manage communication preferences | ✅ | ✅ | ❌ | ❌ |
| **Cookie Consent Banner** | Web cookie consent (GDPR-style) | ✅ | ✅ | ❌ | ❌ |

### 2.2 Integration Deliverables

| Deliverable | Description | Industry Standard |
|------------|-------------|-------------------|
| **REST API + API Docs** | OpenAPI/Swagger spec, Postman collection | Standard |
| **JavaScript SDK** | `<script>` tag or npm package for web apps | Standard |
| **Mobile SDKs** | iOS (Swift), Android (Kotlin) SDKs | OneTrust, Securiti |
| **Pre-built Connectors** | Salesforce, SAP, ServiceNow, Freshdesk integrations | OneTrust (200+), Securiti |
| **Webhook Events** | consent.granted, consent.revoked, erasure.requested, etc. | Standard |
| **SSO/SAML Integration** | Customer's employees login via their IdP | Standard for enterprise |
| **SCIM Provisioning** | Auto-provision DF users from customer's AD/Okta | Enterprise tier |

### 2.3 Compliance Deliverables (Documents)

| Document | Purpose | Our Status |
|----------|---------|------------|
| **DPIA Template** | Pre-filled Data Protection Impact Assessment | ✅ In artefacts |
| **DPA Template** | Data Processing Agreement for processors | ✅ In artefacts |
| **Consent Notice Templates** | Multilingual notice templates (14 languages) | ✅ In artefacts |
| **Audit Narratives** | Pre-written auditor-ready compliance stories | ✅ In artefacts |
| **SOC 2 Type II Report** | Security audit certification | ❌ Needed for enterprise |
| **Penetration Test Report** | Third-party security assessment | ❌ Needed |

---

## 3. How Customers Integrate (The Actual Workflow)

### 3.1 Typical Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Customer's Ecosystem                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│  │ Web App  │  │Mobile App│  │   CRM    │  │   ERP  │   │
│  │(Angular) │  │ (React   │  │(Sales-   │  │ (SAP)  │   │
│  │          │  │  Native) │  │  -force) │  │        │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘   │
│       │              │              │             │     │
│       ▼              ▼              ▼             ▼     │
│  ┌─────────────────────────────────────────────────┐    │
│  │          Consent SDK / API Gateway              │    │
│  │  (Customer embeds OUR SDK in THEIR apps)        │    │
│  └──────────────────────┬──────────────────────────┘    │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTPS/REST
                          ▼
              ┌───────────────────────┐
              │   OUR CMP PLATFORM    │
              │  (SaaS or On-Premise) │
              │                       │
              │  • Consent API        │
              │  • Notice Engine      │
              │  • Audit Trail        │
              │  • DP Portal          │
              │  • DF Dashboard       │
              │  • Webhook Engine ────┼──► Customer's webhook
              │  • DSR Automation     │    endpoint (Kafka, SQS)
              └───────────────────────┘
```

### 3.2 Integration Steps (What the Customer Does)

**Step 1: Onboarding (Day 1-3)**
- Customer gets API keys (client_id, client_secret)
- Customer configures their organization profile
- Maps their data processing purposes to the purpose registry
- Registers their data processors

**Step 2: Notice Configuration (Day 3-7)**
- Customer creates consent notices in the admin console
- Sets up multilingual notices (Hindi, English, regional)
- Configures purpose descriptions, data categories, retention periods

**Step 3: SDK Integration (Day 7-21)**
- Customer embeds the **Consent Collection SDK** in their app:

```javascript
// Example: What competitors provide
import { ConsentManager } from '@concurin/consent-sdk';

const cm = new ConsentManager({
  apiKey: 'cm_live_xxxxx',
  orgId: 'org_bank_hdfc',
  language: 'en',
});

// Show consent notice and collect consent
const consent = await cm.collectConsent({
  purposes: ['account_analytics', 'marketing_communications'],
  dataTypes: ['email', 'phone', 'transaction_history'],
  noticeId: 'privacy-notice-v3',
});

// Before processing data, validate consent
const canProcess = await cm.validateProcessing({
  userId: 'user_123',
  purpose: 'account_analytics',
  dataTypes: ['transaction_history'],
});
// canProcess.allowed → true/false
```

**Step 4: Webhook Integration (Day 14-21)**
- Customer registers webhook endpoints
- Their backend listens for consent events:

```
consent.granted  → Enable data processing pipeline
consent.revoked  → Trigger data deletion in their systems
erasure.requested → Auto-create ticket in ServiceNow
consent.expired  → Stop marketing emails in Mailchimp
```

**Step 5: DP Portal Embedding (Day 21-30)**
- Customer either:
  - **Links** to the hosted DP portal (white-labeled with their branding)
  - **Embeds** it via iframe in their existing customer portal
  - **Uses API** to build their own DP-facing UI

### 3.3 Industry-Specific Integration Patterns

| Industry | Key Integration | Why |
|----------|----------------|-----|
| **Banking** | Core Banking System (CBS) + consent check before every transaction involving personal data | RBI mandate — can't process without consent |
| **Telecom** | CRM (subscriber data) + consent before marketing calls (TRAI compliance) | DoT/TRAI regulations + DPDP |
| **Insurance** | Policy admin system + consent for health data processing | IRDAI guidelines on data |
| **E-commerce** | Checkout flow + consent for marketing/analytics cookies | DPDP §6 + consumer trust |
| **Contact Centre** | Call recording systems + consent before recording | DPDP §6(1) — informed consent |
| **Brokerage** | KYC systems + consent for sharing data with exchanges | SEBI data sharing rules |
| **Real Estate** | CRM + consent for sharing buyer data with developers/agents | RERA + DPDP |

---

## 4. Gaps vs Enterprise Readiness

### 4.1 Critical Gaps (Must-Have for First Enterprise Customer)

| Gap | Priority | Effort | Why |
|-----|----------|--------|-----|
| **Consent Collection SDK (JS)** | P0 | 2-3 weeks | This is THE product — without it, customers can't embed consent in their apps |
| **Multi-tenancy** | P0 | 2-3 weeks | Each customer needs isolated data (org_id scoping) |
| **API Key Auth** | P0 | 1 week | Customers authenticate via API keys, not OAuth (OAuth is for DPs) |
| **White-label / Branding** | P1 | 1 week | Customer's logo, colors on DP portal |
| **Notice Builder UI** | P1 | 2 weeks | Admin UI to create/edit consent notices |
| **Organization Management** | P1 | 1 week | Customer profile, billing, API key management |

### 4.2 Important Gaps (Should-Have)

| Gap | Priority | Effort |
|-----|----------|--------|
| SSO/SAML for DF users | P2 | 1 week |
| Pre-built CRM connectors | P2 | 2 weeks each |
| Mobile SDKs (iOS/Android) | P2 | 3-4 weeks |
| Usage analytics / billing metering | P2 | 1 week |
| SOC 2 Type II audit | P2 | 3-6 months |

---

## 5. Competitor Pricing Models (Industry Reference)

| Vendor | Model | Pricing |
|--------|-------|---------|
| **OneTrust** | Per module + per data subject | $50K-$500K/year |
| **Securiti.ai** | Platform license + usage | $30K-$200K/year |
| **TrustArc** | Per domain + modules | $10K-$150K/year |
| **Protean (India)** | Transaction-based (per consent) | ₹2-5 per consent |
| **Indian CMP startups** | SaaS subscription | ₹5L-25L/year |

---

## 6. Go-to-Market Deliverable Package (First Enterprise Customer)

| # | Deliverable | Format | Status |
|---|------------|--------|--------|
| 1 | **CMP Platform Access** | SaaS URL + Admin credentials | ✅ Ready |
| 2 | **API Documentation** | OpenAPI spec + Postman collection | ✅ Have Postman collection |
| 3 | **Consent Collection JS SDK** | npm package | ❌ **Must build** |
| 4 | **DP Self-Service Portal** | White-labeled URL | ✅ Ready (needs white-labeling) |
| 5 | **Integration Guide** | Step-by-step with code samples | ❌ Needs creation |
| 6 | **DPDP Compliance Kit** | DPIA, DPA templates, audit narratives | ✅ In artefacts |
| 7 | **Webhook Event Catalog** | Event types + payload schemas | Partial (needs formal doc) |
| 8 | **SLA Document** | Uptime, support response times | ❌ Needs creation |

---

## 7. Key Takeaway

The **single biggest gap** is the **Consent Collection SDK** — it's the entry point for every customer integration. Without it, customers have to build their own consent UI and just use the API as a backend store, which most won't do. This SDK is what turns the platform from an internal tool into an enterprise product.

---

*Last Updated: 2026-02-16*