# LeaseLedger REST API Specification v1.0.0

Base URL: `http://localhost:5000/api/v1`  
Protocol: `HTTPS` (Production) / `HTTP` (Development)  
Authentication: `Authorization: Bearer <accessToken>` (15-min JWT)  
Refresh Token: `httpOnly` secure cookie at `/api/v1/auth/refresh` (7-day rotation)

---

## Standard Response Envelopes

### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional operational summary"
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "INSPECTION_LOCKED",
    "message": "Inspection is locked and immutable. Add an amendment instead.",
    "details": null
  }
}
```

---

## 1. Authentication & Identity (`/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register Landlord or Tenant (`name`, `email`, `password`, `role`) |
| `POST` | `/auth/login` | Public | Authenticate; returns accessToken + sets refresh cookie |
| `POST` | `/auth/refresh` | Public (Cookie) | Rotate refresh token and issue fresh 15-minute accessToken |
| `POST` | `/auth/logout` | Authenticated | Invalidate refresh cookie and terminate session |
| `GET` | `/auth/verify-email/:token` | Public | Verify email address from activation link |
| `POST` | `/auth/forgot-password` | Public | Dispatch password reset token to user email |
| `POST` | `/auth/reset-password/:token`| Public | Reset account password using verified token |

---

## 2. User Profile & Compliance (`/users`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/me` | Authenticated | Retrieve profile details of currently authenticated actor |
| `PATCH` | `/users/me` | Authenticated | Update user name or telephone number |
| `GET` | `/users/me/export` | Authenticated | GDPR Art. 20 machine-readable JSON data archive |
| `DELETE` | `/users/me` | Authenticated | GDPR Art. 17 data erasure & anonymization (7-year legal preservation) |

---

## 3. Property & Inventory Portfolio (`/properties`, `/rooms`, `/items`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/properties` | Landlord | Create property (`name`, `address`, `type`, `metadata`) |
| `GET` | `/properties` | Authenticated | List portfolio properties owned by or associated with user |
| `GET` | `/properties/:id` | Authenticated | Retrieve property with nested rooms, items, and active tenancies |
| `PATCH` | `/properties/:id` | Landlord | Update property address or metadata |
| `DELETE` | `/properties/:id` | Landlord | Archive / delete property (blocked if active tenancies exist) |
| `POST` | `/properties/:id/rooms` | Landlord | Add a room (`name`, `floor`, `description`) |
| `PATCH` | `/rooms/:id` | Landlord | Update room attributes |
| `DELETE` | `/rooms/:id` | Landlord | Remove room (orphans or moves items) |
| `POST` | `/rooms/:id/items` | Landlord | Catalog inventory item (`name`, `category`, `description`) |
| `PATCH` | `/items/:id` | Landlord | Update inventory item details |
| `DELETE` | `/items/:id` | Landlord | Relational protection: archived if referenced in inspections |

---

## 4. Tenancy Lifecycle & Invitations (`/tenancies`, `/invitations`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/tenancies` | Landlord | Initialize tenancy (`propertyId`, `startDate`, `endDate`, `rent`) |
| `GET` | `/tenancies` | Authenticated | List tenancies associated with user |
| `GET` | `/tenancies/:id` | Participant | Retrieve tenancy hub, timeline stage, participants, inspections |
| `PATCH` | `/tenancies/:id` | Landlord | Update tenancy dates or notes |
| `POST` | `/tenancies/:id/invitations` | Landlord | Generate 32-byte single-use tenant invitation token (7-day TTL) |
| `POST` | `/tenancies/:id/invitations/:invId/revoke` | Landlord | Revoke pending invitation token |
| `GET` | `/invitations/:token` | Public | Validate invitation token and retrieve property snapshot |
| `POST` | `/invitations/:token/accept` | Authenticated | Tenant accepts invitation and atomically joins tenancy |

---

## 5. Inspection Walkthrough & Dual Sealing (`/inspections`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/tenancies/:id/inspections` | Participant | Get or create Move-In / Move-Out inspection (`DRAFT`) |
| `GET` | `/inspections/:id` | Participant | Fetch full inspection record with items, meters, confirmations |
| `POST` | `/inspections/:id/records` | Participant | Auto-save room condition record (`rating`, `notes`, `photos`) |
| `POST` | `/inspections/:id/photos` | Participant | Upload evidence photo; server computes SHA-256 fingerprint |
| `DELETE` | `/inspections/:id/photos/:photoId` | Participant | Remove photo (prohibited once inspection is `LOCKED`) |
| `POST` | `/inspections/:id/meters` | Participant | Record utility meter reading (Electricity, Gas, Water) |
| `POST` | `/inspections/:id/submit` | Participant | Submit inspection for review (`status = IN_REVIEW`) |
| `POST` | `/inspections/:id/confirm` | Participant | Dual sign-off; second signature atomically locks inspection |
| `POST` | `/inspections/:id/dispute` | Participant | Raise dispute on condition record; reverts status to `DRAFT` |

---

## 6. Post-Lock Append-Only Amendments (`/amendments`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/inspections/:id/amendments` | Participant | Propose correction on locked inspection (`reason`, `target`) |
| `GET` | `/inspections/:id/amendments` | Participant | List all approved and proposed amendments |
| `PATCH` | `/amendments/:id/acknowledge`| Counterparty | Counterparty formally accepts append-only amendment |

---

## 7. Mid-Tenancy Issues Log (`/tenancies/:id/issues`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/tenancies/:id/issues` | Participant | Report maintenance issue with photos and description |
| `GET` | `/tenancies/:id/issues` | Participant | Retrieve mid-tenancy issue register |
| `PATCH` | `/issues/:id/status` | Landlord | Progress status: `OPEN → ACKNOWLEDGED → RESOLVED` |

---

## 8. Comparison Engine & Certified Reports (`/tenancies/:id/compare`, `/report`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/tenancies/:id/compare` | Participant | Execute differential comparison algorithm (SRS logic) |
| `GET` | `/tenancies/:id/comparison`| Participant | Retrieve comparative matrix, deltas, and wear flags |
| `POST` | `/tenancies/:id/report` | Participant | Trigger PDFKit compilation of certified A4 handover dossier |
| `GET` | `/tenancies/:id/report` | Participant | Fetch report metadata, generation status, and seal info |
| `GET` | `/tenancies/:id/report/download` | Participant | Stream compiled binary PDF document (`%PDF` header) |
| `POST` | `/tenancies/:id/report/share` | Landlord | Generate 30-day external read-only share token |
| `DELETE`| `/tenancies/:id/report/share` | Landlord | Revoke external share token |
| `GET` | `/shared/reports/:token` | Public | Unauthenticated view of certified comparison dossier |
| `GET` | `/shared/reports/:token/download` | Public | Download PDF report via public token |

---

## 9. Notification Center (`/notifications`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Authenticated | List notifications with unread counter and pagination |
| `PATCH` | `/notifications/:id/read` | Authenticated | Mark single notification as read |
| `POST` | `/notifications/read-all` | Authenticated | Mark all user notifications as read |

---

## 10. System Administration & Compliance (`/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/stats` | Admin | System telemetry (users, properties, tenancies, reports) |
| `GET` | `/admin/users` | Admin | Searchable user directory with role and status filters |
| `PATCH` | `/admin/users/:id/suspend` | Admin | Suspend user account (immediate API block & login refusal) |
| `PATCH` | `/admin/users/:id/reinstate`| Admin | Restore suspended user account to active status |
| `GET` | `/admin/config/:key` | Admin | Read global config taxonomies (`conditionScale`, `itemCategories`) |
| `PUT` | `/admin/config/:key` | Admin | Update system rating scale or item categories |
| `GET` | `/admin/audit-logs` | Admin | Query append-only audit trail filtered by action or actor |
