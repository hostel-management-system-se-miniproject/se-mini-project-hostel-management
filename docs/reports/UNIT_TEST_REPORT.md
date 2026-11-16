# Unit Test Report

**Project:** Hostel Management System (HMS), Team 3, Class 5-J, PES University
**Version:** 1.0
**Prepared by:** Chiranthan Sathrasala
**Related documents:** Test Plan v1.2 and later (`docs/TEST_PLAN.md`), RTM (`docs/RTM.md`)

## 1. Scope

This report records the automated unit and component tests of the Hostel Management System: the frontend (React) and the backend (Node.js, Express, MongoDB). The system-level checks are in the System Validation Report. Coverage figures are in the Code Coverage Report and the Branch Coverage Report.

## 2. Environment

| Item | Frontend | Backend |
| --- | --- | --- |
| Test runner | Vitest 3.2.7 | Node.js built-in test runner (`node --test`), Node.js 24 |
| HTTP testing | not used | supertest |
| Database | not used (no network calls in tests) | MongoDB Atlas test database (name ends in `_test`) |
| Coverage tool | v8 coverage through `@vitest/coverage-v8` | c8 |
| Run command | `npx vitest run --coverage` | `npx c8 node --test --test-concurrency=1` |
| Raw result files | `test-results/frontend-junit.xml` | `test-results/backend-junit.xml` |
| Run date | 5 November 2026, 13:18 (IST) | 8 November 2026 (IST) |
| Machine | Windows, student laptop | Windows, student laptop |

## 3. Frontend results

**Summary:** 17 test files, 156 tests, 156 passed, 0 failed, 0 skipped. Duration 2.74 s. `npm run lint` reported 0 errors. `npm run build` is run separately by CI.

The frontend tests render components to static markup and call the pure helper and API functions with a mocked `fetch`. They do not run a browser.

| Test file | Tests | Area covered | Requirement |
| --- | ---: | --- | --- |
| `register.test.jsx` | 10 | Registration form fields, validation messages, API call | FR-001.1, FR-001.2 |
| `login.test.jsx` | 13 | Login form, error and lockout messages, session handling | FR-001.3 |
| `rooms.test.jsx` | 9 | Room list and filters (block, floor, sharing, availability) | FR-002.1 |
| `allocations.test.jsx` | 12 | Allocate, reallocate and vacate screens, confirmation dialog | FR-002.2, FR-002.5, FR-002.6 |
| `fees-admin.test.jsx` | 10 | Admin fee table, status pills including Overdue, payment history and payment form, fee page | FR-003.1, FR-003.2 |
| `fees-student.test.jsx` | 11 | Student fee page, status names, payment history, dashboard payment list | FR-003.2 |
| `api/fees.test.js` | 8 | Fee API functions: create, list, payment, error messages | FR-003.1, FR-003.4 |
| `complaints.test.jsx` | 6 | Student complaint form and list | FR-004.1 |
| `complaints-admin.test.jsx` | 10 | Admin complaint list, update form, closed complaints | FR-004.2, FR-004.3 |
| `leave.test.jsx` | 12 | Leave request form (including one-day leave) and the student list | FR-005.1 |
| `leave-admin.test.jsx` | 10 | Admin leave decisions | FR-005.2 |
| `visitors.test.jsx` | 9 | Visitor entry and exit log | FR-005.3 |
| `admin-dashboard.test.jsx` | 9 | Admin dashboard figures, attention list, occupancy percentage | FR-005.4 |
| `reports-page.test.jsx` | 3 | CSV and PDF export options, admin-only access | FR-005.5 |
| `dashboard.test.jsx` | 8 | Student dashboard, role-based menu | NFR-002.b |
| `app-routing.test.jsx` | 11 | Which page each route opens for an admin and a student, login gate | NFR-002.b |
| `placeholder.test.jsx` | 5 | Placeholder page, route guards | NFR-002.b |
| **Total** | **156** | | |

**Failures:** none. **Skipped tests:** none.

## 4. Backend results

**Summary:** 35 test files, 301 tests, 301 passed, 0 failed, 0 cancelled, 0 skipped. Duration 182.9 s (about 3 minutes). Run on 8 November 2026 with all tests in sequence (`--test-concurrency=1`) against the MongoDB Atlas test database.

The backend tests call the Express routes through supertest and the services and models directly. Most of them use the real database, so they check the stored data and the unique indexes, not only the response. Race tests send simultaneous requests and check that exactly one wins.

| Test file | Tests | Area covered | Requirement |
| --- | ---: | --- | --- |
| `account-store.test.js` | 6 | Account lookup by USN or email, failed-attempt counter and lock | FR-001.3 |
| `auth-register.test.js` | 17 | Registration rules: valid input, password hash, duplicates, missing and malformed fields, clean-up on failure | FR-001.1, FR-001.2, NFR-002.a |
| `auth-register-db.test.js` | 4 | Registration against the database: unique indexes, simultaneous duplicate | FR-001.1, FR-001.2 |
| `login-service.test.js` | 14 | Login by USN or email, five-failure lock, lock expiry, reset | FR-001.3 |
| `auth-session-routes.test.js` | 9 | Login, logout and `/me` routes, session cookie, inactivity timeout | FR-001.3, NFR-002.c |
| `auth-middleware.test.js` | 11 | `requireAuth`, `requireRole`, `selfOrAdmin` | NFR-002.b |
| `auth-app.test.js` | 3 | Access control on protected routes for anonymous, student and admin | NFR-002.b |
| `rooms-route.test.js` | 12 | Room list, filters, validation, access control | FR-002.1 |
| `rooms-db.test.js` | 2 | Room filters as real database queries | FR-002.1 |
| `allocation-service.test.js` | 11 | Allocate: validation, full room, one active allocation, rollback, concurrent races | FR-002.2, FR-002.3, FR-002.4 |
| `allocation-reallocation-vacate.test.js` | 9 | Reallocate and vacate rules, compensation on failure, last-bed race | FR-002.5, FR-002.6 |
| `allocations-reallocate-vacate-routes.test.js` | 2 | Reallocate and vacate routes | FR-002.5, FR-002.6 |
| `students-allocations-routes.test.js` | 7 | Students and allocations list and allocate routes | FR-002.2 |
| `race-last-bed.test.js` | 2 | Many simultaneous HTTP allocations into the last bed | FR-002.2 |
| `check-consistency.test.js` | 9 | Occupancy against active allocations consistency check | FR-002.3 |
| `fees-route.test.js` | 9 | Fee create, list, payment, filters, access, no delete | FR-003.1, FR-003.4 |
| `fees-by-usn.test.js` | 8 | Student and admin fee reads by USN | FR-003.2 |
| `fee-notifications.test.js` | 24 | Due-date email: window, once only, failures, scheduler, run endpoint | FR-003.3 |
| `complaints-route.test.js` | 17 | Complaint create, list, status updates, history, duplicates | FR-004.1, FR-004.2, FR-004.3 |
| `leaves-route.test.js` | 10 | Student leave requests: submit, validation, own list | FR-005.1 |
| `leaves-admin.test.js` | 14 | Admin leave list and decisions, double-decision race | FR-005.2 |
| `visitors-routes.test.js` | 11 | Visitor entry and exit, validation, access | FR-005.3 |
| `admin-dashboard-route.test.js` | 5 | Admin dashboard route and access | FR-005.4 |
| `admin-dashboard-service.test.js` | 3 | Admin dashboard figures from seeded records | FR-005.4 |
| `student-dashboard.test.js` | 7 | Student dashboard data and fee summary | NFR-002.b |
| `reports-route.test.js` | 11 | CSV and PDF reports, access, formula-character guard | FR-005.5 |
| `review-fixes.test.js` | 5 | Fee by USN, overdue rule, closed complaint is final | FR-003.1, FR-003.2, FR-004.3 |
| `models-users-students.test.js` | 8 | User and Student models and unique indexes | FR-001.1 |
| `models-fees-complaints.test.js` | 15 | Fee and Complaint models, open-complaint rule | FR-003.1, FR-004.1 |
| `models-leaves-visitors.test.js` | 7 | Leave and Visitor models | FR-005.1, FR-005.3 |
| `models-rooms-allocations.test.js` | 14 | Room and Allocation models, one active allocation | FR-002.1, FR-002.2, FR-002.4 |
| `security-config.test.js` | 8 | Security headers, CORS, cookie flags, `.env.example` | NFR-002.b |
| `health.test.js` | 3 | Health check and unknown-route 404 | Support (D-23) |
| `db-helper.test.js` | 3 | Test database name guard | Test support |
| `ensure-indexes.test.js` | 1 | Index creation is complete and repeatable | Test support |
| **Total** | **301** | | |

**Failures:** none. **Skipped tests:** none.

The lines `Unhandled error: internal secret` in the raw output are expected. Four tests make a service throw on purpose and check that the response is the generic 500 body and does not show the message.

## 5. Defects found while testing

| Defect | Found by | Status |
| --- | --- | --- |
| Leave, Fees and Reports routes missing from `App.jsx` after a merge | Final code review (HMS-37) | Fixed, covered by `app-routing.test.jsx` |
| Fee creation sent no student id | Final code review (HMS-37) | Fixed, covered by backend `review-fixes.test.js` |
| Complaint could be reopened after it was closed | Final code review (HMS-37) | Fixed, covered by backend `review-fixes.test.js` and `complaints-admin.test.jsx` |
| CSV cells starting with `=`, `+`, `-` or `@` could run as spreadsheet formulas | Final code review (HMS-37) | Fixed, covered by backend `reports-route.test.js` |

## 6. Conclusion

All 156 frontend tests and all 301 backend tests passed in the final runs, 457 automated tests in total, with no failures and none skipped. The two performance requirements (NFR-001.a and NFR-001.b) are not covered by these tests; they are in the System Validation Report.
