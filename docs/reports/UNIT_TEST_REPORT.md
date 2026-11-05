# Unit Test Report

**Project:** Hostel Management System (HMS), Team 3, Class 5-J, PES University
**Version:** 1.0 (draft: frontend complete, backend pending)
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
| Run date | 5 November 2026, 13:18 (IST) | Pending |
| Machine | Windows, student laptop | Pending |

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

Pending. This section is completed after the backend run. It will list the test files, the number of tests, passes and failures, in the same table format as Section 3.

## 5. Defects found while testing

| Defect | Found by | Status |
| --- | --- | --- |
| Leave, Fees and Reports routes missing from `App.jsx` after a merge | Final code review (HMS-37) | Fixed, covered by `app-routing.test.jsx` |
| Fee creation sent no student id | Final code review (HMS-37) | Fixed, covered by backend `review-fixes.test.js` |
| Complaint could be reopened after it was closed | Final code review (HMS-37) | Fixed, covered by backend `review-fixes.test.js` and `complaints-admin.test.jsx` |
| CSV cells starting with `=`, `+`, `-` or `@` could run as spreadsheet formulas | Final code review (HMS-37) | Fixed, covered by backend `reports-route.test.js` |

## 6. Conclusion

All 156 frontend tests passed in the final run. The backend results will be added before submission.
