# LeaseLedger — Demonstration Script & Video Storyboard

**Duration:** ~5–7 Minutes  
**Target Audience:** Academic Examiners, Dispute Tribunals, Tenancy Arbitrators, Software Architects  
**Roles Demonstrated:** Landlord (Asha Patel), Tenant (Ravi Kumar), System Administrator  

---

## Act 1: System Overview & Cryptographic Architecture (0:00 – 1:00)

### Speaker Narrative:
> "Welcome to LeaseLedger — the digital rental condition and handover management system engineered to establish absolute evidentiary immutability for rental properties. Traditional move-in checklists are plagued by illegible carbon copies, lost WhatsApp photo threads, and post-facto disputes.
>
> LeaseLedger replaces subjective checklists with a tamper-evident digital ledger built on four pillars:
> 1. Strict document-level immutability once locked.
> 2. Cryptographic SHA-256 photo hashing for evidentiary plates.
> 3. Dual-party digital sign-off and consensus workflows.
> 4. An automated comparison engine that eliminates human bias in security deposit adjudications."

### On-Screen Actions:
1. Open Landing Page (`/`): Highlight Editorial Architectural Ledger aesthetic (Forest Green `#183D35`, Warm Ivory `#F4FBF7`, Brass Accent `#C6A46A`).
2. Show Login Screen (`/login`) with quick demo persona buttons for Asha, Ravi, and Admin.

---

## Act 2: Landlord Portfolio & Tenancy Lifecycle (1:00 – 2:30)

### Speaker Narrative:
> "We log in as Landlord Asha Patel. From the dashboard, Asha manages her property portfolio, active tenancies, and pending inspection requests.
>
> In Property Management, Asha defines properties down to individual rooms and inventory items. Notice that inventory items are tracked with strict relational reference protection: an item currently referenced in an active inspection cannot be arbitrarily deleted from the database.
>
> Now examine Tenancy Lifecycle Hub. Asha creates a tenancy for 'Flat 12 Park Residences' and generates a cryptographically secure 32-byte single-use invitation token with a 7-day expiration window. Only the SHA-256 hash is persisted in the database."

### On-Screen Actions:
1. Log in as `asha@leaseledger.test`.
2. Navigate to `/properties` and click `Flat 12 Park Residences`.
3. View room hierarchy: Bedroom, Living Room, Kitchen, Hallway.
4. Open `/tenancies/:id` showing the 5-step lifecycle timeline (`PENDING → MOVE-IN → ACTIVE → MOVE-OUT → COMPLETED`).
5. Open Invitation Modal: Show single-use invite link generation.

---

## Act 3: Guided Inspection Walkthrough & Dual-Party Sealing (2:30 – 4:00)

### Speaker Narrative:
> "Here is the room-by-room Inspection Wizard. As an inspector walks through the unit, every rating modification is auto-saved with a 600ms debounce.
>
> If the user loses network connectivity inside a basement flat, the `useDraft` hook caches form state into local browser storage and displays an offline alert banner. When the connection resumes, queued drafts flush automatically.
>
> Every photo uploaded is immediately hashed using SHA-256. This cryptographic fingerprint is permanently sealed into the inspection document and cannot be modified post-upload.
>
> Once both parties complete the checklist and utility meter readings, both Asha and Ravi digitally sign off. The second confirmation atomically transitions the inspection status from `DRAFT` to `LOCKED`. Any subsequent HTTP PATCH, PUT, or DELETE request triggers an immutability guard returning HTTP 409 `INSPECTION_LOCKED`."

### On-Screen Actions:
1. Navigate to `/tenancies/:id/inspections/MOVE_IN`.
2. Demonstrate 5-point rating selector (1: Very Poor to 5: Excellent).
3. Show photo evidence plate with SHA-256 hash pill.
4. Enter utility meters (Electricity, Gas, Water).
5. Switch to Review page (`/tenancies/:id/inspections/MOVE_IN/review`).
6. Point to Dual Mutual Sign-off status badges and Cryptographic Lock Seal.
7. Attempt an edit to demonstrate HTTP 409 protection; show append-only amendment modal.

---

## Act 4: Mid-Tenancy Issues & In-App Notification Center (4:00 – 4:45)

### Speaker Narrative:
> "During the tenancy, maintenance incidents can be reported in real time via the Mid-Tenancy Issues Log. In this tenancy, Ravi reported a kitchen tap drip. Asha dispatched a plumber, and the issue was resolved.
>
> Crucially, mid-tenancy incident records are not lost — they are preserved in the ledger and automatically appended to the final Move-Out comparison report."

### On-Screen Actions:
1. Navigate to `/tenancies/:id/issues`.
2. Inspect resolved issue: "Kitchen tap washer repaired".
3. Click Notification Bell in navigation bar: View unread counter badge and notification drawer.

---

## Act 5: Automated Comparison Engine & Certified PDF Dossier (4:45 – 6:15)

### Speaker Narrative:
> "At Move-Out, both parties complete the Move-Out inspection and seal it. Asha triggers the automated Comparison Engine.
>
> Let's analyze the exact output:
> - Bedroom Wall was rated 3 at Move-In and 3 at Move-Out: The system classifies it as `UNCHANGED` and flags the `PRE-EXISTING WEAR` notice, protecting the tenant from unfair liability.
> - Living Room Sofa was rated 5 at Move-In and 5 at Move-Out: Classed as `UNCHANGED`.
> - Dining Table dropped from 4 to 2: Classed as `CHANGED – DETERIORATED (-2)`.
> - Kitchen Tap improved from 2 to 4 due to the mid-tenancy repair: Classed as `IMPROVED (+2)`.
> - Electricity meter jumped from 12,450 to 15,820 kWh: Accurately calculating 3,370 kWh net consumption.
>
> Asha clicks 'View Certified PDF Report'. Server-side PDFKit streams an official ISO-216 RTBA-compliant A4 handover dossier with header strip, executive summary, itemized condition matrix, meter deltas, photographic plates, and dual cryptographic seals.
>
> Asha generates a 30-day shareable token, allowing third-party dispute arbitrators or deposit authorities to review the dossier without requiring a login."

### On-Screen Actions:
1. Navigate to `/tenancies/:id/comparison`.
2. Point out metric cards: Total 6, Unchanged 4, Deteriorated 1, Improved 1.
3. Highlight Bedroom Wall `PRE-EXISTING WEAR` banner.
4. Show side-by-side evidence photos.
5. Click 'View Certified PDF Report' (`/tenancies/:id/report`).
6. Download the A4 PDF file.
7. Open Public Share link (`/shared/reports/:token`) in an incognito window showing unauthenticated external access.

---

## Act 6: System Administration & Governance Console (6:15 – 7:00)

### Speaker Narrative:
> "Finally, we log in as the System Administrator. The Administrator Console provides platform-wide telemetry, user account enforcement (suspend / reinstate), configuration of condition scales, and an append-only evidentiary audit log.
>
> In accordance with strict impartiality protocols, administrators cannot alter inspection records, ensuring the integrity of the ledger remains untouchable."

### On-Screen Actions:
1. Log in as `admin@leaseledger.test`.
2. Navigate to `/admin`.
3. Review global stats and metrics.
4. Demonstrate user directory search and filter.
5. Inspect global condition scale editor (`/admin/config`).
6. Review append-only audit trail (`/admin/audit`).

---

## Summary of Key Verification Commands:
- `npm run seed`: Generates complete demo scenarios.
- `npm test`: Runs full test suite (33 passing unit/integration tests with >74% coverage).
- `node e2e/capture/capture.js`: Captures all 28 high-resolution screenshots.
- `npm run dev`: Boots server and client concurrently.
