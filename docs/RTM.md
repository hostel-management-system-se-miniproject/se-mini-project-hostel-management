# Requirements Traceability Matrix

This matrix records the Sprint 1 implementation status of each requirement in the SRS v1.1 against the real test IDs from `docs/TEST_PLAN.md`. It is the authoritative traceability record for the Sprint 1 review and the source for evidencing what was completed, what was partially implemented and what remained not yet runnable.

*Updated: 23 October 2026, for the state of the `dev` branch after the HMS-05, HMS-06, HMS-07, HMS-08, HMS-13, HMS-17, HMS-34 and HMS-23 merges.*

Status legend:
- Verified = implemented, and every test ID listed in the row was executed and passed.
- Partial = implemented, but at least one listed test ID has not been executed or cannot run yet. The Evidence column says which tests passed and which are still open.
- Not runnable = the feature is not yet in scope for Sprint 1 or is blocked by a dependency.
- Not started = no implementation or test evidence exists yet.

A test ID is recorded as passed only when it was executed. "Automated" means a test in `backend/test` or `frontend/src` that runs in CI. "Manual" means the step was carried out by hand against the running application.

## Sprint 1 traceability summary

| Requirement ID | Requirement | Implementation status | Real test IDs | Evidence / notes |
| --- | --- | --- | --- | --- |
| FR-001.1 | Student registration with required details | Verified | UT-01, UT-04, UT-05, UT-28, ST-06 | Registration backend and frontend validation are implemented and merged. |
| FR-001.2 | USN and email uniqueness | Verified | UT-02, UT-03 | Duplicate checks are enforced by unique indexes and validation. |
| FR-001.3 | Login by USN or email; lockout after 5 failures for 15 minutes | Verified | UT-06, UT-07, UT-29, UT-30, IT-01, IT-02, IT-12, IT-13, ST-06, NFR-05 | Session management and lockout are implemented and validated. |
| FR-002.1 | Room availability by block, floor and sharing type | Verified | UT-08, UT-31 | Admin room filters and listing are implemented. |
| FR-002.2 | Allocate an available room and update occupancy | Partial | UT-09, IT-16, ST-01 | HMS-08 is merged (allocation service, `/api/allocations`, admin Allocations page). Passed: UT-09 (automated, allocation service and route tests) and ST-01 (manual: allocation made by the admin, then seen on the student dashboard). Open: IT-16 needs reallocate and vacate, which are not built yet. |
| FR-002.3 | No allocation beyond capacity | Partial | UT-10, IT-14, ST-02 | Passed: UT-10 (automated, a full room returns 409 and changes nothing) and ST-02 (automated race tests and `npm run race:last-bed`: only one of the simultaneous requests for the last bed succeeds). Open: IT-14 needs reallocate, which is not built yet. |
| FR-002.4 | One active allocation per student | Partial | UT-11, IT-16 | Passed: UT-11 (automated, a second active allocation returns 409, and the same-student race leaves one active allocation). Open: IT-16, as above. The consistency script (`npm run check:consistency`) will report differences on the shared dev database until the seed data includes matching allocations. |
| FR-002.5 | Reallocate a student to another room | Not runnable | IT-03, IT-14, IT-16 | This feature is scheduled for the next workstream; the Sprint 1 branch does not claim it as complete. |
| FR-002.6 | Vacate a room with confirmation | Not runnable | IT-04, IT-15, IT-16 | Confirmation and vacate flow were not part of the Sprint 1 feature set that was merged. |
| FR-003.1 | Set fee due and due date; record payments and balance | Not started | UT-32, UT-12, UT-13, ST-03 | Fee management is outside the Sprint 1 implementation already merged. |
| FR-003.2 | Paid / Partially Paid / Due status | Not started | UT-14, UT-15, IT-06 | No merged Sprint 1 implementation exists for this feature set. (The student dashboard already derives the fee status from a fee record, but there is no fee management yet.) |
| FR-003.3 | Due-date notification within 7 days (if enabled) | Not started | IT-07, IT-17 | Requires the fee-tracking feature and a configured SMTP environment. |
| FR-003.4 | Reject zero, negative or excessive payments | Not started | UT-16, UT-33, UT-34 | Payment validation is not yet implemented in the Sprint 1 merged branch. |
| FR-004.1 | One open complaint per category | Verified | UT-17, UT-18, UT-19, UT-35, IT-20 | HMS-13 is merged (`POST /api/complaints`, student Complaints page), and the contract fixes are in (categories Electrical, Plumbing and Furniture only, duplicate-key errors return 409). All five passed (automated, `backend/test/complaints-route.test.js`): UT-17 (201, status Open, first history entry Open), UT-18 (second open complaint in a category returns 409), UT-19 (a different category is allowed), UT-35 (blank and spaces-only description return 400), IT-20 (In Progress still blocks; Resolved and Rejected allow a new complaint). |
| FR-004.2 | Admin status and remarks update | Partial | UT-20, UT-36, UT-37, UT-21, ST-04 | The backend `PUT /api/complaints/{id}` is implemented. Passed (automated): UT-20 (In Progress then Resolved, with remarks and history), UT-36 (Rejected needs remarks), UT-37 (invalid statuses such as "Closed" and "done" return 400) and UT-21 (a student cannot update a complaint: 403). Open: ST-04 cannot run until the admin complaint screen is built. |
| FR-004.3 | Complaint history with timestamps | Partial | IT-08, ST-04 | Passed (automated): the student's complaint list returns only their own complaints, newest first, with status, remarks and dates, and every status change is stored in the history with a timestamp. Open: IT-08 has not been run in the browser, and ST-04 cannot run without the admin screen. |
| FR-005.1 | Leave request submission | Not started | UT-22, UT-23, UT-38, ST-05 | Leave workflow is not part of the merged Sprint 1 scope. |
| FR-005.2 | Leave approval or rejection; student views status | Not started | UT-24, UT-25, IT-22, ST-05 | Pending later work. |
| FR-005.3 | Visitor entry and exit log | Verified | UT-26, UT-27, UT-39, UT-40 | HMS-17 is merged (`/api/visitors`, admin Visitors page). All four passed (automated, `backend/test/visitors-routes.test.js`) and were checked by hand on 22 Oct 2026: field errors, an exit earlier than the entry refused, a later exit saved on the same record. Re-recording an exit overwrites the earlier exit time (the contract defines no conflict error). |
| FR-005.4 | Admin dashboard summary | Not started | IT-09 | The admin dashboard summary is excluded from the merged Sprint 1 scope. The student dashboard (HMS-34) is a separate screen and is covered under NFR-002.b. |
| FR-005.5 | Export as CSV and PDF | Not started | IT-10, IT-11, IT-21 | Reporting is scheduled for a later sprint. The visitor-list half of IT-21 is already covered under NFR-002.b. |
| NFR-001.a | Standard page load within 3 seconds | Not runnable | NFR-01 | Requires deployment or a stable browser-perf test environment. |
| NFR-001.b | At least 200 concurrent users | Not runnable | NFR-04 | Load testing needs a proper runtime environment and benchmarking setup. |
| NFR-002.a | Password hashing | Verified | NFR-02 | Password hashing is in the implementation and verified by the security checks. |
| NFR-002.b | Role-based access control; students see only their own records | Partial | IT-05, UT-21, IT-18, IT-19, IT-21 | Passed (automated): IT-05 (a student cannot allocate rooms: 401 without a session, 403 for a student); the dashboard half of IT-18 (a student gets 403 for another student's dashboard, 200 for their own and for an admin); the visitor half of IT-21 (no session 401, student 403 on `/api/visitors`); UT-21 (a student cannot update a complaint); the complaint half of IT-19 (a student lists only their own complaints and gets 403 for another student's complaint). Open: the fee half of IT-18, the report half of IT-21 and the leave half of IT-19, because those features are not built. |
| NFR-002.c | Session expiry after 30 minutes of inactivity | Verified | NFR-03, NFR-05 | Session expiry is implemented and default configuration is documented. |

## Test cases that cannot yet run

The following cases are intentionally listed as not runnable for Sprint 1 because the corresponding feature is not merged or the environment required to execute it is unavailable:

| Test IDs | Reason |
| --- | --- |
| IT-03, IT-04, IT-14, IT-15, IT-16 | Reallocation and vacate logic are not yet part of the Sprint 1 merged feature set. IT-16 also needs the seed data to contain matching allocations. |
| UT-12 to UT-16, UT-32 to UT-34, IT-06, IT-07, IT-17, ST-03 | Fee tracking and payment validation are planned for the next sprint; the fee workflow is not implemented yet. |
| ST-04 | The admin complaint screen is not built yet, so the end-to-end complaint flow cannot be run. |
| UT-22 to UT-25, UT-38, IT-22, ST-05 | The leave workflow is not implemented yet. |
| IT-09, IT-10, IT-11 | The admin dashboard summary and reporting features remain for later work. |
| NFR-01, NFR-04 | Performance and concurrency tests need a deployed or benchmarked environment and were not part of the Sprint 1 merge. |

## Implemented, test not yet executed

These cases belong to features that are merged, but no test has been run for them yet. They are not recorded as passed.

| Test IDs | What is needed |
| --- | --- |
| IT-08 | A run in the browser against the real application: the student opens their complaints and sees status, remarks and dates. |
| IT-19 (leave half) | The leave requests feature must exist first. |

## Review of merged PR traceability

The Sprint 1 merged pull requests are expected to include both the linked requirement IDs and the relevant test IDs in the PR description. The current working convention is consistent with the team process described in `README.md` and the merged Sprint 1 PRs examined for this issue include the relevant requirement/test references in their descriptions.

Examples from the Sprint 1 branch:
- PR #85: FR-001.1, FR-001.2 and UT-01 to UT-05, UT-28
- PR #87: FR-001.3, NFR-002 and UT-06, UT-07, UT-29, UT-30, IT-01, IT-02, NFR-05
- PR #88: FR-002.1 and UT-08, UT-31
- PR #90: FR-001.1, FR-001.2 and the UI test IDs used for the registration page

Later Sprint 1 stories, by issue:
- HMS-08 (room allocation): FR-002.2 to FR-002.4, IT-05, UT-09 to UT-11, ST-01, ST-02
- HMS-34 (student dashboard): NFR-002.b, the dashboard half of IT-18, ST-01 (student side)
- HMS-17 (visitor log): FR-005.3, UT-26, UT-27, UT-39, UT-40, the visitor half of IT-21
- HMS-13 (complaints): FR-004.1 to FR-004.3, UT-17 to UT-21, UT-35 to UT-37, IT-20, the complaint half of IT-19

This is the traceability record that should be used during Sprint 1 review and before promoting the work to the next integration stage.

## Final Sprint 1 status

The merged Sprint 1 work covers authentication, registration, room availability, room allocation, the student dashboard, the visitor log and complaint management on the student side and in the backend (submission, listing and the admin update endpoint; the admin complaint screen is still to come). Several of the functional and non-functional checks are already mapped to real test IDs that were executed and passed. The rows marked Partial list exactly which test IDs are still open, and the remaining requirement groups (fees, leave, reports, the admin dashboard, reallocation and vacate) stay marked as not started or not runnable until their implementation and test evidence are complete.