# AI Prompt Governance Guidelines
---
Artefact-ID: CMP-EL-AI-PROMPT-GOVERNANCE
Title: AI Prompt Governance Guidelines
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: artefacts repo-specific guardrails; AI_AGENT.md and DPDP evidence-first discipline from regulatory_competitive_context_inputs/dpdp_summary.md
Traceability: [DPDP-S8-Rule-1]
Linked-Artefacts: AI_AGENT.md; artefacts/00_HEADER_TEMPLATE.md; artefacts/01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md
Review-Cadence: Quarterly
Owner: TBD
---

## Cross-Links
- Header standard for artefacts: → Ref: 00_HEADER_TEMPLATE.md
- Evidence model: → Ref: 02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md

## Purpose
Provide governance rules for using AI tools (Copilot/LLMs) in this repository, consistent with producing DPDP-aligned artefacts and avoiding ungrounded claims.

## Allowed Inputs for AI Outputs (Policy)
AI-generated artefacts must be derived from:
- Source code in this repo
- DB schema snapshots under `backend/db/`
- Explicit regulatory/context documents under `regulatory_competitive_context_inputs/`

AI must not invent:
- New endpoints, tables, or data flows
- Certifications or compliance guarantees
- Vendor feature claims beyond the provided matrix

## Output Quality Rules
- Clearly label sections as **Implemented** vs **Not Implemented** when bridging regulatory requirements.
- Tie assertions to concrete anchors (route name, repository function, DB table/column).
- Prefer testable contracts (inputs/outputs, invariants) over narrative.

## Security & Privacy Rules
- Do not include real personal data in examples.
- Use synthetic identifiers (e.g., `user_123`).
- Avoid generating destructive SQL unless explicitly requested and approved.

## Change Control Rules
- For code changes: avoid modifying business logic unless explicitly requested.
- For schema: avoid altering existing tables without a migration plan and explicit approval.

## Source Anchors
- Repo policy docs: `AI_AGENT.md` (if present)
- Context inputs: `regulatory_competitive_context_inputs/competitor_feature_matrix.md` (pattern guidance)
