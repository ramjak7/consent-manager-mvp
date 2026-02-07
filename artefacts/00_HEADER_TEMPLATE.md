# Standard Artefact Header Block (Template)

Use this metadata block immediately after the H1 title in every artefact.

```markdown
---
Artefact-ID: <ID>
Title: <Human title>
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: <optional path or null>
Authoritative: true
Change-Control: ADR-0000
Source-Basis: <code/DB/regulatory inputs>
Traceability: <space-separated DPDP tags like [DPDP-S6-Rule-4]>
Linked-Artefacts: <semicolon-separated artefact paths>
Review-Cadence: <e.g., Quarterly / Semiannual / Annual>
Owner: <TBD>
---
```

## Required Body Sections (Minimum)
- `## Purpose`
- `## Cross-Links`
  - Consent artefact schema references: `→ Ref: consent_artefact_schema.json field:<name>`
  - API semantic contract references (endpoint + expectation)
  - State machine → audit → SOP linkage (where applicable)