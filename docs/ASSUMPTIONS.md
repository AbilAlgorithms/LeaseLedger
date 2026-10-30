# LeaseLedger — Architecture & Engineering Assumptions

This document records architectural, data model, and operational assumptions made during the implementation of LeaseLedger v1.0, reconciling requirements from the SRS, DFDs, UML diagrams, and technical specification.

---

## 1. Database & Persistence Layer
- **NoSQL vs. Relational:** The SRS initially mentions relational DBMS; MongoDB with Mongoose was chosen for v1.0 to handle deeply nested and evolving inspection data structures (rooms, condition items, photographic plates, meter readings, dual confirmations) while retaining relational-style references (`ObjectId`) and index-level relational constraints.
- **Development Database Fallback:** For local testing and developer environments where a standalone MongoDB service is not running on `localhost:27017`, `server/src/config/db.js` automatically starts an embedded `mongodb-memory-server` instance. In production, it connects directly to MongoDB Atlas via `MONGODB_URI`.
- **Integrity & Compound Keys:** Unique compound indexes enforce data consistency:
  - `{ tenancy: 1, type: 1 }` on `Inspection` ensures exactly one `MOVE_IN` and one `MOVE_OUT` inspection per tenancy.
  - `{ inspection: 1, item: 1 }` on `ConditionRecord` guarantees one condition record per item per inspection.
  - `{ inspection: 1, meterType: 1 }` on `MeterReading` guarantees one reading per utility type.
  - `{ property: 1, name: 1 }` on `Room` prevents duplicate room names in a property.
  - `{ tokenHash: 1 }` on `Invitation` guarantees unique, secure invite tokens.

## 2. Domain & Schema Reconciliation
- **Tenancy Parties:** The class diagram represents `User` ↔ `Tenancy` as many-to-many. This is implemented with an explicit `landlord` reference (`User`) and a `tenants` array (`[User]`), supporting single landlords with primary tenants and co-tenants.
- **Role Naming:** Corrected the typo in early diagram drafts (`TENNANT`) to standard `TENANT`. The three system roles are `LANDLORD`, `TENANT`, and `ADMIN`.
- **Mid-Tenancy Issues & Post-Lock Amendments:** Not present in the minimal class diagram but required by SRS Sections 5.5 and 12.5. Dedicated `IssueReport` and `Amendment` collections are created.
- **Append-Only Auditing & Immutability:** 
  - `Inspection` transitions are strictly governed: `DRAFT → IN_REVIEW → LOCKED`.
  - When `LOCKED`, all updates and deletions on `Inspection`, `ConditionRecord`, and `MeterReading` are blocked at the Mongoose pre-hook level (HTTP 409 `INSPECTION_LOCKED`).
  - Corrections post-lock must be recorded as timestamped `Amendment` documents.
  - `AuditLog` has no update or delete code paths, preserving a tamper-evident audit trail.

## 3. Storage & Evidence Security
- **Storage Drivers:** A unified `storage.service.js` abstraction supports both `local` (disk storage with static serving under `/uploads` for development/testing) and `cloudinary` (for production cloud deployments).
- **Tamper Evidence:** For every uploaded photo, a SHA-256 cryptographic digest is computed on the raw file buffer and stored alongside the photo URL, ensuring verifiable evidentiary integrity.

## 4. Notifications & Communication
- **Dual-Channel Delivery:** The system dispatches in-app notifications (stored in MongoDB with unread tracking) and transactional emails via Nodemailer. In development, if SMTP credentials are not provided, an Ethereal test account or console logging is utilized without blocking the request pipeline.

## 5. Comparison Engine & Worked Example
- **Algorithm Rules:** The comparison engine compares move-out condition against move-in condition:
  - `moveOutRating === moveInRating`: Classified as `UNCHANGED`. If move-in rating was ≤ 3 (Fair/Poor/Damaged) or notes recorded defects, it is flagged as `preExisting: true`.
  - `moveOutRating < moveInRating`: Classified as `CHANGED_DETERIORATED`.
  - `moveOutRating > moveInRating`: Classified as `IMPROVED`.
  - Missing move-out record or reduced quantity: Classified as `MISSING`.
  - Utility meter usage: `delta = moveOut.value - moveIn.value`. Anomaly flag raised if negative.
- **SRS Example Verification:** The seed data and automated tests replicate the Asha/Ravi/flat12 scenario and SRS worked example (Bedroom Wall, Sofa, Dining Table, Electricity Meter, Kitchen Tap) down to the exact unit deltas and condition classifications.

## 6. Design System & User Experience
- **Editorial Architectural Ledger Theme:** Inspired by judicial impartiality, architectural monographs, and precision toolkits. Features deep forest green (`#002720` / `#183D35`), warm ivory canvas (`#F4FBF7`), hairline structural borders (`rgba(36, 43, 41, 0.08)`), dual-party verification tandem pills (`LL` / `TN`), and Plus Jakarta Sans / Inter typography with tabular monospaced numbers.
