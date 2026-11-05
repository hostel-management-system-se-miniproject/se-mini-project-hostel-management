# Requirements Traceability Matrix

This matrix records the final implementation status of each requirement in SRS v1.1 against the real test IDs in `docs/TEST_PLAN.md` (v1.2). It is the traceability record for the v1.0 freeze (HMS-37).

*Updated: 2 November 2026, for the `dev` branch at the freeze, after the Sprint 2 test execution (HMS-35, 1 November 2026) and the final code review (HMS-37).*

Status legend:
- Verified = implemented, and every test ID listed in the row was executed and passed.
- Limited by environment = implemented and executed, but the environment prevented the target from being met. The measured numbers are recorded and the requirement is not claimed as met.

A test ID is recorded as passed only when it was executed. "Automated" means a test in `backend/test` or `frontend/src` that runs in CI. "Manual" means the step was carried out by hand against the running application. The Actual Result for each test ID is in the Test Plan, Sections 3 to 5.

## Traceability summary

| Requirement ID | Requirement | Implementation status | Real test IDs | Evidence / notes |
| --- | --- | --- | --- | --- |
| FR-001.1 | Student registration with required details | Verified | UT-01, UT-04, UT-05, UT-28, ST-06 | Registration backend and page. USN is 13 characters (D-02); phone rule in D-14. |
| FR-001.2 | USN and email uniqueness | Verified | UT-02, UT-03 | Enforced by unique indexes, including two simultaneous registrations. |
| FR-001.3 | Login by USN or email; lockout after 5 failures for 15 minutes | Verified | UT-06, UT-07, UT-29, UT-30, IT-01, IT-02, IT-12, IT-13, ST-06, NFR-05 | Session login, lockout and logout. Settings in D-09. |
| FR-002.1 | Room availability by block, floor and sharing type | Verified | UT-08, UT-31 | Room filters (D-13). |
| FR-002.2 | Allocate an available room and update occupancy | Verified | UT-09, IT-16, ST-01 | Allocation service, `/api/allocations`, admin Allocations page. IT-16 re-run with 0 mismatches (`npm run check:consistency`). |
| FR-002.3 | No allocation beyond capacity | Verified | UT-10, IT-14, ST-02 | A full room returns 409 and changes nothing. ST-02: 20 of 20 race rounds passed. |
| FR-002.4 | One active allocation per student | Verified | UT-11, IT-16 | Partial unique index and a same-student race test. |
| FR-002.5 | Reallocate a student to another room | Verified | IT-03, IT-14, IT-16 | HMS-09, with compensating steps if a step fails (D-03). |
| FR-002.6 | Vacate a room with confirmation | Verified | IT-04, IT-15, IT-16 | `confirm: true` plus a confirmation dialog (D-04). |
| FR-003.1 | Set fee due and due date; record payments and balance | Verified | UT-32, UT-12, UT-13, ST-03 | Fee creation (by USN), payment history and balance. Endpoints in D-17. |
| FR-003.2 | Paid / Partially Paid / Due status | Verified | UT-14, UT-15, IT-06 | Derived status, plus the Overdue state (D-16). |
| FR-003.3 | Due-date notification within 7 days (if enabled) | Verified | IT-07, IT-17 | Optional. Runs only when SMTP settings exist; `POST /api/admin/notifications/run` and a daily job. Tested with a fake mailer. |
| FR-003.4 | Reject zero, negative or excessive payments | Verified | UT-16, UT-33, UT-34 | Atomic conditional update, so two payments at the same moment cannot exceed the amount due. |
| FR-004.1 | One open complaint per category | Verified | UT-17, UT-18, UT-19, UT-35, IT-20 | Partial unique index on open complaints per student and category. |
| FR-004.2 | Admin status and remarks update | Verified | UT-20, UT-36, UT-37, UT-21, ST-04 | Admin Complaints page. A closed complaint cannot be changed again (D-18). |
| FR-004.3 | Complaint history with timestamps | Verified | IT-08, ST-04 | Every status change is stored in the history with a timestamp. |
| FR-005.1 | Leave request submission | Verified | UT-22, UT-23, UT-38, ST-05 | A one-day leave is allowed (D-21). |
| FR-005.2 | Leave approval or rejection; student views status | Verified | UT-24, UT-25, IT-22, ST-05 | A request can be decided once (409 `ALREADY_DECIDED`), including two admins at the same moment. |
| FR-005.3 | Visitor entry and exit log | Verified | UT-26, UT-27, UT-39, UT-40 | An exit earlier than the entry is refused. Re-recording an exit overwrites it (D-25). |
| FR-005.4 | Admin dashboard summary | Verified | IT-09 | HMS-18. Occupancy, vacancies, dues, open complaints and operational counts (D-15). |
| FR-005.5 | Export as CSV and PDF | Verified | IT-10, IT-11, IT-21 | Student, fee and complaint reports. Details and the CSV formula guard in D-22. |
| NFR-001.a | Standard page load within 3 seconds | Limited by environment | NFR-01 | Measured on a 2-vCPU, 4 GB development host: p95 3560 ms (login), 4025 ms (student dashboard), 4185 ms (admin dashboard). Not met there; see D-24 and `tests/performance/results.md`. |
| NFR-001.b | At least 200 concurrent users | Limited by environment | NFR-04 | k6 test with 200 users; error rate below 1% (0.74% to 0.91%), but p95 is above 3 seconds on the same host. Not claimed as met (D-24). |
| NFR-002.a | Password hashing | Verified | NFR-02 | bcrypt hashes only; no hash is ever returned. |
| NFR-002.b | Role-based access control; students see only their own records | Verified | IT-05, UT-21, IT-18, IT-19, IT-21 | `requireAuth`, `requireRole` and `selfOrAdmin` on every protected route. Dashboard, fee, complaint, leave, visitor and report halves all executed. |
| NFR-002.c | Session expiry after 30 minutes of inactivity | Verified | NFR-03, NFR-05 | Configurable; the defaults are checked by NFR-05. |

## Result at the freeze

| Result | Requirements |
| --- | --- |
| Verified | 24 of 26 |
| Limited by environment | 2 (NFR-001.a, NFR-001.b) |
| Failed or not tested | 0 |

Test cases (Test Plan v1.2): 73 in total, 71 Pass, 0 Fail, 2 Limited by environment (NFR-01, NFR-04), 0 Not run.

## Changes after the Sprint 2 test execution

The final code review (HMS-37) changed these behaviours after the run recorded in the Test Plan. Each one has an automated test, and the Test Plan (Section 10) lists them. No Actual Result was changed.

| Change | Requirement | Test IDs | Automated test |
| --- | --- | --- | --- |
| Fee creation by USN, with `INVALID_USN` and `NOT_FOUND` | FR-003.1 | UT-32 | `backend/test/review-fixes.test.js` |
| A fee due today is not overdue; the filter matches the status | FR-003.2 | UT-14, UT-15 | `backend/test/review-fixes.test.js` |
| A closed complaint cannot be updated again | FR-004.2 | UT-20, IT-20 | `backend/test/review-fixes.test.js` |
| CSV formula guard; batched room lookup | FR-005.5 | IT-10 | `backend/test/reports-route.test.js` |
| Reports page; Leave, Fees and Dashboard routes restored | FR-005.5, FR-005.1, FR-003.1, FR-005.4 | IT-10, IT-11 | `frontend/src/reports-page.test.jsx`; the other pages' own test files |

## Pull request traceability

Every feature pull request lists the requirement IDs and test IDs it covers in its description. Examples:

- PR #85: FR-001.1, FR-001.2 and UT-01 to UT-05, UT-28
- PR #87: FR-001.3, NFR-002 and UT-06, UT-07, UT-29, UT-30, IT-01, IT-02, NFR-05
- PR #88: FR-002.1 and UT-08, UT-31

By issue:

- HMS-08 (room allocation): FR-002.2 to FR-002.4, IT-05, UT-09 to UT-11, ST-01, ST-02
- HMS-09 (reallocate and vacate): FR-002.5, FR-002.6, IT-03, IT-04, IT-14, IT-15, IT-16
- HMS-13 (complaints): FR-004.1 to FR-004.3, UT-17 to UT-21, UT-35 to UT-37, IT-20, the complaint half of IT-19
- HMS-17 (visitor log): FR-005.3, UT-26, UT-27, UT-39, UT-40, the visitor half of IT-21
- HMS-18 (admin dashboard): FR-005.4, IT-09
- HMS-20 (performance evidence): NFR-001.a, NFR-001.b, NFR-01, NFR-04
- HMS-34 (student dashboard): NFR-002.b, the dashboard half of IT-18, ST-01 (student side)
- HMS-35 (Sprint 2 test execution): all Sprint 2 cases and the regression re-run
