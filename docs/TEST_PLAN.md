# Hostel Management System — Test Plan Document

**Version:** 1.1
**Project:** Hostel Management System (HMS)
**Team:** Team 3, Class 5-J — Raiesh Giriyapanavar, Chiranthan Sathrasala, Neha K S, Harsh M
**Prepared by:** Chiranthan Sathrasala (QA execution: Raiesh Giriyapanavar)
**Date:** 14 October 2026
**Reference documents:** SRS v1.1 (14 Oct 2026), SAD v1.0 (SAD v1.1 pending), Test Plan v1.0 (submitted baseline, retained unchanged)

**Instructions followed:**
1. At least 8–10 test cases for every functional requirement group, covering Unit (UT), Integration (IT) and System (ST) testing, with both valid and invalid inputs.
2. The **Actual Result** and **Test Result** columns are left blank. They are filled in only after a test has actually been executed.

---

## Revision History

| Name | Date | Reason for changes | Version |
| --- | --- | --- | --- |
| Chiranthan Sathrasala | 06-Sep-2026 | Initial Test Plan (46 test cases) | 1.0 |
| Team 3 | 14-Oct-2026 | Aligned with SRS v1.1 and the MERN/MongoDB stack; added missing cases; corrected test data; real traceability matrix; corrected case count. v1.0 is retained as the submitted baseline and is unaffected by this execution update. | 1.1 |

## Summary of Changes in v1.1

| # | Problem in v1.0 | Change in v1.1 |
| --- | --- | --- |
| 1 | Case count stated as 47, actual was 46 | Count recomputed and shown in Section 7 (73 cases) |
| 2 | FR-004 had 7 cases (template asks for 8–10); FR-001 had no system test | FR-004 now has 11 cases and FR-001 has a system test (ST-06) |
| 3 | No test for login by email | UT-29 added |
| 4 | USNs were written as `PES1UG23CS001`; SRS Appendix B said 10 characters | USN is now 13 characters (`PES1UG24CS###`, SRS v1.1); malformed-USN test UT-28 added |
| 5 | Fixed dates in September 2026, now in the past | All dates are relative to the execution date **D** (D+3 means three days after the run) |
| 6 | 15-minute lockout and 30-minute session expiry impractical to test | Durations are configuration values; tests run in test mode (1 minute); NFR-05 checks the defaults |
| 7 | ST-02 relied on "two admins" clicking at the same time | ST-02 is a script that fires two parallel requests and is repeated 20 times |
| 8 | Reallocate and vacate (IT-03, IT-04) had no requirement | Mapped to FR-002.5 and FR-002.6; negative and confirmation cases IT-14 and IT-15 added |
| 9 | No test for a student reading another student's data | IT-18, IT-19 (and IT-21 for reports) added |
| 10 | No overpayment or zero-payment test; no way to set the fee due | UT-32 (set fee due), UT-33 (zero) and UT-34 (overpayment) added |
| 11 | Complaint cases missing for empty description, invalid status, Rejected with remarks | UT-35, UT-36, UT-37 and IT-20 added |
| 12 | NFR-001 (200 users) was excluded from the plan | NFR-04 added: scripted load test; results are reported honestly |
| 13 | Notification test had no tooling and no negative case | IT-07 uses a test SMTP inbox; IT-17 covers "not due" and "service disabled" |
| 14 | Visitor test said "Admin/security" | Visitor logging is admin-only (SRS v1.1); UT-39 and UT-40 added |
| 15 | Traceability used group labels ("FR001 test cases") | Section 6 maps every requirement to real test IDs |
| 16 | CSV and PDF were both tested but the stack was undefined | IT-10 and IT-11 retained; both formats are in scope |

---

## 1. Test Approach and Environment

| Item | Description |
| --- | --- |
| Test levels | **UT:** one rule or screen in isolation (validation, single endpoint). **IT:** several modules or a module and the database together. **ST:** a complete user flow across screens and systems. |
| Stack under test | React front end, Node.js/Express REST API, MongoDB (local or Atlas). Automated tests use a separate test database. |
| Tools | Browser (Chrome), Postman or curl for direct API calls, MongoDB Compass for database inspection, Ethereal or Mailtrap as the test SMTP inbox, k6 or autocannon for load testing, and the code repository itself for evidence capture. |
| Test mode | Set `LOCKOUT_MINUTES=1` and `SESSION_TIMEOUT_MINUTES=1` in the test environment. The defaults (5 attempts, 15 minutes, 30 minutes) are verified separately by NFR-05. |
| Reset between runs | Re-run the seed script to restore the data described in Section 2. |
| Result recording | Test Result is **Pass** or **Fail** only after execution. Every Fail is logged as a GitHub Issue (label `bug`) that names the test case ID. |
| Verification status | In the final report a requirement is **Verified** (executed, evidence recorded), **Failed**, **Not tested**, or **Limited by environment** (executed, but the environment contributed to the result). |

## 2. Test Data Conventions

| Convention | Description |
| --- | --- |
| Execution date **D** | The date on which the test is run. D+3 means three days later, D−1 one day earlier. |
| Seeded admin | `admin@pes.edu`, password `Admin@123` (Warden/Admin) |
| Seeded students | `PES1UG24CS001` to `PES1UG24CS020`, email `student001@pes.edu` to `student020@pes.edu`, password `Pass@123`. Seeded students have no room allocation and no fee record unless a prior test creates one. |
| Unregistered USNs | `PES1UG24CS901` and above are not in the seed data and are used for registration tests. |
| Dedicated students | Tests that lock accounts or change shared state use their own student, as named in the test data, so that tests do not interfere with each other. |
| Rooms | Example codes (A-204 triple, A-205, B-101, C-110, A-101 full) are assumed to come from the seed script (story HMS-26). If the seed data uses different codes, update the Test data column to match the actual DB state. |
| Messages | Error messages are the wording agreed in this plan. If the UI wording differs, record the difference in Actual Result and agree whether the plan or the UI changes. |
| Placeholders | `<n>` in a message is the configured number (for example, the lockout minutes). |

---

## 3. Functional Test Cases

### FR-001: Student Registration and Login

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-01 | User Registration | Register a new student with all valid mandatory fields | System running; seed data loaded; USN PES1UG24CS901 not registered | 1. Open the registration page 2. Enter USN, name, email, phone, password and confirm password 3. Submit | USN: PES1UG24CS901, email: newstudent901@pes.edu, phone: 90000900901, password: Pass@123 | Account created; success message; user can log in | Passed as expected | Pass |
| UT-02 | User Registration | Reject registration with a USN that already exists | Seeded student PES1UG24CS001 exists | 1. Open the registration page 2. Enter existing USN with valid other details 3. Submit | USN: PES1UG24CS001 | Validation error; no duplicate user created | Passed as expected | Pass |
| UT-03 | User Registration | Reject registration with an email that already exists | Seeded student with email student001@pes.edu exists | 1. Submit a duplicate email with valid other details | Email: student001@pes.edu | Validation error; no duplicate record | Passed as expected | Pass |
| UT-04 | User Registration | Reject registration with a mandatory field missing | System running | 1. Leave a mandatory field blank 2. Submit | Phone blank | Validation error; registration blocked | Passed as expected | Pass |
| UT-05 | User Registration | Reject registration with an invalid email format | System running | 1. Enter malformed email 2. Submit | Email: invalid-email | Validation error; registration blocked | Passed as expected | Pass |
| UT-28 | User Registration | Reject registration with a malformed USN (wrong length or illegal character) | System running | 1. Submit several malformed USNs | PES1UG24CS99, PES1UG24CS@01, etc. | Validation error; no new account | Passed as expected | Pass |
| UT-06 | User Login | Log in with a correct USN and password | Seeded student PES1UG24CS001 exists | 1. Open the login page 2. Enter USN and password 3. Click Submit | USN: PES1UG24CS001, Password: Pass@123 | Login succeeds; session created | Passed as expected | Pass |
| UT-29 | User Login | Log in with a correct email and password | Seeded student PES1UG24CS001 exists | 1. Open the login page 2. Enter email instead of USN 3. Submit | Email: student001@pes.edu, Password: Pass@123 | Login succeeds | Passed as expected | Pass |
| UT-07 | User Login | Reject login with an incorrect password | Seeded student PES1UG24CS001 exists | 1. Use a wrong password | Password: WrongPass! | Error message; no login | Passed as expected | Pass |
| UT-30 | User Login | Log out ends the session | Student logged in | 1. Click Logout 2. Press the browser Back button 3. Call GET /api/auth/me with the old session cookie | USN: PES1UG24CS001 | User is no longer authenticated | Passed as expected | Pass |
| IT-01 | User Login | Account lock after 5 consecutive failed logins | Seeded student PES1UG24CS010 exists and is not locked; test mode on | 1. Attempt login with wrong password five times in a row | USN: PES1UG24CS010 | Account locked; message indicates lockout | Passed as expected | Pass |
| IT-02 | User Login | A locked account cannot log in during the lockout window | Account PES1UG24CS010 was locked by IT-01 less than 1 minute ago | 1. Wait about 30 seconds 2. Attempt login with the correct password | USN: PES1UG24CS010, Password: Pass@123 | Login rejected until lockout expires | Passed as expected | Pass |
| IT-12 | User Login | Lockout expires and the failed-attempt counter resets | Test mode on (lockout 1 minute); account PES1UG24CS010 locked as in IT-01; seeded student PES1UG24CS013 not locked | 1. Wait until lockout window ends 2. Log in again | USN: PES1UG24CS010 | Lockout clears; retries reset | Passed as expected | Pass |
| IT-13 | User Login | The error for an unknown user does not reveal whether the account exists | Seeded student PES1UG24CS001 exists; PES1UG24CS999 does not | 1. Log in with the unknown USN and a wrong password 2. Compare the response with the real-user login error | USN: PES1UG24CS999 | Same generic response for unknown and wrong-password accounts | Passed as expected | Pass |
| ST-06 | Registration to Login (End-to-end) | New student registers, logs in, views the dashboard and logs out | System running; PES1UG24CS904 not registered | 1. Register a new student 2. Log in 3. Check the dashboard 4. Log out | New student account | Full flow completes successfully | Passed as expected | Pass |

### FR-002: Room Allocation Management

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-08 | Room Allocation | View room availability filtered by block, floor and sharing type (FR-002.1) | Admin logged in; rooms seeded | 1. Open the Rooms screen 2. Select block, floor and sharing type | Block A, floor 1, shared | Only matching rooms are displayed | Passed as expected | Pass |
| UT-31 | Room Allocation | Filters that match nothing, or no filters, are handled gracefully | Admin logged in; rooms seeded | 1. Open the Rooms screen 2. Apply a filter with no matching rooms 3. Retry without filters | Unused combination or no filter | Empty state or full list, without crash | Passed as expected | Pass |
| UT-09 | Room Allocation | Allocate an available room to a registered, unallocated student (FR-002.2) | Admin logged in; PES1UG24CS001 has no active allocation; room A-204 (capacity 3) has a vacancy | 1. Select the student 2. Choose a room 3. Submit | Student PES1UG24CS001, room A-204 | Allocation created; occupancy increments | Passed as expected | Pass |
| UT-10 | Room Allocation | Reject allocation to a room at maximum occupancy (FR-002.3) | Admin logged in; room A-101 (capacity 2) has 2 active allocations; PES1UG24CS006 unallocated | 1. Select the student 2. Attempt to allocate to full room | Student PES1UG24CS006, room A-101 | Error returned; occupancy unchanged | Passed as expected | Pass |
| UT-11 | Room Allocation | Reject a second active allocation for the same student (FR-002.4) | Admin logged in; PES1UG24CS001 is already allocated to A-204 (UT-09) | 1. Select the same student 2. Attempt another allocation | Student PES1UG24CS001, new room | Error returned; existing allocation maintained | Passed as expected | Pass |
| IT-05 | Room Allocation | A student account cannot allocate rooms (NFR-002.b) | Logged in as a student; room with a vacancy exists | 1. Send POST /api/allocations with the student's session 2. Submit | Student session, room A-205 | Permission denied; no allocation created | Passed as expected | Pass |
| IT-16 | Room Allocation | Occupancy always equals the number of active allocations | Seeded database; test environment with the consistency-check script | 1. Run a sequence: allocate, reallocate, vacate 2. Check room occupancy and allocation counts | Sequence of room change actions | Occupancy matches active allocations exactly | Passed as expected | Pass |
| ST-01 | Room Allocation (End-to-end) | Allocation seen from admin and student sides | Admin account and unallocated student PES1UG24CS002 exist; room A-205 has a vacancy | 1. Admin allocates room 2. Student logs in 3. Checks status | Admin + student sessions | Student sees the room assignment and admin sees the occupancy update | Passed as expected | Pass |
| ST-02 | Room Allocation (Concurrency) | Two parallel requests for the last bed: only one succeeds | Room C-110 has exactly 1 vacant bed; PES1UG24CS003 and PES1UG24CS004 unallocated; a script that fires two parallel requests | 1. Run the ST-02 script 2. Inspect room occupancy | Last-bed race | Only one request succeeds; occupancy remains 1 | Passed as expected | Pass |

### FR-003: Fee Payment and Tracking

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-32 | Fee Tracking | Admin sets the fee amount due and due date (FR-003.1) | Admin logged in; PES1UG24CS001 has no fee record | 1. Open the Fees screen 2. Select the student 3. Enter the amount and date 4. Save | Amount due: 50000, due date: D+7 | Fee record created with the date and balance |  |  |
| UT-12 | Fee Tracking | Record a full payment (FR-003.1) | Admin logged in; PES1UG24CS001 has a fee record with 50000 due (UT-32) | 1. Select the student 2. Enter the payment amount and date 3. Submit | Amount Paid: 50000 | Balance reaches zero; status becomes Paid |  |  |
| UT-13 | Fee Tracking | Record a partial payment (FR-003.1) | Admin logged in; PES1UG24CS002 has a fee record with 50000 due | 1. Select the student 2. Enter a payment smaller than the balance 3. Submit | Amount Paid: 30000 | Balance reduced to 20000; status remains Due |  |  |
| UT-14 | Fee Tracking | Status shows "Paid" when the balance is zero (FR-003.2) | PES1UG24CS001 has paid the full amount (UT-12) | 1. Open the student's fee record 2. Read the status field | Amount Paid: 50000 | Status shows Paid |  |  |
| UT-15 | Fee Tracking | Status shows "Due" when no payment is recorded (FR-003.2) | PES1UG24CS003 has a fee record with 50000 due and no payments | 1. Open the student's fee record 2. Read the status field | No payment record | Status shows Due |  |  |
| UT-16 | Fee Tracking | Reject a negative payment (FR-003.4) | Admin logged in; PES1UG24CS003 has an outstanding balance | 1. Select the student 2. Enter a negative amount 3. Submit | Amount Paid: -1000 | HTTP 400; validation error |  |  |
| UT-33 | Fee Tracking | Reject a zero payment (FR-003.4) | Admin logged in; PES1UG24CS003 has an outstanding balance | 1. Select the student 2. Enter 0 3. Submit | Amount Paid: 0 | HTTP 400; validation error |  |  |
| UT-34 | Fee Tracking | Reject an overpayment and accept a payment equal to the balance (FR-003.4) | Admin logged in; PES1UG24CS002 has an outstanding balance of 30000 (UT-13) | 1. Submit a payment larger than the balance 2. Submit a payment equal to the balance | Amount Paid: 50000 then 30000 | First is rejected; second is accepted |  |  |
| IT-06 | Fee Tracking | Student dashboard shows the updated fee status after an admin payment (FR-003.2) | PES1UG24CS004 has a fee record with 50000 due, status "Due" | 1. Admin records a payment 2. Student reloads dashboard | Payment amount: 25000 | Student sees updated balance and status |  |  |
| IT-07 | Fee Tracking | Notification for a fee due within 7 days (FR-003.3) | Test SMTP (Ethereal or Mailtrap) configured in the SMTP_* variables; PES1UG24CS005 has an outstanding balance | 1. Set the due date to D+5 and run the batch job 2. Check the inbox | Due date: D+5 | Notification sent |  |  |
| IT-17 | Fee Tracking | No notification when the due date is far away or the service is disabled (FR-003.3) | PES1UG24CS006 has an outstanding balance | 1. Set the due date to D+20 and run the job 2. Disable the service and run again | D+20 or disabled service | No notification expected |  |  |
| ST-03 | Fee Tracking (End-to-end) | Admin sets the fee and records a payment; the student verifies | Admin logged in; PES1UG24CS007 has no fee record | 1. Admin sets the amount due and due date 2. Admin records a payment 3. Student checks status | Student and admin sessions | Status updates on both sides |  |  |

### FR-004: Complaint Management

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-17 | Complaint Management | Submit a complaint with a category and description (FR-004.1) | Student PES1UG24CS001 logged in; no open complaint in this category | 1. Open Raise Complaint 2. Select a category 3. Submit description | Category: Electrical, description: Light not working | Complaint submitted and visible | Passed as expected | Pass |
| UT-18 | Complaint Management | Reject a second open complaint in the same category (FR-004.1) | Student has an open Electrical complaint (UT-17) | 1. Open Raise Complaint 2. Select Electrical again 3. Submit | Category: Electrical | Error shown; no second complaint stored | Passed as expected | Pass |
| UT-19 | Complaint Management | A complaint in a different category is allowed (FR-004.1) | Student has an open Electrical complaint | 1. Open Raise Complaint 2. Select Plumbing 3. Enter description | Category: Plumbing | Complaint accepted | Passed as expected | Pass |
| UT-35 | Complaint Management | Reject a complaint with an empty description (FR-004.1) | Student logged in | 1. Open Raise Complaint 2. Select a category 3. Leave the description blank, then submit | Blank description | Validation error; no complaint created | Passed as expected | Pass |
| UT-20 | Complaint Management | Admin updates status to In Progress and then Resolved with remarks (FR-004.2) | Admin logged in; an open Electrical complaint exists (UT-17) | 1. Select the complaint 2. Set status to In Progress 3. Set to Resolved with remarks | Remarks: "Repaired" | Status changes and remarks recorded |  |  |
| UT-36 | Complaint Management | Admin rejects a complaint; remarks are required (FR-004.2) | Admin logged in; an open Plumbing complaint exists (UT-19) | 1. Set the status to Rejected with blank remarks 2. Retry with remarks | Remarks blank, then "Not valid" | Rejected request requires remarks |  |  |
| UT-37 | Complaint Management | Reject an invalid status value (FR-004.2) | Admin logged in; an open complaint exists | 1. Send PUT /api/complaints/{id} with a status that is not allowed | Status: "Pending" or invalid enum | Validation error; no update |  |  |
| UT-21 | Complaint Management | A student account cannot update complaint status (NFR-002.b) | Logged in as a student; a complaint exists | 1. Send PUT /api/complaints/{id} with the student's session | Student session, status change | Permission denied |  |  |
| IT-08 | Complaint Management | Student views complaint history with timestamps (FR-004.3) | Student has complaints with status changes (UT-17, UT-19, UT-20) | 1. Student logs in 2. Opens Complaint History 3. Reads timestamps | Existing complaint history | History includes status changes with timestamps |  |  |
| IT-20 | Complaint Management | A new complaint is allowed once the earlier one is no longer open (FR-004.1) | Student has an Electrical complaint | 1. With the complaint In Progress, submit another complaint in the same category 2. Then resolve it and retry | Same category after status change | Allowed only after complaint is no longer open | Passed as expected | Pass |
| ST-04 | Complaint Management (End-to-end) | Student submits, admin resolves, student verifies | Student logged in; no open Water Supply complaint | 1. Student submits complaint 2. Admin opens it and resolves 3. Student verifies update | Complaint flow | Complaint lifecycle is visible to both sides |  |  |

### FR-005: Leave, Visitor, Dashboard and Reports

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-22 | Leave Management | Submit a leave request with valid dates and reason (FR-005.1) | Student PES1UG24CS001 logged in | 1. Open Leave Request 2. Enter start date, end date and reason 3. Submit | Start: D+3, End: D+5, Reason: Family visit | Request created |  |  |
| UT-23 | Leave Management | Reject a leave request whose end date is before the start date (FR-005.1) | Student logged in | 1. Open Leave Request 2. Enter an end date earlier than the start date 3. Submit | Start: D+5, End: D+3 | Validation error; request not created |  |  |
| UT-38 | Leave Management | Reject a leave request with no reason (FR-005.1) | Student logged in | 1. Open Leave Request 2. Enter valid dates and leave the reason blank 3. Submit | Start: D+3, End: D+5, Reason blank | Validation error |  |  |
| UT-24 | Leave Management | Admin approves a pending leave request (FR-005.2) | Admin logged in; the pending request from UT-22 exists | 1. Select the request 2. Click Approve | Leave request from PES1UG24CS001 | Request moves to Approved |  |  |
| UT-25 | Leave Management | Admin rejects a pending leave request (FR-005.2) | Admin logged in; a pending request from PES1UG24CS002 exists | 1. Select the request 2. Click Reject | Leave request from PES1UG24CS002 | Request moves to Rejected |  |  |
| IT-22 | Leave Management | A leave request that is already decided cannot be decided again (FR-005.2) | Admin logged in; a request already "Approved" (UT-24) | 1. Send PUT /api/leaves/{id}/decide again | Already approved request | Second decision rejected |  |  |
| UT-26 | Visitor Management | Admin logs a visitor entry with all required fields (FR-005.3) | Admin logged in | 1. Open Visitor Log 2. Enter visitor name, contact, purpose, student visited and time in | Visitor details valid | Visitor entry created | Passed as expected | Pass |
| UT-39 | Visitor Management | Reject a visitor entry with a missing or invalid field (FR-005.3) | Admin logged in | 1. Submit an entry with the name blank 2. Submit an entry with a non-numeric contact | Blank name or invalid phone | Validation error; no entry created | Passed as expected | Pass |
| UT-27 | Visitor Management | Admin logs the exit time of an existing visitor (FR-005.3) | A visitor entry without an exit time exists (UT-26) | 1. Select the entry 2. Enter the exit time 3. Submit | Exit time: D 18:00 | Exit time saved | Passed as expected | Pass |
| UT-40 | Visitor Management | Reject an exit time earlier than the entry time (FR-005.3) | A visitor entry with entry time D 10:00 and no exit | 1. Select the entry 2. Enter an earlier exit time 3. Submit | Exit time before entry time | Validation error; exit not saved | Passed as expected | Pass |
| IT-09 | Admin Dashboard | Dashboard totals match the data and change correctly (FR-005.4) | Seeded data plus allocations, fee records and complaints from earlier tests; Compass open | 1. Open the dashboard 2. Compare totals against database values | Existing room, fee and complaint data | Dashboard matches the underlying records |  |  |
| IT-10 | Reports | Export reports as CSV (FR-005.5) | Admin logged in; report data exists | 1. Open Reports 2. Select the report 3. Click "Export as CSV" 4. Open the file and compare with the DB | CSV export | File is created and accurate |  |  |
| IT-11 | Reports | Export reports as PDF (FR-005.5) | Admin logged in; report data exists | 1. Open Reports 2. Select the report 3. Click "Export as PDF" 4. Open the file and compare it with the DB | PDF export | File is created and accurate |  |  |
| IT-21 | Reports | A student or an unauthenticated user cannot export reports or read the visitor list (NFR-002.b) | Student logged in; a second request without any session | 1. As the student, attempt export 2. Repeat without session | Student session and unauthenticated request | Access denied |  |  |
| ST-05 | Leave Management (End-to-end) | Student submits leave, admin approves, student verifies | Student logged in | 1. Student submits a leave request 2. Admin approves it 3. Student opens the leave list | Student + admin sessions | Student sees the final approved state |  |  |

---

## 4. Cross-Cutting Access Control Cases (NFR-002.b)

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IT-18 | Access Control | A student cannot read another student's dashboard or fee data | Student PES1UG24CS001 logged in; PES1UG24CS002 has a fee record and a dashboard | 1. Call GET /api/student/{id}/dashboard and GET /api/student/{id}/fees for student 2 2. Inspect the response | Student 1 and student 2 different accounts | Access denied; the student is blocked from another student's records | Passed as expected | Pass |
| IT-19 | Access Control | A student sees only their own complaints and leave requests | PES1UG24CS001 and PES1UG24CS002 each have complaints and leave requests | 1. As PES1UG24CS001, call GET /api/complaints/mine and GET /api/leaves/mine 2. Compare the returned records | Student 1 and student 2 accounts | Only the logged-in student's records are visible | Passed as expected | Pass |

---

## 5. Nonfunctional Requirement Checks

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFR-01 | Performance (NFR-001.a) | Standard pages load within 3 seconds | Application deployed and reachable; seeded data loaded; one user, normal conditions | 1. Open each page with the browser 2. Measure page load times | Standard seeded data | Load times are within 3 seconds |  |  |
| NFR-04 | Performance (NFR-001.b) | Load test with 200 concurrent users | Application deployed in the best available environment; k6 or autocannon installed; at least 20 seeded accounts | 1. Run the load test script 2. Capture metrics | 200 virtual users | Test passes or fails with honest reporting |  |  |
| NFR-02 | Security (NFR-002.a) | Passwords are stored as a hash, never in plaintext | Database access (Compass) in a test environment | 1. Register a test user 2. Open the users collection in Compass 3. Inspect the password field | New test account | Password is hashed; plaintext is not stored | Passed as expected | Pass |
| NFR-03 | Security (NFR-002.c) | The session expires after inactivity | Test mode: SESSION_TIMEOUT_MINUTES=1; student logged in | 1. Perform an action at about 40 seconds and check the session status | Session timeout set to 1 minute | Session expires after inactivity | Passed as expected | Pass |
| NFR-05 | Configuration (FR-001.3, NFR-002.c) | The lockout and session settings default to 5 attempts, 15 minutes and 30 minutes | Access to the repository and a test environment | 1. Start the app without overrides 2. Confirm the values in the config and runtime | Default config values | Defaults remain 5 attempts, 15 minutes, 30 minutes | Passed as expected | Pass |

---

## 6. Requirements Traceability Matrix (Test Plan v1.1)

Every requirement in SRS v1.1 maps to at least one test case below. This table replaces the group labels (for example "FR001 test cases") used in the earlier documents and is the source for SRS acceptance checklists.

| Requirement ID | Description | Test Case IDs |
| --- | --- | --- |
| FR-001.1 | Student registration with required details | UT-01, UT-04, UT-05, UT-28, ST-06 |
| FR-001.2 | USN and email uniqueness | UT-02, UT-03 |
| FR-001.3 | Login by USN or email; lockout after 5 failures for 15 minutes | UT-06, UT-07, UT-29, UT-30, IT-01, IT-02, IT-12, IT-13, ST-06, NFR-05 |
| FR-002.1 | Room availability by block, floor, sharing type | UT-08, UT-31 |
| FR-002.2 | Allocate a room and update occupancy | UT-09, IT-16, ST-01 |
| FR-002.3 | No allocation beyond capacity | UT-10, IT-14, ST-02 |
| FR-002.4 | One active allocation per student | UT-11, IT-16 |
| FR-002.5 | Reallocate a student to another room | IT-03, IT-14, IT-16 |
| FR-002.6 | Vacate a room with confirmation | IT-04, IT-15, IT-16 |
| FR-003.1 | Set fee due and due date; record payments and balance | UT-32, UT-12, UT-13, ST-03 |
| FR-003.2 | Paid / Partially Paid / Due status | UT-14, UT-15, IT-06 |
| FR-003.3 | Due-date notification within 7 days (if enabled) | IT-07, IT-17 |
| FR-003.4 | Reject zero, negative or excessive payments | UT-16, UT-33, UT-34 |
| FR-004.1 | One open complaint per category | UT-17, UT-18, UT-19, UT-35, IT-20 |
| FR-004.2 | Admin status and remarks update | UT-20, UT-36, UT-37, UT-21, ST-04 |
| FR-004.3 | Complaint history with timestamps | IT-08, ST-04 |
| FR-005.1 | Leave request submission | UT-22, UT-23, UT-38, ST-05 |
| FR-005.2 | Leave approval or rejection; student views status | UT-24, UT-25, IT-22, ST-05 |
| FR-005.3 | Visitor entry and exit log | UT-26, UT-27, UT-39, UT-40 |
| FR-005.4 | Admin dashboard summary | IT-09 |
| FR-005.5 | Export reports as CSV and PDF | IT-10, IT-11, IT-21 |
| NFR-001.a | Standard page load within 3 seconds | NFR-01 |
| NFR-001.b | At least 200 concurrent users | NFR-04 |
| NFR-002.a | Password hashing | NFR-02 |
| NFR-002.b | Role-based access control; students see only their own records | IT-05, UT-21, IT-18, IT-19, IT-21 |
| NFR-002.c | Session expiry after 30 minutes of inactivity | NFR-03, NFR-05 |

---

## 7. Test Case Summary

| Group | UT | IT | ST | NFR | Total |
| --- | --- | --- | --- | --- | --- |
| FR-001 Registration and Login | 10 | 4 | 1 | 0 | 15 |
| FR-002 Room Allocation | 5 | 6 | 2 | 0 | 13 |
| FR-003 Fee Tracking | 8 | 3 | 1 | 0 | 12 |
| FR-004 Complaints | 8 | 2 | 1 | 0 | 11 |
| FR-005 Leave, Visitor, Dashboard, Reports | 9 | 5 | 1 | 0 | 15 |
| Access control (cross-cutting) | 0 | 2 | 0 | 0 | 2 |
| Nonfunctional checks | 0 | 0 | 0 | 5 | 5 |
| **Total** | **40** | **22** | **6** | **5** | **73** |

---

## 8. Execution Schedule by Sprint

Test cases are run on `main` after the feature is merged. A case whose feature is not yet built is not run and is not marked Pass.

| Sprint | Test cases | Depends on |
| --- | --- | --- |
| Sprint 1 (19–23 Oct) | UT-01 to UT-07, UT-28 to UT-30, IT-01, IT-02, IT-12, IT-13, ST-06, UT-08, UT-31, UT-09 to UT-11, IT-05, ST-01, ST-02, NFR-02, NFR-03, NFR-05 | Registration, login, RBAC and room allocation |
| Sprint 2 (26–30 Oct) | IT-03, IT-04, IT-14, IT-15, IT-16, UT-12 to UT-16, UT-32 to UT-34, IT-06, IT-07, IT-17, ST-03, UT-17 to UT-21, UT-35 to UT-37, IT-08, IT-20, ST-04, UT-22 to UT-27, UT-39 to UT-40, IT-09 to IT-11, IT-21, ST-05, NFR-01, NFR-04 | Feature completion for fees, complaints, leave and reports |

Regression: after the Sprint 2 merge freeze, re-run all Sprint 1 cases that touch authentication and rooms (UT-06, UT-09, IT-01, IT-05, ST-01, IT-16) before the final results are recorded.

## 9. Assumptions and Open Points

| # | Item | Action |
| --- | --- | --- |
| 1 | Seed data (admin account, 20 students, example room codes) is assumed to match Section 2 | Confirm against the seed script and update the Test data column if it differs |
| 2 | Remarks are mandatory when an admin updates a complaint (UT-36), following "with remarks" in FR-004.2 | Confirm with the implementer; otherwise change UT-36 Set A |
| 3 | A leave request can be decided only once (IT-22) and an In Progress complaint counts as open (IT-20); neither is stated explicitly in the SRS | Confirm and, if kept, add a line to the SRS before release |
| 4 | The exact UI and API error messages are as written in this plan | Record any difference in Actual Result and decide whether the plan or the code changes |
| 5 | NFR-04 depends on the available hosting environment | Report measured figures and the environment; do not mark Pass without evidence |
| 6 | SAD v1.1 and the API contract are still to be updated for MongoDB and the new endpoints | Endpoint names used here (for example GET /api/complaints/mine, GET /api/leaves/mine, GET /api/auth/me) should be validated against the implementation |

---

**Team:** Team 3, Class 5-J
**Project:** Hostel Management System
