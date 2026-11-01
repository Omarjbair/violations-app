# Violations Management API

REST API for managing traffic violations, citizens, vehicles, payments, objections, attachments, notifications, audit logs, and reports.

Stack: NestJS 12, MongoDB with Mongoose 9, Redis (cache, rate limiting, sessions), JWT authentication.

## Table of contents

- [General information](#general-information)
- [Setup and environment](#setup-and-environment)
- [Authentication](#authentication)
- [Users](#users)
- [States](#states)
- [Addresses](#addresses)
- [Citizens](#citizens)
- [Branches](#branches)
- [Vehicles and owners](#vehicles-and-owners)
- [Violation types](#violation-types)
- [Violations](#violations)
- [Currencies](#currencies)
- [Payments](#payments)
- [Objections](#objections)
- [Attachments](#attachments)
- [Notifications](#notifications)
- [Audit logs](#audit-logs)
- [Reports](#reports)
- [Error reference](#error-reference)

## General information

- Base URL: `http://localhost:3000/api`
- All routes below are prefixed with `/api/v1`.
- Request and response bodies use JSON, except attachment upload (`multipart/form-data`), payment receipt (`text/html`), and report export (`text/csv`).
- IDs are MongoDB `ObjectId` values (24 hexadecimal characters).
- Dates use ISO 8601 strings, for example `2026-11-01T12:30:00.000Z`.
- Monetary values are numbers with up to two decimal places.
- Persisted resources are soft-deleted. Deleted records are excluded from reads and from active unique indexes.
- Global input validation is enabled. Unknown body or query properties are rejected with `400`.
- The global rate limit is 100 requests per minute per client and route.

### Authentication and roles

Most routes require a Bearer access token:

```http
Authorization: Bearer <access_token>
```

Two roles exist:

| Role | Value | Description |
| --- | --- | --- |
| Admin | `admin` | Full access, including users, reports, audit logs, and destructive operations |
| User | `user` | Operational access to reads and selected create operations |

Public routes are marked `Public` below. All other routes require authentication, even when no role restriction is listed.

### Success response

Successful JSON responses are wrapped:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "timestamp": "2026-11-01T12:30:00.000Z"
}
```

A `201` is returned for standard `POST` create operations, `200` for reads and updates, and `204` for deletions and logouts.

### Paginated responses

List endpoints accept:

| Query | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | integer | `1` | Page number, minimum 1 |
| `limit` | integer | `20` | Page size, minimum 1, maximum 100 |

Paginated payloads have this shape inside the success envelope:

```json
{
  "data": [],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "total_pages": 3
  }
}
```

### Error response

```json
{
  "success": false,
  "statusCode": 400,
  "message": ["message or validation errors"],
  "path": "/api/v1/...",
  "timestamp": "2026-11-01T12:30:00.000Z"
}
```

### Non-JSON responses

The following responses are not wrapped:

- `GET /v1/payments/:id/receipt` returns printable HTML.
- `GET /v1/attachments/:id/download` returns the stored file.
- `GET /v1/reports/export` returns a CSV file.

### Caching and availability

- List responses for states, branches, violation types, and currencies are cached for `REDIS_CACHE_TTL` seconds (default 300). Writes invalidate the related cached lists.
- Report results are cached for 60 seconds. Apply a new filter after a write if immediate consistency is required.
- Cache and rate limiting fail open when Redis is unavailable.
- Authentication sessions fail closed when Redis is unavailable: login, refresh, logout, and logout-all return `503`.

### Audit logging

Audit entries are created for create, update, cancel, delete, and review operations on payments, violations, objections, and attachments. Entries record the actor, action, entity type and ID, before/after snapshots, IP address, user agent, and creation time.

## Setup and environment

### Requirements

- Node.js 20 or newer
- MongoDB instance
- Redis instance (required in production; optional in development, with degraded sessions)
- Writable `uploads/attachments` directory (created automatically)

### Install and run

```bash
npm install
cp .env.example .env
npm run start:dev
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm run start:dev
```

Other commands:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

### Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | - | `development`, `production`, or `test` |
| `PORT` | No | `3000` | HTTP port |
| `MONGODB_URI` | Yes | - | MongoDB or MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | No | driver default | Optional database name |
| `JWT_SECRET` | Yes | - | Access token secret, minimum 32 characters |
| `JWT_REFRESH_SECRET` | Yes | - | Refresh token secret, minimum 32 characters |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `REDIS_URL` | Production | `redis://127.0.0.1:6379` | Redis connection URL (`redis://` or `rediss://`) |
| `REDIS_KEY_PREFIX` | No | `viol` | Prefix for all Redis keys |
| `REDIS_CACHE_TTL` | No | `300` | Reference-data cache TTL in seconds |

### Uploads

Attachment files are stored locally under `uploads/attachments/`. The directory is git-ignored. Maximum file size is 10 MB.

## Authentication

Token model:

- Access token: default 15 minutes, sent as `Authorization: Bearer <token>`.
- Refresh token: default 7 days, sent in the JSON body of `POST /v1/auth/refresh`.
- Each login creates a separate session, allowing multiple devices.
- Refresh tokens rotate on every successful refresh. The old refresh token is invalidated.
- Sessions are stored in Redis with a SHA-256 hash of the refresh token and expire with the token.
- `POST /v1/auth/logout` invalidates the current session.
- `POST /v1/auth/logout-all` invalidates every session for the current user.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/auth/login` | Public | Log in with username or phone and password |
| `POST` | `/v1/auth/refresh` | Public | Exchange a refresh token for a new token pair |
| `POST` | `/v1/auth/register` | Public | Register a `user` account |
| `POST` | `/v1/auth/logout` | Authenticated | Log out the current session |
| `POST` | `/v1/auth/logout-all` | Authenticated | Log out all sessions for the current user |
| `GET` | `/v1/auth/me` | Authenticated | Return the current user |

### Login

`POST /v1/auth/login` — rate limit: 5 requests per minute.

```json
{
  "login": "admin",
  "password": "secret123"
}
```

`login` accepts either `username` or `phone`.

Success `200`:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "access_token": "...",
    "refresh_token": "..."
  },
  "timestamp": "2026-11-01T12:30:00.000Z"
}
```

Errors: `401` invalid credentials, `403` inactive account, `429` rate limited, `503` Redis unavailable.

### Refresh

`POST /v1/auth/refresh` — rate limit: 10 requests per minute. Send the refresh token in the body; a Bearer token is not required.

```json
{
  "refresh_token": "<refresh_token>"
}
```

Success `200` returns a new `access_token` and `refresh_token`. Errors: `401` invalid or revoked session, `503` Redis unavailable.

### Register

`POST /v1/auth/register` — rate limit: 3 requests per hour. Creates a `user` account.

```json
{
  "username": "officer1",
  "phone": "0991234567",
  "password": "secret123",
  "first_name": "Ali",
  "last_name": "Hassan"
}
```

| Field | Rules |
| --- | --- |
| `username` | String, minimum 3 characters, unique among active users |
| `phone` | Syrian phone format: `+9639XXXXXXXX`, `009639XXXXXXXX`, or `09XXXXXXXX` |
| `password` | String, minimum 6 characters |
| `first_name` | Optional string |
| `last_name` | Optional string |

Success `201` returns an access/refresh token pair. Public registration cannot set `role` or `branch_id`; role defaults to `user`.

### Logout

- `POST /v1/auth/logout` — requires Bearer token; returns `204`.
- `POST /v1/auth/logout-all` — requires Bearer token; returns `204` and removes all Redis sessions for the user.

Access tokens already issued remain valid until their normal expiry.

### Current user

`GET /v1/auth/me` returns the authenticated user, including populated `branch_id` (`code`, `name`, `phone`). The password is never returned.

## Users

All routes require `admin`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/users` | Create a user |
| `GET` | `/v1/users` | List users |
| `GET` | `/v1/users/:id` | Get a user |
| `PATCH` | `/v1/users/:id` | Update a user |
| `DELETE` | `/v1/users/:id` | Soft-delete a user |

Create body:

```json
{
  "username": "admin2",
  "phone": "0991234567",
  "password": "secret123",
  "first_name": "Sara",
  "last_name": "Khalil",
  "branch_id": "66f0c7a2b7d8e4a1c2d3e4f5",
  "role": "admin"
}
```

| Field | Rules |
| --- | --- |
| `username` | Required, minimum 3 characters, unique among active users |
| `phone` | Required, Syrian phone format, unique among active users |
| `password` | Required, minimum 6 characters, stored as bcrypt hash |
| `first_name` | Optional string |
| `last_name` | Optional string |
| `branch_id` | Optional valid branch ID |
| `role` | Optional `admin` or `user`; default `user` |

Update accepts the same fields except `password`. Passwords cannot be changed through this API. `GET` list accepts pagination only. Deletion is soft and does not invalidate existing tokens automatically; use `logout-all` for immediate session invalidation.

## States

All routes require `admin`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/states` | Create a state |
| `GET` | `/v1/states` | List states |
| `GET` | `/v1/states/:id` | Get a state |
| `PATCH` | `/v1/states/:id` | Update a state |
| `DELETE` | `/v1/states/:id` | Soft-delete a state |

Create body:

```json
{
  "name": "Damascus"
}
```

`name` is required, minimum 2 characters, and unique among active states. List accepts pagination only. List responses are cached.

## Addresses

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/addresses` | Admin, User | Create an address |
| `GET` | `/v1/addresses` | Admin, User | List addresses |
| `GET` | `/v1/addresses/:id` | Admin, User | Get an address |
| `PATCH` | `/v1/addresses/:id` | Admin | Update an address |
| `DELETE` | `/v1/addresses/:id` | Admin | Soft-delete an address |

Create body:

```json
{
  "state_id": "66f0c7a2b7d8e4a1c2d3e4f5",
  "city": "Damascus",
  "street": "Al-Mazzeh"
}
```

| Field | Rules |
| --- | --- |
| `state_id` | Required valid state ID |
| `city` | Required, minimum 2 characters |
| `street` | Required, minimum 2 characters |

List accepts pagination only. Address IDs are used by citizens and branches.

## Citizens

All routes require `admin`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/citizens` | Create a citizen |
| `GET` | `/v1/citizens` | List citizens |
| `GET` | `/v1/citizens/:id` | Get a citizen |
| `PATCH` | `/v1/citizens/:id` | Update a citizen |
| `DELETE` | `/v1/citizens/:id` | Soft-delete a citizen |

Create body:

```json
{
  "national_id": "01010101010",
  "first_name": "Ali",
  "father_name": "Hassan",
  "mother_name": "Mona",
  "last_name": "Hassan",
  "date_of_birth": "1990-05-10",
  "phone": "0991234567",
  "address_id": "66f0c7a2b7d8e4a1c2d3e4f5"
}
```

| Field | Rules |
| --- | --- |
| `national_id` | Required, exactly 11 digits, unique among active citizens |
| `first_name` | Required |
| `father_name` | Required |
| `mother_name` | Required |
| `last_name` | Required |
| `date_of_birth` | Required ISO date |
| `phone` | Required, Syrian phone format |
| `address_id` | Required valid address ID, unique among active citizens |

List accepts pagination only. Citizens are referenced by violations, objections, and vehicle owners.

## Branches

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/branches` | Admin | Create a branch |
| `GET` | `/v1/branches` | Admin, User | List branches |
| `GET` | `/v1/branches/:id` | Admin, User | Get a branch |
| `PATCH` | `/v1/branches/:id` | Admin | Update a branch |
| `DELETE` | `/v1/branches/:id` | Admin | Soft-delete a branch |

Create body:

```json
{
  "code": "DM-01",
  "name": "Damascus Main Branch",
  "phone": "0991234567",
  "address_id": "66f0c7a2b7d8e4a1c2d3e4f5"
}
```

| Field | Rules |
| --- | --- |
| `code` | Required, 2–20 letters, digits, or hyphens; stored uppercase; unique among active branches |
| `name` | Required, minimum 2 characters, unique among active branches |
| `phone` | Required, Syrian phone format |
| `address_id` | Required valid address ID |

List accepts pagination only. List responses are cached. Branch `code`, `name`, and `phone` are included in payment receipts.

## Vehicles and owners

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/vehicles` | Admin | Create a vehicle |
| `GET` | `/v1/vehicles` | Admin, User | List vehicles |
| `GET` | `/v1/vehicles/:id` | Admin, User | Get a vehicle |
| `PATCH` | `/v1/vehicles/:id` | Admin | Update a vehicle |
| `DELETE` | `/v1/vehicles/:id` | Admin | Soft-delete a vehicle |
| `GET` | `/v1/vehicles/:vehicleId/owners` | Admin, User | List ownership records |
| `POST` | `/v1/vehicles/:vehicleId/owners` | Admin | Add an owner |
| `PATCH` | `/v1/vehicles/:vehicleId/owners/:ownerId` | Admin | Update an ownership record |
| `DELETE` | `/v1/vehicles/:vehicleId/owners/:ownerId` | Admin | Soft-delete an ownership record |

### Vehicles

Create body:

```json
{
  "plate_number": "123456",
  "plate_code": "DM",
  "plate_category": "private",
  "vehicle_type": "car",
  "make": "Toyota",
  "model": "Corolla",
  "color": "White",
  "manufacture_year": 2020
}
```

| Field | Rules |
| --- | --- |
| `plate_number` | Required, 1–20 letters, digits, or hyphens; stored uppercase |
| `plate_code` | Required, 1–10 letters, digits, or hyphens; stored uppercase |
| `plate_category` | Optional string; default `private` |
| `vehicle_type` | Required: `car`, `motorcycle`, `truck`, `bus`, `van`, or `other` |
| `make` | Required non-empty string |
| `model` | Required non-empty string |
| `color` | Optional |
| `manufacture_year` | Required integer from 1900 to the next calendar year |

The combination of `plate_number`, `plate_code`, and `plate_category` is unique among active vehicles; values are normalized to uppercase. A vehicle cannot be deleted while non-deleted ownership records exist.

List accepts pagination only.

### Vehicle owners

Create body:

```json
{
  "citizen_id": "66f0c7a2b7d8e4a1c2d3e4f5",
  "is_primary": true,
  "started_at": "2026-01-01",
  "ended_at": null
}
```

| Field | Rules |
| --- | --- |
| `citizen_id` | Required valid citizen ID |
| `is_primary` | Optional boolean, default `false` |
| `started_at` | Required ISO date |
| `ended_at` | Optional ISO date or `null`; must not be before `started_at` |

Rules:

- A vehicle can have at most one active primary owner (`is_primary: true`, `ended_at: null`).
- Setting a new active primary owner automatically ends the previous active primary ownership by setting `ended_at`.
- The same citizen cannot have two active ownership records for the same vehicle.
- Owner list accepts pagination only.
- Owner deletion is soft.

## Violation types

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/violation-types` | Admin | Create a violation type |
| `GET` | `/v1/violation-types` | Admin, User | List violation types |
| `GET` | `/v1/violation-types/:id` | Admin, User | Get a violation type |
| `PATCH` | `/v1/violation-types/:id` | Admin | Update a violation type |
| `DELETE` | `/v1/violation-types/:id` | Admin | Soft-delete a violation type |

Create body:

```json
{
  "code": "SPEEDING",
  "name": "Speeding",
  "description": "Exceeding the speed limit",
  "default_fine": 5000,
  "is_active": true
}
```

| Field | Rules |
| --- | --- |
| `code` | Required, 2–30 letters, digits, underscores, or hyphens; stored uppercase; unique among active types |
| `name` | Required, minimum 2 characters, unique among active types |
| `description` | Optional |
| `default_fine` | Required number, minimum 0, up to two decimals |
| `is_active` | Optional boolean, default `true` |

List accepts pagination only. List responses are cached. Inactive types cannot be used when creating or updating violations.

## Violations

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/violations` | Admin, User | Create a violation |
| `GET` | `/v1/violations` | Admin, User | List violations |
| `GET` | `/v1/violations/:id` | Admin, User | Get a violation |
| `PATCH` | `/v1/violations/:id` | Admin | Update a violation |
| `PATCH` | `/v1/violations/:id/cancel` | Admin | Cancel an unpaid violation |
| `DELETE` | `/v1/violations/:id` | Admin | Soft-delete a violation without payments |

### Create violation

```json
{
  "citizen_id": "66f0c7a2b7d8e4a1c2d3e4f5",
  "vehicle_id": "66f0c7a2b7d8e4a1c2d3e4f6",
  "violation_type_id": "66f0c7a2b7d8e4a1c2d3e4f7",
  "branch_id": "66f0c7a2b7d8e4a1c2d3e4f8",
  "fine_amount": 5000,
  "violation_date": "2026-11-01T10:00:00.000Z",
  "location": "Damascus - Al-Mazzeh"
}
```

| Field | Rules |
| --- | --- |
| `citizen_id` | Required valid citizen |
| `vehicle_id` | Required valid vehicle |
| `violation_type_id` | Required valid and active violation type |
| `branch_id` | Required valid branch |
| `fine_amount` | Optional, minimum 0, up to two decimals; defaults to the type's `default_fine` |
| `violation_date` | Optional ISO date; defaults to now |
| `location` | Optional |

Server-controlled fields:

- `violation_number`: generated as `V-YYYYMMDD-XXXXXXXX`.
- `officer_id`: taken from the authenticated user.
- `status`: starts as `unpaid`.
- `paid_amount`: starts at `0`.

### List and get

Query filters:

| Query | Type | Description |
| --- | --- | --- |
| `status` | enum | `unpaid`, `partially_paid`, `paid`, `cancelled` |
| `citizen_id` | ObjectId | Filter by citizen |
| `vehicle_id` | ObjectId | Filter by vehicle |
| `violation_type_id` | ObjectId | Filter by type |
| `branch_id` | ObjectId | Filter by branch |
| `officer_id` | ObjectId | Filter by officer |
| `from_date` | ISO date | Minimum `violation_date` |
| `to_date` | ISO date | Maximum `violation_date` |
| `search` | string | Case-insensitive partial match on `violation_number` |
| `page`, `limit` | integers | Pagination |

`GET /v1/violations/:id` populates citizen, vehicle, violation type, branch, officer, and paid currency.

### Update and cancellation rules

- `PATCH /v1/violations/:id` accepts any create field.
- A cancelled violation cannot be updated.
- `fine_amount` cannot be changed after any payment has been recorded (`paid_amount > 0`).
- Cancellation is allowed only while the status is `unpaid`.
- A paid or partially paid violation cannot be deleted.
- Deletion and cancellation are soft and do not remove payments or related records.

### Status calculation

Payment operations recalculate the violation automatically:

| Condition | Status |
| --- | --- |
| No completed payments | `unpaid` |
| Completed total is below `fine_amount` | `partially_paid` |
| Completed total is at least `fine_amount` | `paid` |
| Manually cancelled while unpaid | `cancelled` |

`paid_currency_id` is set to the payment currency for paid violations and cleared when no completed payments remain.

## Currencies

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/currencies` | Admin | Create a currency |
| `GET` | `/v1/currencies` | Admin, User | List currencies |
| `GET` | `/v1/currencies/:id` | Admin, User | Get a currency |
| `PATCH` | `/v1/currencies/:id` | Admin | Update a currency |
| `DELETE` | `/v1/currencies/:id` | Admin | Soft-delete a currency |

Create body:

```json
{
  "code": "SYP",
  "name": "Syrian Pound"
}
```

`code` must be exactly three letters and is stored uppercase; it is unique among active currencies. `name` is required, 2–50 characters, and unique among active currencies. List accepts pagination only. List responses are cached.

## Payments

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/payments` | Admin, User | Record a payment |
| `GET` | `/v1/payments` | Admin, User | List payments |
| `GET` | `/v1/payments/:id` | Admin, User | Get a payment |
| `GET` | `/v1/payments/:id/receipt` | Admin, User | Get a printable HTML receipt |
| `PATCH` | `/v1/payments/:id` | Admin | Update or refund a payment |
| `DELETE` | `/v1/payments/:id` | Admin | Soft-delete a payment |

### Create payment

```json
{
  "violation_id": "66f0c7a2b7d8e4a1c2d3e4f5",
  "currency_id": "66f0c7a2b7d8e4a1c2d3e4f6",
  "branch_id": "66f0c7a2b7d8e4a1c2d3e4f7",
  "amount": 2500,
  "paid_at": "2026-11-01T12:00:00.000Z",
  "notes": "Partial payment"
}
```

| Field | Rules |
| --- | --- |
| `violation_id` | Required valid active violation |
| `currency_id` | Required valid active currency |
| `branch_id` | Optional valid branch; defaults to the violation's branch |
| `amount` | Required number, minimum 0.01, up to two decimals |
| `paid_at` | Optional ISO date; defaults to now |
| `notes` | Optional |

Business rules:

- Payments cannot be added to cancelled or already paid violations.
- The amount cannot exceed the remaining balance (`fine_amount - paid_amount`).
- A violation can only be paid in one currency. A different currency is rejected.
- `receipt_number` is generated as `R-YYYYMMDD-XXXXXXXX`.
- `accountant_id` is taken from the authenticated user.
- New payments have status `completed`.
- Violation totals and status are recalculated after create, update, refund, and delete.

### List and get

Filters:

| Query | Type | Description |
| --- | --- | --- |
| `violation_id` | ObjectId | Filter by violation |
| `currency_id` | ObjectId | Filter by currency |
| `branch_id` | ObjectId | Filter by branch |
| `accountant_id` | ObjectId | Filter by accountant |
| `status` | enum | `completed`, `refunded`, `cancelled` |
| `from_date` | ISO date | Minimum `paid_at` |
| `to_date` | ISO date | Maximum `paid_at` |
| `search` | string | Case-insensitive partial match on `receipt_number` |
| `page`, `limit` | integers | Pagination |

`GET /v1/payments/:id` populates violation summary, currency, branch, and accountant.

### Update and refund

`PATCH /v1/payments/:id` accepts:

```json
{
  "status": "refunded",
  "paid_at": "2026-11-02T09:00:00.000Z",
  "notes": "Refunded by manager"
}
```

- Status can only change while the payment is currently `completed`.
- Allowed target statuses are `refunded` and `cancelled`.
- A refunded or cancelled payment is excluded from the violation's paid total.
- A payment cannot be moved back to `completed` through this endpoint.
- `paid_at` and `notes` can be updated independently.
- The violation is recalculated when the status changes.

### Receipt

`GET /v1/payments/:id/receipt` returns a standalone Arabic, RTL, printable HTML receipt with:

- Receipt number and status
- Citizen name and national ID
- Vehicle plate details
- Violation number, type, date, and location
- Branch and accountant details
- Fine amount, total paid, this payment, and remaining balance
- Notes and print button

The response is `text/html; charset=utf-8` and is not wrapped in the JSON envelope.

## Objections

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/objections` | Admin, User | Create an objection |
| `GET` | `/v1/objections` | Admin, User | List objections |
| `GET` | `/v1/objections/:id` | Admin, User | Get an objection |
| `PATCH` | `/v1/objections/:id/review` | Admin | Approve or reject an objection |
| `PATCH` | `/v1/objections/:id` | Admin | Edit a pending objection |
| `DELETE` | `/v1/objections/:id` | Admin | Soft-delete an objection |

### Create objection

```json
{
  "violation_id": "66f0c7a2b7d8e4a1c2d3e4f5",
  "applicant_id": "66f0c7a2b7d8e4a1c2d3e4f6",
  "reason": "Incorrect violation details",
  "description": "The vehicle was not at the reported location."
}
```

| Field | Rules |
| --- | --- |
| `violation_id` | Required valid, non-deleted violation |
| `applicant_id` | Required valid citizen |
| `reason` | Required, 3–500 characters |
| `description` | Optional, maximum 2000 characters |

Rules:

- A cancelled violation cannot receive an objection.
- Only one `pending` objection is allowed per violation.
- New objections start as `pending`.

### List and get

Filters:

| Query | Type | Description |
| --- | --- | --- |
| `violation_id` | ObjectId | Filter by violation |
| `applicant_id` | ObjectId | Filter by applicant |
| `reviewer_id` | ObjectId | Filter by reviewer |
| `status` | enum | `pending`, `approved`, `rejected` |
| `from_date` | ISO date | Minimum `created_at` |
| `to_date` | ISO date | Maximum `created_at` |
| `search` | string | Case-insensitive partial match on `reason` |
| `page`, `limit` | integers | Pagination |

`GET /v1/objections/:id` populates violation summary, applicant, and reviewer.

### Update and review

`PATCH /v1/objections/:id` — only pending objections can be edited. Body:

```json
{
  "reason": "Updated reason",
  "description": "Updated details"
}
```

`PATCH /v1/objections/:id/review` — only pending objections can be reviewed. Body:

```json
{
  "status": "approved",
  "review_notes": "Accepted after review"
}
```

- `status` must be `approved` or `rejected`.
- `review_notes` is optional.
- Reviewer and review timestamp are recorded from the authenticated user and server time.
- Approving an objection does not automatically cancel or change the violation; cancel it separately if needed.

## Attachments

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/attachments` | Admin, User | Upload an attachment |
| `GET` | `/v1/attachments` | Admin, User | List attachments |
| `GET` | `/v1/attachments/:id` | Admin, User | Get attachment metadata |
| `GET` | `/v1/attachments/:id/download` | Admin, User | Download the file |
| `DELETE` | `/v1/attachments/:id` | Admin | Soft-delete attachment metadata |

### Upload

`POST /v1/attachments` uses `multipart/form-data`.

| Part | Rules |
| --- | --- |
| `file` | Required; allowed MIME types: JPEG, PNG, WebP, GIF, HEIC, HEIF, PDF, DOC, DOCX; maximum 10 MB |
| `violation_id` | Optional valid violation ID |
| `objection_id` | Optional valid objection ID |

At least one of `violation_id` or `objection_id` is required. Both may be provided. Files are stored with UUID names under `uploads/attachments/`, and the original name and MIME type are preserved in metadata.

```bash
curl -X POST http://localhost:3000/api/v1/attachments \
  -H "Authorization: Bearer <token>" \
  -F "file=@evidence.pdf" \
  -F "violation_id=66f0c7a2b7d8e4a1c2d3e4f5"
```

Success `201` returns attachment metadata including `file_name`, `original_name`, `mime_type`, `size`, `path`, `violation_id`, and `objection_id`.

### List and get

Filters:

| Query | Type | Description |
| --- | --- | --- |
| `violation_id` | ObjectId | Filter by violation |
| `objection_id` | ObjectId | Filter by objection |
| `mime_type` | string | Exact MIME type |
| `from_date` | ISO date | Minimum `created_at` |
| `to_date` | ISO date | Maximum `created_at` |
| `search` | string | Case-insensitive partial match on `original_name` |
| `page`, `limit` | integers | Pagination |

`GET /v1/attachments/:id` populates violation and objection summaries.

### Download

`GET /v1/attachments/:id/download` returns the file with its stored MIME type. The response sets both ASCII and UTF-8 encoded filenames. The response is not wrapped in JSON.

## Notifications

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/v1/notifications` | Admin | Create a notification for a user |
| `GET` | `/v1/notifications` | Admin, User | List notifications |
| `GET` | `/v1/notifications/:id` | Admin, User | Get a notification |
| `PATCH` | `/v1/notifications/read-all` | Admin, User | Mark all own notifications as read |
| `PATCH` | `/v1/notifications/:id/read` | Admin, User | Mark one notification as read |
| `DELETE` | `/v1/notifications/:id` | Admin, User | Soft-delete a notification |

### Create notification

```json
{
  "user_id": "66f0c7a2b7d8e4a1c2d3e4f5",
  "title": "Payment received",
  "body": "Your payment has been recorded.",
  "type": "payment",
  "data": {
    "payment_id": "66f0c7a2b7d8e4a1c2d3e4f6"
  }
}
```

| Field | Rules |
| --- | --- |
| `user_id` | Required active user ID |
| `title` | Required, 3–200 characters |
| `body` | Required, 3–2000 characters |
| `type` | Required, 2–50 characters |
| `data` | Optional JSON object |

### List and access rules

Filters:

| Query | Type | Description |
| --- | --- | --- |
| `user_id` | ObjectId | Admin only; ignored for normal users |
| `type` | string | Exact notification type |
| `is_read` | boolean | `true` for read notifications, `false` for unread |
| `from_date` | ISO date | Minimum `created_at` |
| `to_date` | ISO date | Maximum `created_at` |
| `search` | string | Case-insensitive partial match on `title` or `body` |
| `page`, `limit` | integers | Pagination |

- Normal users only see their own notifications; `user_id` is ignored and ownership is enforced on get, read, and delete.
- Admins can see all notifications and filter by `user_id`.
- `GET /v1/notifications/:id` populates the recipient (`username`, `first_name`, `last_name`, `phone`).
- Marking an already-read notification returns it unchanged.
- `PATCH /v1/notifications/read-all` returns `{ "updated": <count> }`.
- Deletion is soft.

## Audit logs

All routes require `admin`. Audit logs are append-only; there are no create, update, or delete endpoints.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/audit-logs` | List audit entries, newest first |
| `GET` | `/v1/audit-logs/:id` | Get one audit entry |

Filters:

| Query | Type | Description |
| --- | --- | --- |
| `actor_id` | ObjectId | Filter by acting user |
| `action` | string | `create`, `update`, `cancel`, `delete`, or `review` |
| `entity_type` | string | `payment`, `violation`, `objection`, or `attachment` |
| `entity_id` | ObjectId | Filter by entity |
| `from_date` | ISO date | Minimum `created_at` |
| `to_date` | ISO date | Maximum `created_at` |
| `page`, `limit` | integers | Pagination |

Audit entry fields:

| Field | Description |
| --- | --- |
| `actor_id` | Acting user, populated with `username`, `first_name`, `last_name` on get |
| `action` | Operation performed |
| `entity_type` | Affected entity collection |
| `entity_id` | Affected document ID |
| `before` | Snapshot before the operation, when applicable |
| `after` | Snapshot after the operation, when applicable |
| `ip` | Request IP address |
| `user_agent` | Request user agent |
| `created_at` | Entry creation time |

## Reports

All routes require `admin`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/reports/revenue` | Revenue grouped by day, currency, and branch |
| `GET` | `/v1/reports/violations` | Violation totals by status and type |
| `GET` | `/v1/reports/top-offenders` | Citizens with the most violations |
| `GET` | `/v1/reports/export` | Export a report as CSV |

Shared filters:

| Query | Type | Description |
| --- | --- | --- |
| `from_date` | ISO date | Lower bound; `paid_at` for revenue, `violation_date` for other reports |
| `to_date` | ISO date | Upper bound |
| `branch_id` | ObjectId | Filter by branch |
| `currency_id` | ObjectId | Revenue only; filter by payment currency |
| `violation_type_id` | ObjectId | Violations and top-offenders only |
| `limit` | integer | Top-offenders only; 1–100, default 10 |

Reports are cached for 60 seconds.

### Revenue report

`GET /v1/reports/revenue`

Only non-deleted payments with status `completed` are included. Results are grouped by UTC payment date (`YYYY-MM-DD`), currency, and branch.

```json
{
  "rows": [
    {
      "date": "2026-11-01",
      "currency_id": "66f0c7a2b7d8e4a1c2d3e4f5",
      "currency_code": "SYP",
      "currency_name": "Syrian Pound",
      "branch_id": "66f0c7a2b7d8e4a1c2d3e4f6",
      "branch_code": "DM-01",
      "branch_name": "Damascus Main Branch",
      "total": 7500,
      "count": 3
    }
  ],
  "totals": [
    {
      "currency_id": "66f0c7a2b7d8e4a1c2d3e4f5",
      "currency_code": "SYP",
      "currency_name": "Syrian Pound",
      "total": 7500
    }
  ]
}
```

`totals` aggregates all rows by currency.

### Violations report

`GET /v1/reports/violations`

Includes all non-deleted violations whose `violation_date` matches the filters, regardless of status. Fine totals are sums of `fine_amount`; violations do not store a currency until paid.

```json
{
  "summary": {
    "total": 25,
    "total_fines": 125000
  },
  "by_status": [
    {
      "status": "unpaid",
      "count": 10,
      "total_fines": 50000
    }
  ],
  "by_type": [
    {
      "violation_type_id": "66f0c7a2b7d8e4a1c2d3e4f5",
      "code": "SPEEDING",
      "name": "Speeding",
      "count": 8,
      "total_fines": 40000
    }
  ]
}
```

### Top offenders report

`GET /v1/reports/top-offenders`

Groups non-deleted violations by citizen, sorts by violation count descending then total fines descending, and applies `limit`.

```json
[
  {
    "rank": 1,
    "citizen_id": "66f0c7a2b7d8e4a1c2d3e4f5",
    "national_id": "01010101010",
    "full_name": "Ali Hassan",
    "phone": "0991234567",
    "violations_count": 7,
    "total_fines": 35000
  }
]
```

### CSV export

`GET /v1/reports/export`

Required and optional query parameters:

| Query | Required | Values |
| --- | --- | --- |
| `report` | Yes | `revenue`, `violations`, or `top-offenders` |
| `format` | No | `csv` (default and only supported value) |
| Shared filters | No | Same as the selected report |

The response is `text/csv; charset=utf-8` with a UTF-8 BOM and an attachment filename such as `report-revenue-2026-11-01.csv`. It is not wrapped in JSON.

CSV columns:

| Report | Columns |
| --- | --- |
| `revenue` | Date, currency code, currency name, branch code, branch name, total, payment count |
| `violations` | Category (`status` or `type`), key, code, name, count, total fines |
| `top-offenders` | Rank, national ID, full name, phone, violation count, total fines |

## Error reference

| Status | Meaning |
| --- | --- |
| `400` | Validation error, invalid ID, invalid date range, or unsupported file type |
| `401` | Missing, invalid, or expired access/refresh token |
| `403` | Insufficient role, inactive account, or resource ownership violation |
| `404` | Resource or related resource not found |
| `409` | Duplicate active value, conflicting state, overpayment, locked field, or duplicate relation |
| `429` | Rate limit exceeded |
| `500` | Unhandled server error |
| `503` | Redis unavailable for a session-dependent authentication operation |
