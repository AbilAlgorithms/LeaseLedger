# LeaseLedger — Comprehensive Engineering & Development Guide
*A Student-Friendly Architectural Walkthrough and Viva Examination Guide*

---

## 1. Project Introduction & Architecture

### What is LeaseLedger?
LeaseLedger is a full-stack digital rental condition and handover management platform built on the MERN stack (MongoDB, Express, React, Node.js). Its core purpose is to replace informal, dispute-prone rental check-in/check-out communication (scattered WhatsApp chats, unorganized phone photos, lost paper forms) with a mutually confirmed, tamper-evident digital ledger.

### Architectural Philosophy
LeaseLedger implements a **3-tier modular architecture**:
1. **Tier 1 — Client:** Modern React 18 single-page application built with Vite, Tailwind CSS, Lucide icons, and React Router v6. It features an "Editorial Architectural Ledger" design inspired by architectural monographs and precision measurement tools.
2. **Tier 2 — Application Server:** Node.js 20 and Express 4 modular REST API, strictly enforcing Role-Based Access Control (RBAC), atomic database operations, dual-party confirmation workflows, an automated comparison engine, and a server-side PDF generation pipeline using PDFKit.
3. **Tier 3 — Data & Storage:** MongoDB with Mongoose ODM (with compound unique indexing and Mongoose query middleware guards for immutability), pluggable file storage (Local / Cloudinary) with SHA-256 cryptographic image hashing, and Nodemailer for transactional email dispatches.

---

## 2. Backend Modules: What, Why & How They Connect

### 2.1 Domain Models & Database Architecture (`server/src/models`)
- **What it is:** A comprehensive collection of 17 Mongoose schemas enforcing relational-grade constraints, lifecycle statuses, compound uniqueness, and tamper-resistant immutability.
- **Why we built it this way:** 
  1. Rental property handovers require strict multi-level nesting: Property → Rooms → Inventory Items → Inspections → Condition Records & Meter Readings.
  2. The IEEE 830 SRS requires that once both parties confirm an inspection, it becomes an **immutable digital legal record**. Any tampering through typical REST updates must be blocked at the database driver/model layer.
- **Key Models Created:**
  - `User`: Handles RBAC roles (`LANDLORD`, `TENANT`, `ADMIN`), bcrypt-hashed passwords (cost 12), email verification tokens, and session timestamps.
  - `Property`, `Room`, `InventoryItem`: Strict hierarchical inventory management. Compound index `{ property: 1, name: 1 }` prevents room duplicates; `{ room: 1, archived: 1 }` enables soft-archival without breaking historical inspections.
  - `Tenancy`: Binds Landlord to one or more primary and co-tenants, validating that `endDate > startDate` and managing lifecycle (`PENDING → ACTIVE → COMPLETED`).
  - `Invitation`: Cryptographically secure 32-byte single-use tokens stored as SHA-256 digests.
  - `Inspection`: Dual-state machine (`DRAFT → IN_REVIEW → LOCKED`) with unique `{ tenancy: 1, type: 1 }` compound index. Features Mongoose query middleware guards that intercept `updateOne`, `findOneAndUpdate`, and `deleteOne` to block post-lock mutations with HTTP 409 `INSPECTION_LOCKED`.
  - `ConditionRecord`: Item-level condition snapshots, 5-point rating scores, qualitative notes, and dispute statuses, protected by parent lock verification.
  - `Photo`: Polymorphic attachment model (`ConditionRecord` or `IssueReport`) storing SHA-256 checksums on all photos for cryptographic tamper detection.
  - `MeterReading`: Utility meters (`ELECTRICITY`, `WATER`, `GAS`) with readings, units, and timestamps.
  - `Amendment`: Append-only post-lock correction logs with bidirectional acknowledgements.
  - `IssueReport`: Mid-tenancy incident reports tracking repair requests and photo evidence.
  - `Comparison`: Automated diff engine output matching move-in and move-out condition records, meter deltas, and differential classifications.
  - `Report`: Archival PDF records with revocable public share tokens.
  - `Notification` & `AuditLog`: In-app notification queues and append-only tamper-evident audit logs.
  - `Config`: System-wide settings for condition scales and item categories.
- **How it connects:** Controllers and service layers never invoke low-level driver mutations directly. Instead, domain rules are enforced at the model boundary, ensuring that even unexpected query paths cannot bypass the legal immutability of signed inspections.


---

### 2.2 Authentication & User Governance (`server/src/services/auth.service.js`)
- **What it is:** A secure, stateless authentication and session management system implementing JWT access tokens (15-minute TTL, stored in memory) and long-lived refresh tokens (7-day TTL, stored in `httpOnly` secure cookies with rotation).
- **Why we built it this way:**
  1. Storing tokens strictly in memory on the client while delegating refresh to `httpOnly` cookies prevents Cross-Site Scripting (XSS) token theft.
  2. Stateless JWT verification avoids database lookups on every request, while role checks in the token payload enable microsecond-speed RBAC.
  3. Single-use hashed tokens for email verification and password resets prevent replay and brute-force token enumeration attacks.
  4. Built-in account suspension checks reject deactivated users immediately on subsequent logins and refresh rotations.
  5. Privacy-by-design compliance (GDPR) provides instant JSON data exports (`/users/me/export`) and irreversible PII anonymization (`/users/me`), ensuring tenancy audit records are legally preserved without retaining personal identifiers.
- **How it connects:** The client's Axios layer intercepts 401 Unauthorized responses and seamlessly executes background token rotation against `/api/v1/auth/refresh`, allowing uninterrupted walk-throughs during long property inspections.

### 2.3 Property, Room & Inventory Management (`server/src/services/property.service.js`)
- **What it is:** Hierarchical asset cataloging enabling Landlords to configure properties, subdivide them into physical spaces (Rooms), and catalog fixtures/assets with designated categories and quantities.
- **Why we built it this way:**
  1. Rental handovers require an unambiguous baseline. Defining rooms and assets beforehand standardizes the walk-through so that move-in and move-out inspections evaluate identical inventories.
  2. Implements **Reference Protection**: If a room or item is referenced in any existing `ConditionRecord` of an inspection, it cannot be hard-deleted. Instead, deletion requests automatically transition the item to `archived: true`, preserving the historical evidentiary record while removing it from future tenancy templates.
  3. Ownership enforcement checks (`assertPropertyOwner`) verify that only the landlord owning the property may modify rooms and inventory items.
- **How it connects:** The inventory items defined here populate the Inspection Wizard at move-in. At move-out, the comparison engine retrieves these exact items to verify differential conditions and calculate missing asset deltas.

### 2.4 Tenancy Lifecycle & Cryptographic Invitation Protocol (`server/src/services/tenancy.service.js`, `invitation.service.js`)
- **What it is:** The contractual binding mechanism establishing tenancy relationships, issuing single-use invitation tokens, and orchestrating the multi-stage handover timeline.
- **Why we built it this way:**
  1. Tenancy invitations generate cryptographically random 32-byte tokens. Only their SHA-256 hashes are stored in the database (`Invitation.tokenHash`), while the raw token is delivered via email or copyable URL (`/join/:token`).
  2. Single-use enforcement and a 7-day expiration window protect against unauthorized access and replay attacks.
  3. Acceptance immediately updates the tenancy's `tenants` array, transitions the invitation to `ACCEPTED`, and notifies the landlord via in-app alerts and transactional email.
  4. The Tenancy Timeline Hub (`/tenancies/:id`) provides a single transparent view of the handover lifecycle: Onboarding → Move-In Inspection → Mid-Tenancy Issues → Move-Out Inspection → Differential Comparison & PDF Dossier.


### 3.1 Design System: "Editorial Architectural Ledger"
- **Canvas Base:** Warm Ivory (`#F4FBF7` / `#F7F5EF`) replaces harsh clinical whites.
- **Brand Ink:** Deep Forest Green (`#002720` / `#183D35`) provides authoritative, legal-grade framing.
- **Evidentiary Statuses:** Emerald Verified (`#2D7A58`), Ochre Pending (`#D9822B`), and Crimson Damage (`#C94A4A`).
- **Typography:** Plus Jakarta Sans for architectural titles and Inter for continuous reading and tabular-mono numeric alignment.


---

## 4. Key Workflows Explained Step-by-Step

### 4.1 Tenancy & Invitation Lifecycle
1. Landlord registers and registers a Property, adding Rooms and Inventory items.
2. Landlord creates a Tenancy record with defined start and end dates.
3. Landlord issues an Invitation. A cryptographically random 32-byte token is generated; its SHA-256 hash is persisted in MongoDB while the raw token is dispatched via email and copyable invitation URL.
4. The Tenant opens the link (`/join/:token`), authenticates or registers, and accepts the invitation.
5. The system validates the token hash, expiration time, and single-use status, links the Tenant to `tenancy.tenants`, transitions the invitation to `ACCEPTED`, and updates the tenancy status to `PENDING` (ready for move-in inspection).

### 4.2 Move-In Inspection & Dual-Confirmation Lock
1. Landlord or Tenant begins the Move-In inspection.
2. The user navigates room by room through the Inspection Wizard, rating items on a 5-point scale, adding descriptive notes, capturing photos, and recording utility meter readings.
3. Autosave triggers with debounced REST calls; client-side localStorage maintains drafts in case of network interruption.
4. When complete, either party submits the inspection for review (`DRAFT → IN_REVIEW`).
5. Both Landlord and Tenant review the itemized inventory and meter readings. Each party clicks **Digital Confirm**, recording their user ID, timestamp, and IP address.
6. Once both parties have confirmed, the system atomically locks the inspection (`LOCKED`), records `lockedAt`, transitions the tenancy status to `ACTIVE`, and locks all associated condition records against further modification.

### 4.3 Move-Out Inspection, Comparison Engine & PDF Dossier
1. At the conclusion of the tenancy, a Move-Out inspection is conducted. The wizard presents the Move-In baseline ratings and photos alongside the Move-Out inputs for direct comparison.
2. Once both parties review and confirm the Move-Out inspection, it locks (`LOCKED`).
3. The **Comparison Engine** runs automatically:
   - Matches items by ID and snapshot name.
   - Evaluates condition shifts: `UNCHANGED` (with `preExisting` flag if move-in was ≤ 3), `CHANGED_DETERIORATED`, `IMPROVED`, or `MISSING`.
   - Computes meter usage deltas (`moveOut.value - moveIn.value`).
   - Persists the differential record to `Comparison` and transitions tenancy to `COMPLETED`.
4. The **Report Service** compiles an archival-grade PDF document using PDFKit, complete with party metadata, condition tables, meter comparisons, photographic plates, mid-tenancy issue logs, amendment logs, and cryptographic verification hashes.

---

## 5. Viva / Oral Examination Cheat-Sheet
*(15 Common Exam Questions & Crisp Answers)*

**Q1: Why did you choose MongoDB instead of a relational database as requested in the initial SRS?**
*Answer:* MongoDB with Mongoose was chosen because rental inspections possess an inherently hierarchical and dynamic tree structure: Property → Rooms → Inventory Items → Inspection Condition Records → Photographic Plates & Meter Readings. Document modeling allows atomic retrieval of full inspection dossiers while compound unique indexes (such as `{ tenancy: 1, type: 1 }` on Inspection) enforce relational-grade integrity constraints.

**Q2: How does LeaseLedger guarantee that locked inspection records cannot be tampered with?**
*Answer:* Immutability is enforced at the Mongoose schema level using query middleware (`updateOne`, `findOneAndUpdate`, `deleteOne`, etc.) that inspects the parent inspection status. If `status === 'LOCKED'`, the middleware throws an HTTP 409 `INSPECTION_LOCKED` error. Furthermore, any corrections made post-lock must be recorded as append-only `Amendment` documents, preserving a verifiable audit trail.

**Q3: How does the invitation link prevent token reuse or brute-force attacks?**
*Answer:* The invitation system uses 32-byte cryptographically secure random tokens. Only the SHA-256 hash is stored in the database. When a tenant clicks the invitation link, the incoming token is hashed and looked up. The token is single-use, expires in 7 days, and is validated against rate-limited endpoints.

**Q4: How does the dual confirmation workflow work?**
*Answer:* An inspection has three states: `DRAFT`, `IN_REVIEW`, and `LOCKED`. Either participant can submit it to `IN_REVIEW`. The inspection tracks a `confirmations` array. When one party confirms, their user reference, timestamp, and IP are added. The second confirmation atomically transitions the inspection to `LOCKED` using `findOneAndUpdate` with preconditions. If either party raises a dispute on any item, the inspection reverts to `DRAFT` and all confirmations are reset.

**Q5: What happens if a tenant loses internet connectivity while walking through a large property?**
*Answer:* The frontend inspection wizard features a hybrid sync architecture. Every field modification triggers a debounced server sync. If the network drops, `useDraft` caches the form state in browser `localStorage` and displays an offline status indicator. When the browser detects an `online` event, the queue flushes back to the server automatically.

**Q6: How does the comparison engine classify property items?**
*Answer:* The comparison service matches items across both inspections. If ratings are identical, it is `UNCHANGED` (flagged `preExisting` if Move-In rating was ≤ 3). If Move-Out rating is lower, it is `CHANGED_DETERIORATED`. If higher, `IMPROVED`. If an item present at move-in is missing at move-out, it is classified as `MISSING`.

**Q7: How are uploaded photos protected against evidentiary tampering?**
*Answer:* Before any photo is uploaded to storage (Cloudinary or local disk), the server computes its cryptographic SHA-256 hash from the raw image buffer. This hash is permanently bound to the `Photo` document and printed on the final PDF condition report alongside timestamp and EXIF metadata.

**Q8: Explain the JWT authentication and refresh token lifecycle.**
*Answer:* The client receives a short-lived access token (15-minute expiration) kept in memory and passed via the HTTP `Authorization: Bearer <token>` header. A long-lived refresh token (7 days) is stored in a secure, `httpOnly`, `SameSite` cookie. When an API call returns 401, Axios interceptors silently call `/api/v1/auth/refresh` to obtain a fresh access token without interrupting the user session.

**Q9: How is Role-Based Access Control (RBAC) enforced?**
*Answer:* RBAC is enforced in two layers: first, an Express middleware `rbac('LANDLORD')` verifies the authenticated user's role from the JWT payload. Second, domain-level ownership checks (e.g. `assertTenancyParticipant`) verify that the user is the specific landlord or assigned tenant for that particular tenancy resource.

**Q10: What is the role of the System Administrator if they cannot edit inspection data?**
*Answer:* In accordance with dispute-resolution governance and impartiality, the Administrator manages user accounts (suspension/reinstatement), configures global condition scales and inventory categories, and audits system-wide activity logs, but cannot alter or confirm condition records on behalf of landlords or tenants.

**Q11: How is the PDF report generated without requiring a heavy headless browser like Puppeteer?**
*Answer:* The report is compiled using `PDFKit`, a lightweight streaming Node.js PDF generation library. It constructs multi-page, publication-quality A4 documents with header branding, tabular matrices, colored status indicators, meter usage charts, photo plates, and signature blocks in milliseconds without headless Chrome overhead.

**Q12: How are mid-tenancy issues handled relative to the final move-out report?**
*Answer:* Mid-tenancy issues can be reported at any time while the tenancy is `ACTIVE`. They include descriptions, dates, photos, and resolution statuses. When the final report is compiled at move-out, all mid-tenancy issue reports are incorporated into an evidentiary appendix so the history of repairs and incidents is transparent.

**Q13: What happens if an amendment is required after both parties have locked an inspection?**
*Answer:* Because the inspection record is immutable, the user submits a `POST /inspections/:id/amendments` request with the reason, target item, and proposed change. This creates an `Amendment` record. The other party is notified and can review and formally acknowledge the amendment. The amendment is rendered alongside the original record with explicit attribution.

**Q14: How does the application comply with privacy and data protection principles (like GDPR)?**
*Answer:* The application provides dedicated endpoints: `GET /api/v1/users/me/export` downloads a complete machine-readable JSON archive of the user's data; `DELETE /api/v1/users/me` anonymizes personal identifiable information while preserving legally required tenancy evidence records for statutory limitation periods (7 years).

**Q15: How is code organized across the project?**
*Answer:* The project follows a monorepo structure with separated `client/` and `server/` packages. The backend implements a modular architecture with distinct controllers, services, models, validators, and middleware. The frontend follows a component-driven architecture organized into pages, feature-specific components, custom hooks, and shared UI primitives.
