# LGU Synchronization Protocol

**LGU Name:** Province of Albay, Bicol Region
**Last Sync Date:** 2026-02-03

## Roles & Responsibilities

### 1. Developer Team (Code Maintainers)

- **Lead Maintainer:** Jayson (jsonrls) (ramonloganjr) - Responsible for merge requests and deployment.
- **Frontend Dev:** [Name] - Responsible for UI/UX and Accessibility updates.

### 2. Data Custodians (Source of Truth)

- **Designation:** Municipal Planning & Development Coordinator (MPDC)
- **Responsibility:** Provides the raw CSV/Excel files for the Citizen's Charter and Annual Budget.
- **Contact Protocol:** Email submission by the 5th of every month.

### 3. Content Approvers (Gatekeepers)

- **Designation:** Information Officer / Mayor's Chief of Staff
- **Responsibility:** Verifies that the data on the staging site matches the official hard copies before production deployment.

---

## Emergency Information Verification

The authoritative supplied directory is `data/emergency_hotlines.json`. Its `updated_as_of` field records the source date; it is not a claim that numbers were verified during the latest build.

Update agency records, numbers, source date, and notes in that JSON. Run `python3 scripts/sync-verified-content.py` or the production build to regenerate legacy bars, the full contact directory, offline critical contacts, and the React hotline bar. Do not edit generated numbers separately. Keep legitimate duplicate listings and source phone formatting; the generator sanitizes call links.

Current critical actions are national emergency **911**, **APSEMO**, and **Albay EMS**, with local numbers read from the JSON. Review changed records against the responsible office before publishing.

---

## Data Sync Schedule

### Officials Directory

- **Source:** LGU Albay Human Resources / Election results
- **Frequency:** After every election cycle, or when appointments change
- **File to update:** `data/officials.json`
- **Approver:** Information Officer

### Service Directory (Citizen's Charter)

- **Source:** Citizen's Charter document from each department head
- **Frequency:** Annually, or when fees/requirements change
- **File to update:** `data/services.json`
- **Approver:** MPDC

### Legislative Data (Ordinances & Resolutions)

- **Source:** Sangguniang Bayan records
- **Frequency:** After each Sangguniang Bayan session
- **Files to update:** `data/ordinances.json`, `data/resolutions.json`
- **Approver:** SB Secretary

### Competitive Index

- **Source:** CMCI DTI Portal (cmci.dti.gov.ph)
- **Frequency:** Annually (after CMCI release, typically Q2)
- **File to update:** `data/cmci_2024.json`
- **Approver:** Lead Maintainer

### DPWH Infrastructure Projects

- **Source:** DPWH Regional Office / data.gov.ph
- **Frequency:** Quarterly or after new project listings
- **File to update:** `data/dpwh-projects.json`
- **Approver:** Lead Maintainer

### Budget & Fiscal Transparency

- **Source:** BLGF portal (blgf.gov.ph), LGU Budget Officer
- **Frequency:** Annually (after budget approval) + quarterly updates
- **Files to update:** Budget section pages, `data/fiscal_transparency.json`
- **Approver:** Municipal Accountant / Budget Officer

### Demographics

- **Source:** Philippine Statistics Authority (PSA)
- **Frequency:** After census releases or official population updates
- **File to update:** `data/demographics.json`
- **Approver:** MPDC

---

## Pre-Deployment Sign-Off Checklist

- [ ] All emergency hotline numbers verified against official records
- [ ] Officials directory matches current elected/appointed officials
- [ ] Service fees and processing times verified with department heads
- [ ] Legislative data reflects latest SB sessions
- [ ] Budget/fiscal data matches official documents
- [ ] Lighthouse accessibility audit score >= 90
- [ ] Content reviewed by Information Officer
- [ ] Staging site approved by Content Approver

---

## Change Management Log

| Date       | Change                       | Verified By      |
| ---------- | ---------------------------- | ---------------- |
| 2026-02-03 | Initial TEAM_SYNC.md created | Jayson (jsonrls) |
