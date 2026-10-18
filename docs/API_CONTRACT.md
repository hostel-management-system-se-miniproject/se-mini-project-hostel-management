# HMS API Contract

**Project:** Hostel Management System (HMS), Team 3, Class 5-J, PES University
**Version:** 1.0
**Status:** The freeze takes effect when this pull request is merged. This file was written on Sun 18 Oct 2026.
**Owner:** Harsh M (Technical Lead)
**Related:** Issue HMS-30 (GitHub issue #37), docs/SAD.md (3.b.3 API Design, 3.b.4 Error Handling), docs/ADR-001.md, docs/DEVIATIONS.md (D-06, D-09)

The frontend and backend teams build against this file. It lists every endpoint in SAD 3.b.3 with its method, path, role, request body, response shape and error codes.

---

## 1. Changing the contract

The contract is frozen. If an endpoint must change, post in the group chat and update this file in the same pull request. Every change is also added to the change log in Section 7.

## 2. Conventions

**Base path.** Every endpoint starts with `/api`. Requests and responses use JSON (`Content-Type: application/json`). The only exception is the report download (Section 5.9).

**Session.** Login starts a server-side session carried in a cookie. The frontend sends every request with credentials included. All endpoints except register and login need a valid session.

**Roles.** Two roles exist: `student` and `admin` (Warden/Admin). The role always comes from the session, never from the request body.

| Role label | Meaning |
|---|---|
| Public | No session needed |
| Authenticated | Any logged-in user |
| Student | A logged-in student |
| Admin | A logged-in Warden/Admin |
| Student (own) / Admin | A student may use it only for their own USN; an admin may use it for any USN |
| Owner / Admin | A student may use it only for a record they own; an admin may use it for any record |

**Common rules for every protected endpoint.** These are not repeated in each endpoint.

- No session or an expired session: 401 `SESSION_EXPIRED`.
- A role that is not allowed: 403 `FORBIDDEN`. This includes an admin calling a Student-only endpoint and a student calling an Admin-only endpoint. Role checks happen before validation.
- Student routes that carry a USN or a record id return 403 `FORBIDDEN` when the record belongs to another student.

**Success response.**

```json
{ "success": true, "message": "optional text", "data": { } }
```

`data` is an object, or an array for list endpoints. `message` appears only where this file shows it.

**Error response.**

```json
{
  "success": false,
  "error": {
    "code": "ROOM_FULL",
    "message": "Room at full capacity",
    "details": {}
  }
}
```

The `code` is stable and is what the frontend checks. The `message` is shown to the user. The codes are listed in Section 6.

**Formats.**

| Item | Format |
|---|---|
| Record id (`id`, `roomId`) | String |
| USN | 13 alphanumeric characters, accepted in any case and stored in upper case, for example `PES1UG24CS001` |
| Date only (`dueDate`, `paidOn`, `startDate`, `endDate`) | `YYYY-MM-DD`, for example `2026-10-20` |
| Date and time (`entryTime`, `exitTime`, `createdAt`, `startedAt` and similar) | ISO 8601, for example `2026-10-20T09:30:00.000Z` |
| Money (`amountDue`, `amount`, `balance`) | A number, in rupees |

**Never returned.** Passwords and password hashes never appear in any response.

**Derived values.** These are computed by the server and are never sent by the client.

| Value | Rule |
|---|---|
| balance | `amountDue - totalPaid` |
| fee status | `Due` if `totalPaid = 0`; `Partially Paid` if `0 < totalPaid < amountDue`; `Paid` if `totalPaid >= amountDue` |
| room vacancy | `capacity - occupancy` |

**Details added by this contract.** SAD 3.b.3 gives the method, path, role and typical status codes, and shows a few request and response examples. Where the SAD does not give the shape of a request or response, this file fixes it, and the frontend and backend both follow this file. This covers the field lists of the list and dashboard responses, the `search` parameter, the leave `decision` body, the report file names and the notification response. The SAD status code lists are "typical" lists. This file adds 401 and 403 to every protected endpoint through the common rules above.

## 3. Endpoint index

| # | Method | Endpoint | Role | Section |
|---|---|---|---|---|
| 1 | POST | /api/auth/register | Public | 5.1 |
| 2 | POST | /api/auth/login | Public | 5.1 |
| 3 | POST | /api/auth/logout | Authenticated | 5.1 |
| 4 | GET | /api/auth/me | Authenticated | 5.1 |
| 5 | GET | /api/students | Admin | 5.2 |
| 6 | GET | /api/students/{usn}/dashboard | Student (own) / Admin | 5.2 |
| 7 | GET | /api/rooms | Admin | 5.3 |
| 8 | GET | /api/allocations | Admin | 5.3 |
| 9 | POST | /api/allocations | Admin | 5.3 |
| 10 | PUT | /api/allocations/{id}/reallocate | Admin | 5.3 |
| 11 | POST | /api/allocations/{id}/vacate | Admin | 5.3 |
| 12 | POST | /api/fees | Admin | 5.4 |
| 13 | POST | /api/fees/payments | Admin | 5.4 |
| 14 | GET | /api/fees | Admin | 5.4 |
| 15 | GET | /api/fees/{usn} | Student (own) / Admin | 5.4 |
| 16 | POST | /api/complaints | Student | 5.5 |
| 17 | GET | /api/complaints/mine | Student | 5.5 |
| 18 | GET | /api/complaints | Admin | 5.5 |
| 19 | GET | /api/complaints/{id} | Owner / Admin | 5.5 |
| 20 | PUT | /api/complaints/{id} | Admin | 5.5 |
| 21 | POST | /api/leaves | Student | 5.6 |
| 22 | GET | /api/leaves/mine | Student | 5.6 |
| 23 | GET | /api/leaves | Admin | 5.6 |
| 24 | GET | /api/leaves/{id} | Owner / Admin | 5.6 |
| 25 | PUT | /api/leaves/{id}/decision | Admin | 5.6 |
| 26 | POST | /api/visitors | Admin | 5.7 |
| 27 | GET | /api/visitors | Admin | 5.7 |
| 28 | PUT | /api/visitors/{id}/exit | Admin | 5.7 |
| 29 | GET | /api/admin/dashboard | Admin | 5.8 |
| 30 | GET | /api/reports/{type} | Admin | 5.9 |
| 31 | POST | /api/admin/notifications/run | Admin | 5.10 |

## 4. Statuses and allowed values

| Item | Allowed values |
|---|---|
| Complaint category | Electrical, Plumbing, Furniture (the categories used in the Test Plan; maximum 20 characters). Adding a category later is a contract change (Section 1). |
| Complaint status | Open, In Progress, Resolved, Rejected |
| Complaint status set by admin | In Progress, Resolved, Rejected |
| Leave status | Pending, Approved, Rejected |
| Leave decision | Approved, Rejected |
| Fee status | Due, Partially Paid, Paid |
| Allocation status | active, inactive |
| Allocation end reason | reallocated, vacated |
| Report type | student, fee, complaint |
| Report format | csv, pdf |

## 5. Endpoints

### 5.1 Authentication

**1. POST /api/auth/register** (Public)

Registers a student account.

Request body:

| Field | Type | Rules |
|---|---|---|
| usn | string | Required. 13 alphanumeric characters |
| name | string | Required. Maximum 60 characters |
| email | string | Required. Valid email, maximum 80 characters |
| phone | string | Required. Maximum 15 characters |
| password | string | Required. Not blank |

Success: 201 Created

```json
{
  "success": true,
  "message": "Registration successful",
  "data": { "usn": "PES1UG24CS901", "name": "Ravi Kumar", "email": "ravi.kumar@pes.edu" }
}
```

Errors: 400 `VALIDATION_ERROR`, 400 `INVALID_USN`, 409 `USN_EXISTS`, 409 `EMAIL_EXISTS`.

**2. POST /api/auth/login** (Public)

Logs in a student or an admin and starts a session. The single login field is `identifier`. It accepts a USN or an email.

Request body:

| Field | Type | Rules |
|---|---|---|
| identifier | string | Required. A USN or an email |
| password | string | Required |

Success: 200 OK

```json
{
  "success": true,
  "message": "Login successful",
  "data": { "role": "student", "usn": "PES1UG24CS001", "name": "Ravi Kumar" }
}
```

For an admin account, `role` is `admin` and `usn` and `name` are `null`.

Errors: 400 `VALIDATION_ERROR` (a field is missing), 401 `INVALID_CREDENTIALS` (the same message for an unknown user and a wrong password), 423 `ACCOUNT_LOCKED` (`details.remainingMinutes` holds the minutes left).

**3. POST /api/auth/logout** (Authenticated)

Ends the current session. No request body.

Success: 200 OK, `{ "success": true, "message": "Logged out" }`

Errors: 401 `SESSION_EXPIRED`.

**4. GET /api/auth/me** (Authenticated)

Returns the current user.

Success: 200 OK, `data` has the same shape as the login response: `role`, `usn`, `name`.

Errors: 401 `SESSION_EXPIRED`.

### 5.2 Students

**5. GET /api/students** (Admin)

Lists students.

Query parameters (all optional):

| Parameter | Meaning |
|---|---|
| unallocated | `true` returns only students with no active allocation |
| search | Partial, case-insensitive match on USN, name or email |

Success: 200 OK, `data` is an array:

```json
[ { "usn": "PES1UG24CS001", "name": "Ravi Kumar", "email": "student001@pes.edu", "phone": "9876543210", "room": "A-204" } ]
```

`room` is the room number of the active allocation, or `null`.

Errors: 401, 403.

**6. GET /api/students/{usn}/dashboard** (Student (own) / Admin)

Returns the summary shown on the student dashboard.

Success: 200 OK

```json
{
  "success": true,
  "data": {
    "student": { "usn": "PES1UG24CS001", "name": "Ravi Kumar", "email": "student001@pes.edu", "phone": "9876543210" },
    "room": { "roomNo": "A-204", "block": "A", "floor": 2, "sharingType": "Triple" },
    "fee": { "amountDue": 50000, "dueDate": "2026-11-30", "totalPaid": 20000, "balance": 30000, "status": "Partially Paid" },
    "complaints": { "open": 1, "total": 2 },
    "leaves": { "pending": 0, "total": 1 }
  }
}
```

`room` is `null` when no room is allocated. `fee` is `null` when no fee record exists. `complaints.open` counts Open and In Progress complaints.

Errors: 401, 403, 404 `NOT_FOUND` (unknown USN).

### 5.3 Rooms and allocations

**7. GET /api/rooms** (Admin)

Lists rooms.

Query parameters (all optional):

| Parameter | Meaning |
|---|---|
| block | Block name, for example `A` |
| floor | Whole number, 0 or more |
| sharing | Sharing type, for example `Triple` |
| available | `true` returns only rooms with a vacancy |

Success: 200 OK, `data` is an array:

```json
[ { "id": "<room id>", "roomNo": "A-204", "block": "A", "floor": 2, "sharingType": "Triple", "capacity": 3, "occupancy": 2, "vacancy": 1 } ]
```

Errors: 400 `VALIDATION_ERROR` (for example a floor that is not a whole number, or `available` that is not `true` or `false`), 401, 403.

**8. GET /api/allocations** (Admin)

Lists allocations, newest first.

Query parameters (all optional):

| Parameter | Meaning |
|---|---|
| active | `true` returns active allocations, `false` returns inactive ones |
| usn | Only this student's allocations |
| roomId | Only this room's allocations |

Success: 200 OK, `data` is an array:

```json
[ {
  "id": "<allocation id>", "usn": "PES1UG24CS001", "studentName": "Ravi Kumar",
  "roomId": "<room id>", "roomNo": "A-204", "status": "active",
  "startedAt": "2026-10-20T09:30:00.000Z", "endedAt": null, "endReason": null
} ]
```

Errors: 401, 403.

**9. POST /api/allocations** (Admin)

Creates an active allocation after validation.

Request body:

| Field | Type | Rules |
|---|---|---|
| usn | string | Required. A registered student |
| roomId | string | Required. A room with a vacancy |

Success: 201 Created

```json
{ "success": true, "data": { "id": "<allocation id>", "usn": "PES1UG24CS001", "room": "A-204", "status": "active" } }
```

Errors: 400 `VALIDATION_ERROR`, 400 `INVALID_USN`, 403, 404 `NOT_FOUND` (student or room), 409 `ROOM_FULL`, 409 `ALREADY_ALLOCATED`.

**10. PUT /api/allocations/{id}/reallocate** (Admin)

Moves a student to another room. `{id}` is the id of the student's current active allocation. The old allocation becomes inactive with end reason `reallocated`, and a new active allocation is created.

Request body:

| Field | Type | Rules |
|---|---|---|
| roomId | string | Required. A different room with a vacancy |

Success: 200 OK, `data` is the new allocation in the same shape as endpoint 9.

Errors: 400 `VALIDATION_ERROR` (missing roomId, or the same room), 403, 404 `NOT_FOUND` (no active allocation with this id, or no such room), 409 `ROOM_FULL`.

**11. POST /api/allocations/{id}/vacate** (Admin)

Ends an active allocation and releases the bed.

Request body:

| Field | Type | Rules |
|---|---|---|
| confirm | boolean | Required. Must be `true` |

```json
{ "confirm": true }
```

Success: 200 OK, `{ "success": true, "data": { "id": "<allocation id>", "usn": "PES1UG24CS001", "status": "inactive" } }`

Errors: 400 `CONFIRMATION_REQUIRED` (confirm is missing or not `true`; nothing changes), 403, 404 `NOT_FOUND` (no active allocation with this id).

### 5.4 Fees

**12. POST /api/fees** (Admin)

Creates the fee record for a student. Each student has one fee record.

Request body:

| Field | Type | Rules |
|---|---|---|
| usn | string | Required. A registered student |
| amountDue | number | Required. Greater than 0 |
| dueDate | string | Required. `YYYY-MM-DD` |

Success: 201 Created

```json
{ "success": true, "data": { "usn": "PES1UG24CS002", "amountDue": 50000, "dueDate": "2026-11-30", "totalPaid": 0, "balance": 50000, "status": "Due" } }
```

Errors: 400 `VALIDATION_ERROR`, 400 `INVALID_AMOUNT`, 400 `INVALID_USN`, 403, 404 `NOT_FOUND` (unknown student), 409 `FEE_EXISTS`.

**13. POST /api/fees/payments** (Admin)

Records a payment against a student's fee record.

Request body:

| Field | Type | Rules |
|---|---|---|
| usn | string | Required |
| amount | number | Required. Greater than 0 and not more than the balance |
| paidOn | string | Required. `YYYY-MM-DD` |

Success: 201 Created

```json
{ "success": true, "data": { "amountDue": 50000, "totalPaid": 20000, "balance": 30000, "status": "Partially Paid" } }
```

Errors: 400 `VALIDATION_ERROR`, 400 `INVALID_AMOUNT`, 400 `PAYMENT_EXCEEDS_BALANCE` (`details.balance` holds the balance), 403, 404 `NOT_FOUND` (unknown student, or the student has no fee record).

**14. GET /api/fees** (Admin)

Lists fee records.

Query parameters (optional):

| Parameter | Meaning |
|---|---|
| status | `Due`, `Partially Paid` or `Paid` |

Success: 200 OK, `data` is an array:

```json
[ { "usn": "PES1UG24CS002", "studentName": "Asha Rao", "amountDue": 50000, "dueDate": "2026-11-30", "totalPaid": 20000, "balance": 30000, "status": "Partially Paid" } ]
```

A `status` value that matches no record returns an empty array.

Errors: 401, 403.

**15. GET /api/fees/{usn}** (Student (own) / Admin)

Returns one student's fee status, balance and payment history.

Success: 200 OK

```json
{
  "success": true,
  "data": {
    "usn": "PES1UG24CS002", "studentName": "Asha Rao",
    "amountDue": 50000, "dueDate": "2026-11-30", "totalPaid": 20000, "balance": 30000, "status": "Partially Paid",
    "payments": [ { "amount": 20000, "paidOn": "2026-10-20" } ]
  }
}
```

Errors: 401, 403, 404 `NOT_FOUND` (unknown student, or the student has no fee record).

### 5.5 Complaints

**16. POST /api/complaints** (Student)

Creates a complaint for the logged-in student.

Request body:

| Field | Type | Rules |
|---|---|---|
| category | string | Required. One of the categories in Section 4 |
| description | string | Required. Not blank |

Success: 201 Created

```json
{ "success": true, "data": { "id": "<complaint id>", "category": "Electrical", "description": "Fan not working in room A-204", "status": "Open", "createdAt": "2026-10-20T09:30:00.000Z" } }
```

Errors: 400 `VALIDATION_ERROR` ("Description is required" or an invalid category), 409 `COMPLAINT_CATEGORY_OPEN`.

**17. GET /api/complaints/mine** (Student)

Returns the logged-in student's complaints, newest first.

Success: 200 OK, `data` is an array:

```json
[ { "id": "<complaint id>", "category": "Electrical", "description": "Fan not working in room A-204", "status": "In Progress", "remarks": "Electrician assigned", "createdAt": "2026-10-20T09:30:00.000Z", "updatedAt": "2026-10-21T10:00:00.000Z" } ]
```

`remarks` is `null` until an admin adds one.

Errors: 401.

**18. GET /api/complaints** (Admin)

Lists complaints, newest first.

Query parameters (all optional): `status` (one of the complaint statuses), `category`.

Success: 200 OK, `data` is an array. Each item has the fields of endpoint 17 plus `usn` and `studentName`.

Errors: 401, 403.

**19. GET /api/complaints/{id}** (Owner / Admin)

Returns one complaint with its history.

Success: 200 OK, `data` has the fields of endpoint 18 plus:

```json
"history": [ { "status": "Open", "remarks": null, "at": "2026-10-20T09:30:00.000Z" }, { "status": "In Progress", "remarks": "Electrician assigned", "at": "2026-10-21T10:00:00.000Z" } ]
```

Errors: 401, 403, 404 `NOT_FOUND`.

**20. PUT /api/complaints/{id}** (Admin)

Updates the status and remarks of a complaint.

Request body:

| Field | Type | Rules |
|---|---|---|
| status | string | Required. `In Progress`, `Resolved` or `Rejected` |
| remarks | string | Required. Not blank |

Success: 200 OK, `data` is the updated complaint in the same shape as endpoint 19.

Errors: 400 `VALIDATION_ERROR` ("Invalid status" or "Remarks are required"), 403, 404 `NOT_FOUND`.

### 5.6 Leave requests

**21. POST /api/leaves** (Student)

Submits a leave request for the logged-in student.

Request body:

| Field | Type | Rules |
|---|---|---|
| startDate | string | Required. `YYYY-MM-DD` |
| endDate | string | Required. `YYYY-MM-DD`, after startDate |
| reason | string | Required. Not blank |

Success: 201 Created

```json
{ "success": true, "data": { "id": "<leave id>", "startDate": "2026-11-01", "endDate": "2026-11-05", "reason": "Family function", "status": "Pending" } }
```

Errors: 400 `VALIDATION_ERROR` ("End date must be after start date" or "Reason is required").

**22. GET /api/leaves/mine** (Student)

Returns the logged-in student's leave requests, newest first.

Success: 200 OK, `data` is an array:

```json
[ { "id": "<leave id>", "startDate": "2026-11-01", "endDate": "2026-11-05", "reason": "Family function", "status": "Approved", "createdAt": "2026-10-20T09:30:00.000Z", "decidedAt": "2026-10-21T10:00:00.000Z" } ]
```

`decidedAt` is `null` while the request is Pending.

Errors: 401.

**23. GET /api/leaves** (Admin)

Lists leave requests, newest first.

Query parameter (optional): `status` (`Pending`, `Approved` or `Rejected`).

Success: 200 OK, `data` is an array. Each item has the fields of endpoint 22 plus `usn` and `studentName`.

Errors: 401, 403.

**24. GET /api/leaves/{id}** (Owner / Admin)

Returns one leave request.

Success: 200 OK, `data` has the fields of endpoint 23.

Errors: 401, 403, 404 `NOT_FOUND`.

**25. PUT /api/leaves/{id}/decision** (Admin)

Approves or rejects a Pending request. A request can be decided only once.

Request body:

| Field | Type | Rules |
|---|---|---|
| decision | string | Required. `Approved` or `Rejected` |

Success: 200 OK, `{ "success": true, "data": { "id": "<leave id>", "status": "Approved", "decidedAt": "2026-10-21T10:00:00.000Z" } }`

Errors: 400 `VALIDATION_ERROR` (missing or invalid decision), 403, 404 `NOT_FOUND`, 409 `ALREADY_DECIDED`.

### 5.7 Visitors

**26. POST /api/visitors** (Admin)

Records a visitor entry.

Request body:

| Field | Type | Rules |
|---|---|---|
| usn | string | Required. A registered student |
| name | string | Required. Not blank |
| contact | string | Required. Digits only, maximum 15 characters |
| purpose | string | Required. Not blank |
| entryTime | string | Required. ISO 8601 date and time |

Success: 201 Created

```json
{ "success": true, "data": { "id": "<visitor id>", "usn": "PES1UG24CS001", "name": "Suresh Kumar", "contact": "9812345678", "purpose": "Family visit", "entryTime": "2026-10-20T09:30:00.000Z", "exitTime": null } }
```

Errors: 400 `VALIDATION_ERROR`, 400 `INVALID_USN`, 403, 404 `NOT_FOUND` (unknown student).

**27. GET /api/visitors** (Admin)

Lists visitor records, newest entry first.

Success: 200 OK, `data` is an array. Each item has the fields of the endpoint 26 response plus `studentName`.

Errors: 401, 403.

**28. PUT /api/visitors/{id}/exit** (Admin)

Records the exit time of a visitor.

Request body:

| Field | Type | Rules |
|---|---|---|
| exitTime | string | Required. ISO 8601 date and time, after the entry time |

Success: 200 OK, `data` is the updated visitor record in the same shape as the endpoint 26 response.

Errors: 400 `VALIDATION_ERROR` ("Exit time must be after entry time"), 403, 404 `NOT_FOUND`.

### 5.8 Admin dashboard

**29. GET /api/admin/dashboard** (Admin)

Returns the figures shown on the admin dashboard. The rules are in SAD 3.b.5 (Derived Values).

Success: 200 OK

```json
{
  "success": true,
  "data": { "totalOccupancy": 42, "totalCapacity": 60, "vacantRooms": 8, "pendingFeeDues": 350000, "openComplaints": 5 }
}
```

| Field | Meaning |
|---|---|
| totalOccupancy | Sum of `occupancy` over all rooms |
| totalCapacity | Sum of `capacity` over all rooms |
| vacantRooms | Number of rooms where `occupancy < capacity` |
| pendingFeeDues | Sum of the balances of fee records with a balance above zero |
| openComplaints | Number of complaints that are Open or In Progress |

Errors: 401, 403.

### 5.9 Reports

**30. GET /api/reports/{type}** (Admin)

Exports a report as a file download. `{type}` is `student`, `fee` or `complaint`.

Query parameter:

| Parameter | Rules |
|---|---|
| format | Required. `csv` or `pdf` |

Success: 200 OK. The response body is the file, not JSON.

| Format | Content-Type | Content-Disposition |
|---|---|---|
| csv | `text/csv; charset=utf-8` | `attachment; filename="<type>-report.csv"` |
| pdf | `application/pdf` | `attachment; filename="<type>-report.pdf"` |

The CSV has a header row and one row per record. Password hashes and other internal fields are never included.

Errors (returned as JSON): 400 `VALIDATION_ERROR` (unknown type, or missing or unknown format), 401, 403.

### 5.10 Notifications

**31. POST /api/admin/notifications/run** (Admin)

Runs the fee due-date notification job now. This is an optional feature (FR-003.3). No request body.

Success: 200 OK, `{ "success": true, "data": { "sent": 3 } }`. `sent` is the number of emails sent, and it is 0 when no fee record is due.

Errors: 403, 503 `NOTIFICATIONS_DISABLED` (no SMTP provider is configured; nothing is sent).

## 6. Error codes

| Code | Status | Message |
|---|---|---|
| VALIDATION_ERROR | 400 | Field-specific text, for example "Phone number is required", "Enter a valid email address", "Description is required", "Reason is required", "Invalid status", "Remarks are required", "End date must be after start date", "Exit time must be after entry time" |
| INVALID_USN | 400 | Enter a valid USN (13 alphanumeric characters, for example PES1UG24CS924) |
| INVALID_AMOUNT | 400 | Amount must be a positive value |
| PAYMENT_EXCEEDS_BALANCE | 400 | Payment exceeds the outstanding balance (`<balance>`) |
| CONFIRMATION_REQUIRED | 400 | Confirmation required |
| INVALID_CREDENTIALS | 401 | Invalid credentials |
| SESSION_EXPIRED | 401 | Session expired |
| FORBIDDEN | 403 | You do not have permission to perform this action |
| NOT_FOUND | 404 | Resource not found |
| USN_EXISTS | 409 | USN already registered |
| EMAIL_EXISTS | 409 | Email already registered |
| ROOM_FULL | 409 | Room at full capacity |
| ALREADY_ALLOCATED | 409 | Student already has an active allocation |
| COMPLAINT_CATEGORY_OPEN | 409 | You already have an open complaint in this category |
| ALREADY_DECIDED | 409 | Leave request already decided |
| FEE_EXISTS | 409 | Fee record already exists for this student |
| ACCOUNT_LOCKED | 423 | Account locked. Try again in `<n>` minute(s) |
| INTERNAL_ERROR | 500 | Something went wrong. Please try again |
| NOTIFICATIONS_DISABLED | 503 | Notifications are not configured |

The full error handling rules are in SAD 3.b.4.

## 7. Change log

| Version | Date | Change | Announced |
|---|---|---|---|
| 1.0 | 18 Oct 2026 | Initial contract for all 31 endpoints in SAD 3.b.3. Frozen when the HMS-30 pull request is merged. | Group chat |

## 8. Outside this contract

`GET /health` is a service check used by the scaffold. It is not one of the 31 endpoints and is not protected by a session. It returns `{ "status": "ok", "service": "hms-api", "database": "connected" }`, or 503 with `"status": "unavailable"` when the database is not connected.
