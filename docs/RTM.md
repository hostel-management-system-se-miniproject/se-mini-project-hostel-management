# Requirements Traceability Matrix

This matrix records the Sprint 1 implementation status of each requirement in the SRS v1.1 against the real test IDs from `docs/TEST_PLAN.md`. It is the authoritative traceability record for the Sprint 1 review and the source for evidencing what was completed, what was partially implemented and what remained not yet runnable.

Status legend:
- Verified = implemented and the relevant tests were executed and recorded.
- Partial = implemented, but not yet fully validated or not yet complete enough for a final Pass.
- Not runnable = the feature is not yet in scope for Sprint 1 or is blocked by a dependency.
- Not started = no implementation or test evidence exists yet.

## Sprint 1 traceability summary

| Requirement ID | Requirement | Implementation status | Real test IDs | Evidence / notes |
| --- | --- | --- | --- | --- |
| FR-001.1 | Student registration with required details | Verified | UT-01, UT-04, UT-05, UT-28, ST-06 | Registration backend and frontend validation are implemented and merged. |
| FR-001.2 | USN and email uniqueness | Verified | UT-02, UT-03 | Duplicate checks are enforced by unique indexes and validation. |
| FR-001.3 | Login by USN or email; lockout after 5 failures for 15 minutes | Verified | UT-06, UT-07, UT-29, UT-30, IT-01, IT-02, IT-12, IT-13, ST-06, NFR-05 | Session management and lockout are implemented and validated. |
| FR-002.1 | Room availability by block, floor and sharing type | Verified | UT-08, UT-31 | Admin room filters and listing are implemented. |
| FR-002.2 | Allocate an available room and update occupancy | Partial | UT-09, IT-16, ST-01 | Allocation logic is in place, but the full Sprint 1 end-to-end check remains limited to the available merged work. |
| FR-002.3 | No allocation beyond capacity | Partial | UT-10, IT-14, ST-02 | Capacity checks are implemented; full concurrency validation remains dependent on final end-to-end execution. |
| FR-002.4 | One active allocation per student | Partial | UT-11, IT-16 | Guardrails exist, but final evidence is still being completed as the feature set matures. |
| FR-002.5 | Reallocate a student to another room | Not runnable | IT-03, IT-14, IT-16 | This feature is scheduled for the next workstream; the Sprint 1 branch does not claim it as complete. |
| FR-002.6 | Vacate a room with confirmation | Not runnable | IT-04, IT-15, IT-16 | Confirmation and vacate flow were not part of the Sprint 1 feature set that was merged. |
| FR-003.1 | Set fee due and due date; record payments and balance | Not started | UT-32, UT-12, UT-13, ST-03 | Fee management is outside the Sprint 1 implementation already merged. |
| FR-003.2 | Paid / Partially Paid / Due status | Not started | UT-14, UT-15, IT-06 | No merged Sprint 1 implementation exists for this feature set. |
| FR-003.3 | Due-date notification within 7 days (if enabled) | Not started | IT-07, IT-17 | Requires the fee-tracking feature and a configured SMTP environment. |
| FR-003.4 | Reject zero, negative or excessive payments | Not started | UT-16, UT-33, UT-34 | Payment validation is not yet implemented in the Sprint 1 merged branch. |
| FR-004.1 | One open complaint per category | Not started | UT-17, UT-18, UT-19, UT-35, IT-20 | Complaint management is planned for later sprint work. |
| FR-004.2 | Admin status and remarks update | Not started | UT-20, UT-36, UT-37, UT-21, ST-04 | No merged complaint-status implementation exists yet. |
| FR-004.3 | Complaint history with timestamps | Not started | IT-08, ST-04 | Pending the complaint workflow. |
| FR-005.1 | Leave request submission | Not started | UT-22, UT-23, UT-38, ST-05 | Leave workflow is not part of the merged Sprint 1 scope. |
| FR-005.2 | Leave approval or rejection; student views status | Not started | UT-24, UT-25, IT-22, ST-05 | Pending later work. |
| FR-005.3 | Visitor entry and exit log | Not started | UT-26, UT-27, UT-39, UT-40 | Visitor tracking is not yet implemented. |
| FR-005.4 | Admin dashboard summary | Not started | IT-09 | Dashboard summary is excluded from the merged Sprint 1 scope. |
| FR-005.5 | Export as CSV and PDF | Not started | IT-10, IT-11, IT-21 | Reporting is scheduled for a later sprint. |
| NFR-001.a | Standard page load within 3 seconds | Not runnable | NFR-01 | Requires deployment or a stable browser-perf test environment. |
| NFR-001.b | At least 200 concurrent users | Not runnable | NFR-04 | Load testing needs a proper runtime environment and benchmarking setup. |
| NFR-002.a | Password hashing | Verified | NFR-02 | Password hashing is in the implementation and verified by the security checks. |
| NFR-002.b | Role-based access control; students see only their own records | Partial | IT-05, UT-21, IT-18, IT-19, IT-21 | RBAC is implemented and partially validated, but the full set of access-control tests is still pending final execution. |
| NFR-002.c | Session expiry after 30 minutes of inactivity | Verified | NFR-03, NFR-05 | Session expiry is implemented and default configuration is documented. |

## Test cases that cannot yet run

The following cases are intentionally listed as not runnable for Sprint 1 because the corresponding feature is not merged or the environment required to execute it is unavailable:

| Test IDs | Reason |
| --- | --- |
| IT-03, IT-04, IT-14, IT-15, IT-16 | Reallocation and vacate logic are not yet part of the Sprint 1 merged feature set. |
| UT-12 to UT-34 | Fee tracking and payment validation are planned for the next sprint; the fee workflow is not implemented yet. |
| UT-17 to UT-21, UT-35 to UT-37, IT-08, IT-20, ST-04 | Complaint management is still outstanding. |
| UT-22 to UT-27, UT-38 to UT-40, IT-09, IT-10, IT-11, IT-21, ST-05 | Leave, visitor logging, dashboard and reporting features remain for later work. |
| NFR-01, NFR-04 | Performance and concurrency tests need a deployed or benchmarked environment and were not part of the Sprint 1 merge. |

## Review of merged PR traceability

The Sprint 1 merged pull requests are expected to include both the linked requirement IDs and the relevant test IDs in the PR description. The current working convention is consistent with the team process described in `README.md` and the merged Sprint 1 PRs examined for this issue include the relevant requirement/test references in their descriptions.

Examples from the Sprint 1 branch:
- PR #85: FR-001.1, FR-001.2 and UT-01 to UT-05, UT-28
- PR #87: FR-001.3, NFR-002 and UT-06, UT-07, UT-29, UT-30, IT-01, IT-02, NFR-05
- PR #88: FR-002.1 and UT-08, UT-31
- PR #90: FR-001.1, FR-001.2 and the UI test IDs used for the registration page

This is the traceability record that should be used during Sprint 1 review and before promoting the work to the next integration stage.

## Final Sprint 1 status

The merged Sprint 1 work covers the authentication, registration and room-availability foundations, with several of the functional and non-functional checks already mapped to real test IDs. The remaining requirement groups continue to be explicitly marked as not runnable until their implementation and test evidence are complete.
