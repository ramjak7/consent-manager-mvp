# Production Deployment & Evolution Strategy

> **Consent Manager MVP → Production Platform**
> Document Version: 1.0 | Created: 2026-02-15
> Status: Strategic Planning Reference

---

## Table of Contents

1. [Current Demo Architecture](#1-current-demo-architecture)
2. [Why Demo Architecture Cannot Go to Production](#2-why-demo-architecture-cannot-go-to-production)
3. [Production Architecture Options](#3-production-architecture-options)
4. [Domain & Subdomain Strategy](#4-domain--subdomain-strategy)
5. [DP / DF Portal Separation Strategy](#5-dp--df-portal-separation-strategy)
6. [Infrastructure Provider Comparison](#6-infrastructure-provider-comparison)
7. [Cost Analysis](#7-cost-analysis)
8. [Migration Roadmap & Triggers](#8-migration-roadmap--triggers)
9. [Regulatory & Compliance Requirements](#9-regulatory--compliance-requirements)
10. [Product Differentiation Considerations](#10-product-differentiation-considerations)
11. [Security Architecture for Production](#11-security-architecture-for-production)
12. [Operational Readiness Checklist](#12-operational-readiness-checklist)

---

## 1. Current Demo Architecture

```
┌──────────────────────┐         ┌──────────────────────────────────┐
│   Vercel (US)        │         │  Railway (US)                    │
│   Static SPA         │  HTTPS  │  Express.js + PostgreSQL         │
│   React + Vite       │────────▶│  Node.js process + cron jobs     │
│                      │  CORS   │                                  │
│   *.vercel.app       │         │  *.up.railway.app                │
└──────────────────────┘         └──────────────────────────────────┘
```

| Component | Platform | URL | Region |
|-----------|----------|-----|--------|
| Frontend (React SPA) | Vercel | `*.vercel.app` | US (auto) |
| Backend (Express API) | Railway | `*.up.railway.app` | US-West |
| PostgreSQL | Railway | Internal connection | US-West |

### What Railway Does

Railway provides three things Vercel cannot:

1. **Long-running Node.js process** — Express server + 3 cron jobs (consent expiry, webhook delivery, metrics)
2. **Managed PostgreSQL** — connected via `DATABASE_URL` environment variable
3. **Server-side logic** — JWT signing, cookie setting, hash chain computation, PDF generation

### What Vercel Does

Serves the Vite-built static files (HTML/JS/CSS) via global CDN. Also provides:
- SPA catch-all rewrite (`vercel.json`)
- Automatic HTTPS
- Git-based auto-deploy

### Can It Work With Just One?

| Approach | Feasible? | Pros | Cons |
|----------|-----------|------|------|
| **Railway only** | ✅ Trivial | Same-origin cookies, no CORS, most secure | Pays for compute even serving static files |
| **Vercel only** | ⚠️ Major rewrite | Cheapest for static hosting | No persistent process, no managed PG, serverless rewrites needed for cron jobs |
| **Both (current)** | ✅ Working | Each platform doing what it's best at | Cross-domain auth (sameSite: 'none'), CSRF risk |

---

## 2. Why Demo Architecture Cannot Go to Production

| Problem | Impact | DPDP Relevance |
|---------|--------|----------------|
| **Data in US region** | Railway + Vercel default to US servers | DPDP §17: Personal data must stay in India unless exempted by Central Govt notification |
| **Cross-domain cookies** | `sameSite: 'none'` + `secure` — CSRF attack surface | DPB audit will flag this as a security deficiency |
| **No custom domain** | `*.up.railway.app` — transient, unprofessional | Consent receipts reference this URL; if you switch providers, all receipts break |
| **Platform vendor lock-in** | Railway URL baked into consent artefacts, frontend env vars | Cannot migrate without breaking all existing references |
| **No multi-tenancy** | Single flat DB, no organization concept | Cannot onboard multiple Data Fiduciaries |
| **Single portal** | DP and DF share login page and UI | Industry standard is complete separation (see §5) |
| **No HA/DR** | Single Railway instance, no failover | DPB expects uptime guarantees for registered CMs |
| **No WAF** | Exposed directly to internet | Required for enterprise DF customers |
| **No HSM** | Encryption keys in environment variables | Production should use hardware security modules for key management |

---

## 3. Production Architecture Options

### Tier 1: MVP/Startup (₹5K–15K/month)

```
┌─────────────────────────────────────────────┐
│         Single VPS (India Region)           │
│                                             │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐   │
│  │  Nginx  │  │ Node.js  │  │PostgreSQL │   │
│  │ reverse │──│ Express  │──│  (local)  │   │
│  │  proxy  │  │  + cron  │  │           │   │
│  └─────────┘  └──────────┘  └───────────┘   │
│       │                                     │
│  ┌─────────┐                                │
│  │ Static  │ (Vite build output)            │
│  │  files  │                                │
│  └─────────┘                                │
└─────────────────────────────────────────────┘
         │
    concurin.com (Cloudflare DNS + CDN)
```

- **Provider:** E2E Networks, DigitalOcean Bangalore, or any India-region VPS
- **Setup:** Docker Compose (Nginx + Node.js + PostgreSQL containers)
- **Pros:** Cheapest, same-origin (no CORS), full control, India data residency
- **Cons:** Manual scaling, self-managed backups, single point of failure
- **Best for:** Demos to DF prospects, DPB registration MVP

### Tier 2: Scale-up (₹20K–80K/month)

```
┌──────────────────────────────────────────────────────┐
│              AWS ap-south-1 (Mumbai)                 │
│                                                      │
│  ┌───────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │CloudFront │  │ ECS Fargate │  │ RDS PostgreSQL│   │
│  │   CDN     │──│  (2+ tasks) │──│  (Multi-AZ)   │   │
│  │+ WAF      │  │  Express.js │  │  auto-backup  │   │
│  └───────────┘  └─────────────┘  └───────────────┘   │
│       │              │                               │
│  ┌─────────┐  ┌──────────────┐                       │
│  │   S3    │  │ ElastiCache  │ (sessions, optional)  │
│  │ static  │  │   Redis      │                       │
│  └─────────┘  └──────────────┘                       │
└──────────────────────────────────────────────────────┘
         │
    concurin.com (Route 53 / Cloudflare)
```

- **Pros:** Auto-scaling, managed DB, WAF, compliance certifications (SOC2, ISO 27001)
- **Cons:** Higher cost, AWS expertise needed
- **Best for:** First paying DF customers, serious DPB registration

### Tier 3: Enterprise (₹1L–5L+/month)

```
┌──────────────────────────────────────────────────────────┐
│           AWS / Azure India (Multi-AZ)                   │
│                                                          │
│  ┌───────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │CloudFront │  │  EKS/AKS       │  │ RDS/Azure DB   │   │
│  │ + WAF     │  │  Kubernetes    │  │ Multi-AZ + RR  │   │
│  │ + Shield  │  │  auto-scaling  │  │ encrypted      │   │
│  └───────────┘  └────────────────┘  └────────────────┘   │
│                       │                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │   HSM    │  │ ElastiCache  │  │  S3 + Glacier     │   │
│  │ (CloudHSM│  │   Redis      │  │ (audit archive)   │   │
│  │  or KMS) │  │  (cluster)   │  │                   │   │
│  └──────────┘  └──────────────┘  └───────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Monitoring: CloudWatch / Grafana + Prometheus   │    │
│  │  Logging: CloudWatch Logs / ELK                  │    │
│  │  Alerting: PagerDuty / OpsGenie                  │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

- **Pros:** Full HA, DR, HSM-managed keys, enterprise SLAs, compliance-certified
- **Cons:** Expensive, requires DevOps team
- **Best for:** Multiple DF customers, regulated industries (BFSI), DPB-registered CM

---

## 4. Domain & Subdomain Strategy

### Why a Custom Domain is Required for Production

| Factor | Without Custom Domain | With `concurin.com` |
|--------|----------------------|---------------------|
| **Security** | `sameSite: 'none'` cookies across domains | `sameSite: 'strict'`, same-origin |
| **Compliance** | DPDP §6 notices reference transient platform URLs | Stable URL for consent receipts, DPB registration |
| **Trust** | Data Principals see `*.railway.app` — low confidence | Professional domain for consent collection |
| **Portability** | Locked to Railway/Vercel URLs | Migrate infra without breaking artefact references |
| **Multi-portal** | Hard to separate DP/DF on platform subdomains | Clean separation via subdomains |

### Recommended Subdomain Layout

```
concurin.com              → Marketing / landing page
app.concurin.com          → Data Principal portal (React SPA)
console.concurin.com      → Data Fiduciary admin portal (separate SPA)
api.concurin.com          → Backend API
docs.concurin.com         → API documentation / developer portal
status.concurin.com       → Uptime status page (Upptime / Betteruptime)
```

### DNS & SSL Setup

- **Cloudflare** (free tier): DNS + CDN + DDoS protection + auto SSL
- Alternative: AWS Route 53 + ACM (if all-AWS stack)
- All subdomains get wildcard SSL (`*.concurin.com`)

### Cost

- Domain registration: ₹800–1,500/year (.com)
- Cloudflare: Free tier sufficient for MVP
- SSL: Free (Cloudflare or Let's Encrypt)

---

## 5. DP / DF Portal Separation Strategy

### Industry Standard (What Competitors Do)

| Platform | DP Experience | DF Experience |
|----------|---------------|---------------|
| **OneTrust** | Cookie banner + preference center **embedded on DF's website**. No OneTrust login for consumers. | Separate **OneTrust Admin Console** (enterprise SaaS dashboard) |
| **Securiti** | Consumer-facing **embedded consent widget** on DF's site. Privacy center for DSR submission. | **Securiti PrivacyOps** portal — full enterprise dashboard |
| **TrustArc** | Cookie consent banner + preference center (embedded) | TrustArc admin console for compliance management |
| **Sahamati AA** (India fintech) | Consumer uses **bank's app** or dedicated AA app to manage consent | FIPs/FIUs integrate via **API only** — no shared UI |
| **ABDM/Ayushman** (India health) | Patient uses **ABHA app** for health data consent | Healthcare providers access **HRP systems** — separate portal |

**Universal pattern:** Data Principals and Data Fiduciaries NEVER share a login page.

### Why Separation is Mandatory

1. **Different auth flows** — DPs: Aadhaar/DigiLocker. DFs: email+password+MFA or enterprise SSO
2. **Different permission models** — DPs see own data. DFs see aggregated analytics. Leaked DF session = all DP data exposed
3. **Multi-tenancy** — Multiple DFs, each scoped to their own DPs. DF portal needs org context
4. **Regulatory optics** — DPB auditors seeing a shared login is a compliance flag
5. **White-labeling** — Enterprise DFs want branded consent collection. CM admin portal stays branded as Concurin

### Demo/MVP Approach: Module-Boundary Separation (Recommended)

Instead of the throwaway "two buttons on login page" approach, structure the frontend with clean internal module boundaries:

```
frontend/src/
├── shared/              ← Reused FOREVER (both portals in production)
│   ├── api/             ← client.ts, consent.api.ts, auth.api.ts
│   ├── components/      ← Button, Card, LoadingSpinner, ErrorMessage
│   ├── hooks/           ← useAuth, useConsents, useActivityLog
│   ├── types/           ← consent.types.ts, user.types.ts
│   └── utils/           ← formatters, validators, i18n
├── dp/                  ← Data Principal portal
│   ├── pages/           ← DashboardPage, ConsentListPage, GrantConsentPage
│   ├── components/      ← DP-specific components
│   └── routes.tsx       ← DP route tree (/dp/*)
├── df/                  ← Data Fiduciary portal
│   ├── pages/           ← DfDashboardPage, NoticeConfigPage, WebhookMgmt
│   ├── components/      ← DF-specific components (charts, admin tables)
│   └── routes.tsx       ← DF route tree (/df/*)
├── portal-selector/     ← Landing page: "I am a DP" / "I am a DF"
├── App.tsx              ← Thin shell: mounts DpRoutes and DfRoutes
└── main.tsx
```

**Demo mode:** Both route trees in one SPA, served from one domain.
- `/` → Portal selector
- `/dp/*` → DP pages
- `/df/*` → DF pages (role-guarded to DF_CLIENT/ADMIN)

**Migration to production (file-move operation, not a rewrite):**
1. `shared/` → `packages/shared/` (npm workspace package)
2. `dp/` → `apps/dp-portal/src/` (imports from `@concurin/shared`)
3. `df/` → `apps/df-console/src/` (imports from `@concurin/shared`)
4. Deploy `dp-portal` → `app.concurin.com`
5. Deploy `df-console` → `console.concurin.com`
6. Delete `App.tsx` shell + `portal-selector/` (only ~30 lines of throwaway)

**Throwaway code: ~30 lines** (just the router shell and portal selector).
**Everything else moves 1:1.**

### Future State: Three Frontend Products

| Product | Description | Auth Method |
|---------|-------------|-------------|
| **DP Portal** (`app.concurin.com`) | Consent management, receipts, erasure, activity log | OAuth2: DigiLocker / Aadhaar eKYC |
| **DF Console** (`console.concurin.com`) | Analytics, notice config, webhook mgmt, user admin, compliance reports | Email + password + MFA / Enterprise SSO (Okta/Azure AD) |
| **Consent Widget** (embeddable JS) | Cookie banner + preference center. DFs embed on their websites via `<script>` tag | No login — captures consent inline |

---

## 6. Infrastructure Provider Comparison

### Global Cloud Providers (with India DC)

| Provider | HQ | India Regions | Managed PG | Compute (4C/8GB) | Key Strengths |
|----------|-----|---------------|-----------|-------------------|---------------|
| **AWS** | US | Mumbai, Hyderabad | ✅ RDS | ~$80-100/mo | Richest services, SOC2/ISO certified, govt approved |
| **Azure** | US | Pune, Mumbai, Chennai | ✅ Azure DB | ~$70-90/mo | AD integration, govt MoU with India, enterprise SSO |
| **GCP** | US | Mumbai, Delhi | ✅ Cloud SQL | ~$70-90/mo | Best ML/AI tools, competitive pricing |
| **DigitalOcean** | US | Bangalore | ✅ Managed DB | ~$48/mo | Simple UI, good docs, startup-friendly |

### Indian Cloud Providers

| Provider | HQ | DC Locations | Managed PG | Compute (4C/8GB) | Key Strengths |
|----------|-----|-------------|-----------|-------------------|---------------|
| **E2E Networks** | India (BSE/NSE listed) | Noida, Mumbai | ✅ | ~₹2,500/mo (~$30) | Cheapest, Indian-owned, GPU cloud |
| **Yotta (NTT)** | India | Mumbai, Greater Noida | Via managed services | Enterprise pricing | Tier IV DC, govt & bank customers |
| **CtrlS** | India | Hyderabad, Mumbai, Noida | Colocation model | Enterprise pricing | India's largest Tier IV DC provider |
| **Jio Cloud** | India (Reliance) | Multiple India DCs | Evolving | Enterprise pricing | Indian ownership, massive scale potential |
| **Sify Technologies** | India (Chennai) | Pan-India DCs | ✅ Managed hosting | Enterprise pricing | Long track record, govt contracts |
| **Pi Datacenters** | India | Amaravati (AP) | Managed hosting | Enterprise pricing | India's first Tier IV green DC |
| **MeitY GovCloud** | India (Govt) | NIC data centers | Govt-only | N/A | Only for government projects |

### DPDP Data Residency Note

The DPDP Act §17 requires personal data to be **processed within India** unless exempted by Central Government notification. This means:

- ✅ **AWS Mumbai, Azure Pune, GCP Mumbai, DigitalOcean Bangalore, E2E Networks** — all compliant
- ⚠️ **Railway (US-West), Vercel (US)** — NOT compliant for production with real personal data
- ✅ **Indian-owned providers** (E2E, Yotta, etc.) — compliant AND a competitive differentiator for DPB registration

---

## 7. Cost Analysis

### Demo Stage (Current)

| Item | Cost/Month | Notes |
|------|-----------|-------|
| Railway (backend + PG) | $5-20 | Free tier + usage-based |
| Vercel (frontend) | $0 | Free tier |
| Domain | N/A | Using platform URLs |
| **Total** | **$5-20** (~₹400-1,600) | |

### MVP Production — Tier 1 (VPS)

| Item | Cost/Month | Notes |
|------|-----------|-------|
| E2E Networks VPS (4C/8GB) | ₹2,500 | Or DigitalOcean Bangalore $48 |
| Domain (`concurin.com`) | ₹100 | ~₹1,200/year |
| Cloudflare (DNS + CDN) | ₹0 | Free tier |
| SSL certificate | ₹0 | Let's Encrypt / Cloudflare |
| Backup storage | ₹500 | S3-compatible (E2E/Wasabi) |
| Monitoring (UptimeRobot) | ₹0 | Free tier |
| **Total** | **₹3,100** (~$37) | |

### Scale-up Production — Tier 2 (AWS)

| Item | Cost/Month | Notes |
|------|-----------|-------|
| ECS Fargate (2 tasks, 1vCPU/2GB) | ₹5,000 | Auto-scaling |
| RDS PostgreSQL (db.t3.medium, Multi-AZ) | ₹12,000 | Automated backups |
| S3 (static hosting + audit archive) | ₹500 | Pay per GB |
| CloudFront CDN | ₹1,000 | Global edge caching |
| WAF | ₹3,000 | Web Application Firewall |
| Route 53 | ₹400 | DNS hosting |
| ElastiCache Redis (optional) | ₹4,000 | Session store, caching |
| CloudWatch (logs + metrics) | ₹2,000 | Monitoring + alerting |
| ACM SSL | ₹0 | Free with AWS |
| **Total** | **₹28,000** (~$330) | |

### Enterprise Production — Tier 3

| Item | Cost/Month | Notes |
|------|-----------|-------|
| EKS cluster (3 nodes) | ₹25,000 | Kubernetes |
| RDS PostgreSQL (Multi-AZ, r6g.large) | ₹35,000 | Read replicas |
| CloudHSM | ₹12,000 | Hardware key management |
| WAF + Shield Advanced | ₹25,000 | DDoS protection |
| S3 + Glacier | ₹3,000 | Audit archive (7-year retention) |
| CloudWatch + X-Ray | ₹5,000 | Full observability |
| Secrets Manager | ₹1,000 | Secrets rotation |
| SES (email notifications) | ₹500 | Consent notifications |
| **Total** | **₹1,06,500** (~$1,260) | |

### Additional Costs (All Tiers)

| Item | Cost | Notes |
|------|------|-------|
| Domain renewal | ₹1,200/year | .com domain |
| Email (Google Workspace) | ₹200/user/month | Professional email |
| Error tracking (Sentry) | $0-26/month | Free tier → Team |
| Status page (Betteruptime) | $0-20/month | Free tier → Pro |
| CI/CD (GitHub Actions) | $0 | Free for public repos; 2000 min/month private |
| Security audits (annual) | ₹2-5 lakh/year | Third-party pen test |
| Legal/compliance consulting | ₹1-3 lakh/year | DPB registration support |

---

## 8. Migration Roadmap & Triggers

### Phase Progression

```
DEMO (Current)                    MVP PRODUCTION              SCALE-UP                    ENTERPRISE
Railway + Vercel                  Single VPS + Custom Domain  AWS Managed Services        AWS/Azure Multi-AZ
US region, no domain              India region, concurin.com  Auto-scaling, WAF, HA       HSM, DR, SLA
$5-20/month                      ₹3K/month                  ₹28K/month                  ₹1L+/month
│                                 │                          │                           │
├─ Phase 1 ✅ Security hardening  │                          │                           │
├─ Phase 2: Compliance hardening ─┤                          │                           │
├─ Phase 3: Multi-tenancy ────────┤                          │                           │
│                                 ├─ First DF customer ──────┤                           │
│                                 ├─ DPB registration ───────┤                           │
│                                 │                          ├─ 5+ DF customers ─────────┤
│                                 │                          ├─ BFSI/regulated DFs ──────┤
│                                 │                          │                           │
```

### Migration Triggers

| Trigger | Action | When |
|---------|--------|------|
| **First DF prospect demo** | Stay on demo infra, but add custom domain | Immediately useful |
| **First real DF customer** | Migrate to Tier 1 (VPS in India) | Before handling real personal data |
| **DPB registration application** | Must be on India-region hosting with security controls | Before application |
| **5+ DF customers** | Migrate to Tier 2 (AWS managed) | When manual ops become unsustainable |
| **BFSI/govt DF customers** | Migrate to Tier 3 (enterprise) | SOC2/ISO certification required |
| **>1M consent records** | Database optimization, read replicas | When query latency increases |

### What to Do NOW (Pre-Migration)

Even before migrating off Railway+Vercel:

1. **Register `concurin.com`** (or chosen domain) — ₹1,200/year, takes 5 minutes
2. **Point it at current infra** — Cloudflare CNAME to Railway/Vercel as interim
3. **Update all consent artefacts** to reference `concurin.com` URLs — this makes future migration seamless
4. **Restructure frontend** with module boundaries (§5) — zero throwaway effort

---

## 9. Regulatory & Compliance Requirements

### DPDP Act Requirements for Consent Managers

| Requirement | Section | Current Status | Production Need |
|-------------|---------|----------------|-----------------|
| **Data residency in India** | §17 | ❌ US servers | India-region hosting mandatory |
| **Registration with DPB** | §23 | ❌ Not registered | Required before commercial operation |
| **Consent artefact integrity** | §6, §7 | ✅ Hash chain | Add digital signing (PKI) |
| **Notice in prescribed format** | §5 | ✅ Multi-language | May need updates per DPB rules |
| **Grievance redressal** | §23(3) | ❌ Not implemented | Ticketing system + SLA |
| **Interoperability** | §23 (expected rules) | ❌ Proprietary API | Pending DPB standards; prepare for DEPA-style APIs |
| **Data breach notification** | §8 | ✅ SOP exists | Automated detection + 72-hour notification system |
| **Audit trail** | §8, §23 | ✅ Hash-chained audit | Add tamper-evident storage (S3 Object Lock / WORM) |
| **Right to erasure** | §12(1) | ✅ Erasure workflow | Add cascading deletion verification |

### DPB Registration Readiness

The Data Protection Board (DPB) will evaluate:

1. **Technical infrastructure** — Where data is stored, encryption, access controls
2. **Organizational measures** — DPO appointment, internal policies, training
3. **Financial viability** — Net worth requirements (TBD by DPB rules)
4. **Interoperability** — Ability to work with other CMs and DFs
5. **Grievance mechanism** — How DP complaints are handled
6. **Audit capability** — Demonstrable compliance evidence

### Compliance Certifications to Target

| Certification | When | Cost | Purpose |
|--------------|------|------|---------|
| **ISO 27001** | Pre-DPB registration | ₹3-8 lakh | Information security management |
| **SOC 2 Type II** | When targeting enterprise DFs | ₹5-15 lakh | Trust services criteria |
| **ISO 27701** | Post-DPB registration | ₹2-5 lakh | Privacy information management (DPDP-aligned) |
| **CERT-In empanelment** | If offering security services | Variable | Indian govt recognition |

---

## 10. Product Differentiation Considerations

### Competitive Landscape

| Competitor | Type | India Focus | Pricing | Key Differentiator |
|-----------|------|------------|---------|-------------------|
| **OneTrust** | Global enterprise CMP | Limited India-specific features | ₹50L+/year | Market leader, massive feature set |
| **Securiti** | Global privacy platform | India DPDPA module | ₹20L+/year | AI-powered data discovery |
| **TrustArc** | Global CMP | Limited | ₹30L+/year | Legacy player, assessment tools |
| **Consentin** | India-focused CM | ✅ DPDP-native | Unknown | Direct DPDP competitor |
| **IDfy** | India KYC + consent | ✅ Aadhaar-integrated | Per-transaction | Identity verification + consent |
| **Protean (NSDL e-Gov)** | India infra | ✅ DigiLocker integration | Govt pricing | Account Aggregator experience |
| **Concurin (us)** | India-focused CM | ✅ DPDP-native | TBD | Open-source core, DEPA-aligned |

### Potential Differentiators for Concurin

1. **Open-source core** — Transparency builds trust with DPB, DFs can audit the code
2. **DEPA-aligned architecture** — Ready for Account Aggregator-style interoperability
3. **India-first pricing** — 10-50x cheaper than OneTrust/Securiti for SME DFs
4. **Multi-language notices** — Hindi, Tamil, etc. built-in (already implemented)
5. **Aadhaar/DigiLocker integration** — Native Indian identity verification
6. **Embeddable consent widget** — DFs add consent collection with one `<script>` tag
7. **Self-hosted option** — DFs who want on-premises can deploy themselves
8. **Regulatory-ready audit trail** — Hash-chained, tamper-evident, exportable

### Pricing Strategy Options

| Model | Target | Price Range | Notes |
|-------|--------|------------|-------|
| **Freemium** | Startups, small DFs | Free (up to 1K DPs) → ₹5K/mo | Land-and-expand |
| **Per-DP pricing** | Mid-market | ₹1-5 per DP per year | Scales with usage |
| **Platform license** | Enterprise | ₹5-20L/year | Unlimited DPs, premium support |
| **Self-hosted** | Regulated/govt | One-time ₹10-50L + AMC | On-premises deployment |

---

## 11. Security Architecture for Production

### Authentication

| Component | Demo (Current) | Production Target |
|-----------|---------------|-------------------|
| DP authentication | Mock OAuth2 | DigiLocker / Aadhaar eKYC |
| DF authentication | Same OAuth2 flow | Email + password + MFA (TOTP) |
| Session management | JWT in httpOnly cookie | Same + session revocation list |
| Token storage | Cookie + (was) localStorage | Cookie only (P1-7 ✅ fixed) |
| API auth (DF→CM) | API key | OAuth2 client credentials + mTLS |

### Encryption

| Layer | Demo (Current) | Production Target |
|-------|---------------|-------------------|
| In-transit | Railway/Vercel TLS termination | End-to-end TLS, mTLS for DF APIs |
| At-rest (DB) | Railway managed encryption | RDS encryption + application-level field encryption |
| Key management | Environment variables | AWS KMS / CloudHSM |
| Audit logs | Plain text in DB | Tamper-evident (S3 Object Lock / WORM storage) |
| Consent artefacts | SHA-256 hash chain | Hash chain + PKI digital signatures |

### Network Security

| Control | Demo | Production |
|---------|------|------------|
| WAF | ❌ None | AWS WAF / Cloudflare WAF |
| DDoS protection | Rate limiting only | AWS Shield / Cloudflare |
| Network isolation | Public internet | VPC with private subnets for DB |
| IP allowlisting | ❌ None | DF API access restricted by IP |
| Intrusion detection | ❌ None | AWS GuardDuty / OSSEC |

---

## 12. Operational Readiness Checklist

### Before First DF Customer

- [ ] Custom domain registered and configured
- [ ] India-region hosting operational
- [ ] Automated database backups (daily + PITR)
- [ ] Monitoring + alerting (uptime, error rate, latency)
- [ ] Incident response plan documented
- [ ] Privacy policy and terms of service published
- [ ] DPO (Data Protection Officer) appointed
- [ ] Grievance redressal mechanism live
- [ ] Security audit completed (at least self-assessment)

### Before DPB Registration

- [ ] All above, plus:
- [ ] Data residency fully within India
- [ ] Consent artefact signing (PKI)
- [ ] Interoperability API specification published
- [ ] Financial viability documentation (as per DPB rules)
- [ ] ISO 27001 certification (or in progress)
- [ ] Multi-tenancy operational (support multiple DFs)
- [ ] Disaster recovery plan tested
- [ ] Annual compliance audit report

### Before Enterprise DF Customers

- [ ] SOC 2 Type II certification
- [ ] Multi-AZ deployment with 99.9%+ SLA
- [ ] HSM-managed encryption keys
- [ ] Dedicated support SLA (response times)
- [ ] On-premises / hybrid deployment option
- [ ] White-label consent widget
- [ ] SSO integration (SAML/OIDC)
- [ ] Custom contract and DPA support

---

## Appendix: Key Decisions Log

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Demo hosting | Railway+Vercel, Railway-only, Vercel-only | Railway+Vercel | Quick setup, free tiers, acceptable for demo |
| Production target | AWS, Azure, GCP, E2E, DigitalOcean | TBD — E2E (budget) or AWS (scale) | Depends on DF customer requirements and budget |
| DP/DF separation (demo) | Two buttons on login, module boundaries, full monorepo | Module boundaries | Zero throwaway code, clean migration path |
| DP/DF separation (prod) | Shared SPA, separate SPAs, separate SPAs + widget | Separate SPAs + embeddable widget | Industry standard, security isolation |
| Domain | concurin.com, concurin.in, concurin.io | TBD | .com for global reach, .in for India-specific positioning |
| Auth standardization | Cookie-only, Bearer-only, dual | Cookie-only (P1-7 ✅) | Secure, standard for browser apps |

---

*This document should be updated as architecture decisions are made and migration milestones are reached.*