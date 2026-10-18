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
| Team 3 | 14-Oct-2026 | Aligned with SRS v1.1 and the MERN/MongoDB stack; added missing cases; corrected test data; real traceability matrix; corrected case count. v1.0 is retained as the submitted baseline. | 1.1 |

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
| Test levels | **UT:** one rule or screen in isolation (validation, single endpoint). **IT:** several modules or a module and the database together. **ST:** a complete user flow across screens and roles. |
| Stack under test | React front end, Node.js/Express REST API, MongoDB (local or Atlas). Automated tests use a separate test database. |
| Tools | Browser (Chrome), Postman or curl for direct API calls, MongoDB Compass for database inspection, Ethereal or Mailtrap as the test SMTP inbox, k6 or autocannon for load testing, and the consistency-check script (README Section 4.1). |
| Test mode | Set `LOCKOUT_MINUTES=1` and `SESSION_TIMEOUT_MINUTES=1` in the test environment. The defaults (5 attempts, 15 minutes, 30 minutes) are verified separately by NFR-05. |
| Reset between runs | Re-run the seed script to restore the data described in Section 2. |
| Result recording | Test Result is **Pass** or **Fail** only after execution. Every Fail is logged as a GitHub Issue (label `bug`) that names the test case ID. |
| Verification status | In the final report a requirement is **Verified** (executed, evidence recorded), **Failed**, **Not tested**, or **Limited by environment** (executed, but the environment could not fully demonstrate the target; this applies mainly to NFR-04). A requirement is never reported as passed without evidence. |

## 2. Test Data Conventions

| Convention | Description |
| --- | --- |
| Execution date **D** | The date on which the test is run. D+3 means three days later, D−1 one day earlier. |
| Seeded admin | `admin@pes.edu`, password `Admin@123` (Warden/Admin) |
| Seeded students | `PES1UG24CS001` to `PES1UG24CS020`, email `student001@pes.edu` to `student020@pes.edu`, password `Pass@123`. Seeded students have no room allocation and no fee record unless a test says otherwise. |
| Unregistered USNs | `PES1UG24CS901` and above are not in the seed data and are used for registration tests. |
| Dedicated students | Tests that lock accounts or change shared state use their own student, as named in the test data, so that tests do not interfere with each other. |
| Rooms | Example codes (A-204 triple, A-205, B-101, C-110, A-101 full) are assumed to come from the seed script (story HMS-26). If the seed data uses different codes, update the Test data column before execution. |
| Messages | Error messages are the wording agreed in this plan. If the UI wording differs, record the difference in Actual Result and agree whether the plan or the UI changes. |
| Placeholders | `<n>` in a message is the configured number (for example, the lockout minutes). |

---

## 3. Functional Test Cases

### FR-001: Student Registration and Login

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-01 | User Registration | Register a new student with all valid mandatory fields | System running; seed data loaded; USN PES1UG24CS901 not registered | 1. Open the registration page 2. Enter USN, name, email, phone and password 3. Click Submit | USN: PES1UG24CS901, Name: Ravi Kumar, Email: ravi.kumar@pes.edu, Phone: 9876543210, Password: Pass@123 | HTTP 201; account created; confirmation message "Registration successful" displayed; the password is not shown anywhere on the page | | |
| UT-02 | User Registration | Reject registration with a USN that already exists | Seeded student PES1UG24CS001 exists | 1. Open the registration page 2. Enter the existing USN with other valid fields 3. Click Submit | USN: PES1UG24CS001, Name: Ravi Kumar, Email: ravi.k2@pes.edu, Phone: 9876543210, Password: Pass@123 | HTTP 409; error message "USN already registered" displayed; no new account created | | |
| UT-03 | User Registration | Reject registration with an email that already exists | Seeded student with email student001@pes.edu exists | 1. Open the registration page 2. Enter the existing email with other valid fields 3. Click Submit | USN: PES1UG24CS902, Email: student001@pes.edu, other fields valid | HTTP 409; error message "Email already registered" displayed; no new account created | | |
| UT-04 | User Registration | Reject registration with a mandatory field missing | System running | 1. Open the registration page 2. Leave the phone number blank 3. Fill the remaining fields 4. Click Submit | USN: PES1UG24CS903, Phone: (blank), other fields valid | HTTP 400; error message "Phone number is required" displayed; no account created | | |
| UT-05 | User Registration | Reject registration with an invalid email format | System running | 1. Open the registration page 2. Enter a malformed email 3. Fill the remaining fields 4. Click Submit | USN: PES1UG24CS903, Email: ravi.pes.edu (no @), other fields valid | HTTP 400; error message "Enter a valid email address" displayed; no account created | | |
| UT-28 | User Registration | Reject registration with a malformed USN (wrong length or illegal character) | System running | 1. Open the registration page 2. Enter each USN data set in turn with other valid fields 3. Click Submit after each | Set A: PES1UG24CS90 (12 characters). Set B: PES1UG24CS9011 (14 characters). Set C: PES1UG24CS90# (13 characters, illegal character) | Each set rejected with HTTP 400 and message "Enter a valid USN (13 alphanumeric characters, for example PES1UG24CS924)"; no account created | | |
| UT-06 | User Login | Log in with a correct USN and password | Seeded student PES1UG24CS001 exists | 1. Open the login page 2. Enter USN and password 3. Click Submit | USN: PES1UG24CS001, Password: Pass@123 | HTTP 200; session established; student dashboard displayed | | |
| UT-29 | User Login | Log in with a correct email and password | Seeded student PES1UG24CS001 exists | 1. Open the login page 2. Enter the email instead of the USN, with the password 3. Click Submit | Email: student001@pes.edu, Password: Pass@123 | HTTP 200; session established; the same student's dashboard as in UT-06 is displayed | | |
| UT-07 | User Login | Reject login with an incorrect password | Seeded student PES1UG24CS001 exists | 1. Open the login page 2. Enter the USN with a wrong password 3. Click Submit | USN: PES1UG24CS001, Password: WrongPass1 | HTTP 401; message "Invalid credentials" displayed; failed-attempt counter for the user becomes 1 (check in Compass) | | |
| UT-30 | User Login | Log out ends the session | Student logged in | 1. Click Logout 2. Press the browser Back button 3. Call GET /api/auth/me with the old session cookie | USN: PES1UG24CS001 | Logout returns HTTP 200; after Back, the login page is shown and no protected data is displayed; GET /api/auth/me returns HTTP 401 | | |
| IT-01 | User Login | Account lock after 5 consecutive failed logins | Seeded student PES1UG24CS010 exists and is not locked; test mode on | 1. Attempt login with a wrong password five times in a row 2. Attempt a sixth login with the correct password | USN: PES1UG24CS010, wrong password: WrongPass1 (x5), then Pass@123 | Fifth failure locks the account; the sixth attempt (correct password) is rejected with HTTP 423 and message "Account locked. Try again in <n> minute(s)" | | |
| IT-02 | User Login | A locked account cannot log in during the lockout window | Account PES1UG24CS010 was locked by IT-01 less than 1 minute ago | 1. Wait about 30 seconds 2. Attempt login with the correct password 3. Attempt login with a wrong password | USN: PES1UG24CS010, Password: Pass@123, then WrongPass1 | Both attempts rejected with HTTP 423 while the lock is active; no session created | | |
| IT-12 | User Login | Lockout expires and the failed-attempt counter resets | Test mode on (lockout 1 minute); account PES1UG24CS010 locked as in IT-01; seeded student PES1UG24CS013 not locked | Part A: 1. Wait more than 1 minute after the lock 2. Log in with the correct password. Part B (CS013): 1. Enter a wrong password 4 times 2. Log in with the correct password 3. Enter a wrong password 4 times 4. Log in with the correct password | Part A: PES1UG24CS010 / Pass@123. Part B: PES1UG24CS013, WrongPass1 (x4), Pass@123, WrongPass1 (x4), Pass@123 | Part A: login succeeds (HTTP 200) after the lock expires. Part B: the account is never locked, because a successful login resets the counter; all correct-password logins succeed | | |
| IT-13 | User Login | The error for an unknown user does not reveal whether the account exists | Seeded student PES1UG24CS001 exists; PES1UG24CS999 does not | 1. Log in with the unknown USN and any password 2. Log in with the known USN and a wrong password 3. Compare the two responses | Unknown: PES1UG24CS999 / Pass@123. Known: PES1UG24CS001 / WrongPass1 | Both attempts return HTTP 401 with the identical message "Invalid credentials" | | |
| ST-06 | Registration to Login (End-to-end) | New student registers, logs in, views the dashboard and logs out | System running; PES1UG24CS904 not registered | 1. Register a new student 2. Log in with the USN and password 3. Check the student dashboard 4. Click Logout 5. Open the dashboard URL directly | USN: PES1UG24CS904, Name: Asha Rao, Email: asha.rao@pes.edu, Phone: 9123456780, Password: Pass@123 | Registration succeeds; login succeeds; the dashboard shows "No room allocated" and no fee record; after logout the dashboard URL redirects to the login page | | |

### FR-002: Room Allocation Management

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-08 | Room Allocation | View room availability filtered by block, floor and sharing type (FR-002.1) | Admin logged in; rooms seeded | 1. Open the Rooms screen 2. Select block, floor and sharing type 3. Apply the filters | Block: A, Floor: 2, Sharing: Triple | Only rooms matching all three filters are listed; each shows capacity, current occupancy and vacancy; full rooms are clearly marked | | |
| UT-31 | Room Allocation | Filters that match nothing, or no filters, are handled gracefully | Admin logged in; rooms seeded | 1. Open the Rooms screen 2. Apply a filter with no matching rooms 3. Clear all filters | Filter: Block Z. Then no filters | Block Z: message "No rooms found" and no error; no filters: all rooms are listed | | |
| UT-09 | Room Allocation | Allocate an available room to a registered, unallocated student (FR-002.2) | Admin logged in; PES1UG24CS001 has no active allocation; room A-204 (capacity 3) has a vacancy | 1. Select the student 2. Select room A-204 3. Confirm | Student: PES1UG24CS001, Room: A-204 | HTTP 201; allocation saved; room occupancy increases by 1; the student's room status shows A-204 | | |
| UT-10 | Room Allocation | Reject allocation to a room at maximum occupancy (FR-002.3) | Admin logged in; room A-101 (capacity 2) has 2 active allocations; PES1UG24CS006 unallocated | 1. Select the student 2. Select room A-101 3. Confirm | Student: PES1UG24CS006, Room: A-101 (full) | HTTP 409; message "Room at full capacity" displayed; occupancy unchanged; no allocation record created | | |
| UT-11 | Room Allocation | Reject a second active allocation for the same student (FR-002.4) | Admin logged in; PES1UG24CS001 is already allocated to A-204 (UT-09) | 1. Select the allocated student 2. Select a different room with a vacancy 3. Confirm | Student: PES1UG24CS001, Room: B-101 | HTTP 409; message "Student already has an active allocation" displayed; B-101 occupancy unchanged | | |
| IT-03 | Room Reallocation | Reallocate a student to another room (FR-002.5) | Admin logged in; PES1UG24CS001 allocated to A-204; B-101 has a vacancy | 1. Select the allocated student 2. Choose Reallocate 3. Select B-101 4. Confirm | Student: PES1UG24CS001, From: A-204, To: B-101 | A-204 occupancy decreases by 1; B-101 occupancy increases by 1; the old allocation is marked inactive; exactly one active allocation exists, pointing to B-101 | | |
| IT-14 | Room Reallocation | Reallocation to a full room is rejected and the original allocation is kept (FR-002.5, FR-002.3) | Admin logged in; PES1UG24CS001 allocated to B-101; room A-101 is full | 1. Select the student 2. Choose Reallocate 3. Select A-101 4. Confirm | Student: PES1UG24CS001, From: B-101, To: A-101 (full) | HTTP 409; message "Room at full capacity"; the allocation to B-101 is still active; occupancy of both rooms unchanged | | |
| IT-04 | Room Vacate | Vacate a student's room after confirmation (FR-002.6) | Admin logged in; PES1UG24CS001 allocated to B-101 | 1. Select the allocated student 2. Choose Vacate 3. Confirm in the confirmation dialog | Student: PES1UG24CS001, Room: B-101 | Confirmation dialog appears before the change; after confirming, B-101 occupancy decreases by 1, the allocation is marked inactive, and the student's room status shows "No room allocated" | | |
| IT-15 | Room Vacate | Vacating without confirmation changes nothing (FR-002.6) | Admin logged in; PES1UG24CS002 allocated to A-205 | 1. Choose Vacate, then Cancel in the dialog 2. Send the vacate API request without the confirm flag | Student: PES1UG24CS002, Room: A-205 | Cancel: no change. API without confirm flag: HTTP 400 with message "Confirmation required"; the allocation stays active and occupancy is unchanged | | |
| IT-05 | Room Allocation | A student account cannot allocate rooms (NFR-002.b) | Logged in as a student; room with a vacancy exists | 1. Send POST /api/allocations with the student's session 2. Check the student UI for allocation controls | Role: Student (PES1UG24CS001); body: {student: PES1UG24CS003, room: A-204} | HTTP 403 with a controlled error; no allocation created; occupancy unchanged; no allocation controls shown in the student UI | | |
| IT-16 | Room Allocation | Occupancy always equals the number of active allocations | Seeded database; test environment with the consistency-check script | 1. Run a sequence: allocate, reallocate, vacate, then three rejected attempts (full room, double allocation, unauthorized) 2. Run the consistency-check script | Students: PES1UG24CS001 to PES1UG24CS005; rooms: A-204, B-101, A-101 | The script reports 0 mismatches: for every room, stored occupancy equals the count of active allocations, and no student has more than one active allocation | | |
| ST-01 | Room Allocation (End-to-end) | Allocation seen from admin and student sides | Admin account and unallocated student PES1UG24CS002 exist; room A-205 has a vacancy | 1. Admin logs in 2. Selects the student 3. Filters and selects room A-205 4. Confirms the allocation 5. Admin logs out; the student logs in and opens the dashboard | Student: PES1UG24CS002, Room: A-205 | Allocation succeeds; the student dashboard shows room A-205 with correct details | | |
| ST-02 | Room Allocation (Concurrency) | Two parallel requests for the last bed: only one succeeds | Room C-110 has exactly 1 vacant bed; PES1UG24CS003 and PES1UG24CS004 unallocated; a script that sends two requests in parallel (for example with Promise.all or two background curl calls) | 1. Run the script, which sends two POST /api/allocations requests at the same moment with an admin session 2. Check responses and database 3. Reset the seed data and repeat 20 times | Room: C-110 (1 bed left); Students: PES1UG24CS003, PES1UG24CS004 | In every run exactly one request returns HTTP 201 and the other HTTP 409 "Room at full capacity"; occupancy equals capacity and is never exceeded; there is exactly one new active allocation | | |

### FR-003: Fee Payment and Tracking

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-32 | Fee Tracking | Admin sets the fee amount due and due date (FR-003.1) | Admin logged in; PES1UG24CS001 has no fee record | 1. Open the Fees screen 2. Select the student 3. Enter the amount due and due date 4. Submit | Student: PES1UG24CS001, Amount Due: 50000, Due Date: D+30 | HTTP 201; fee record created; outstanding balance 50000; status "Due"; due date saved | | |
| UT-12 | Fee Tracking | Record a full payment (FR-003.1) | Admin logged in; PES1UG24CS001 has a fee record with 50000 due (UT-32) | 1. Select the student 2. Enter the payment amount and date 3. Submit | Student: PES1UG24CS001, Amount Paid: 50000, Payment Date: D | Ledger updated; outstanding balance 0; the payment appears in the history with its date | | |
| UT-13 | Fee Tracking | Record a partial payment (FR-003.1) | Admin logged in; PES1UG24CS002 has a fee record with 50000 due | 1. Select the student 2. Enter a payment smaller than the balance 3. Submit | Student: PES1UG24CS002, Amount Due: 50000, Amount Paid: 20000, Date: D | Ledger updated; outstanding balance 30000; status "Partially Paid" | | |
| UT-14 | Fee Tracking | Status shows "Paid" when the balance is zero (FR-003.2) | PES1UG24CS001 has paid the full amount (UT-12) | 1. Open the student's fee record 2. Read the status field | Amount Due: 50000, Amount Paid: 50000 | Status displayed as "Paid" | | |
| UT-15 | Fee Tracking | Status shows "Due" when no payment is recorded (FR-003.2) | PES1UG24CS003 has a fee record with 50000 due and no payments | 1. Open the student's fee record 2. Read the status field | Amount Due: 50000, Amount Paid: 0 | Status displayed as "Due" | | |
| UT-16 | Fee Tracking | Reject a negative payment (FR-003.4) | Admin logged in; PES1UG24CS003 has an outstanding balance | 1. Select the student 2. Enter a negative amount 3. Submit | Amount Paid: -5000 | HTTP 400; message "Amount must be a positive value"; ledger unchanged | | |
| UT-33 | Fee Tracking | Reject a zero payment (FR-003.4) | Admin logged in; PES1UG24CS003 has an outstanding balance | 1. Select the student 2. Enter 0 3. Submit | Amount Paid: 0 | HTTP 400; message "Amount must be a positive value"; ledger unchanged | | |
| UT-34 | Fee Tracking | Reject an overpayment and accept a payment equal to the balance (FR-003.4) | Admin logged in; PES1UG24CS002 has an outstanding balance of 30000 (UT-13) | 1. Submit a payment above the balance 2. Submit a payment equal to the balance | Set A: 35000. Set B: 30000 | Set A: HTTP 400; message "Payment exceeds the outstanding balance (30000)"; ledger unchanged. Set B: accepted; balance 0; status "Paid" | | |
| IT-06 | Fee Tracking | Student dashboard shows the updated fee status after an admin payment (FR-003.2) | PES1UG24CS004 has a fee record with 50000 due, status "Due" | 1. Admin records a payment of 50000 2. The student logs in (or refreshes) and opens the dashboard | Student: PES1UG24CS004, Amount Paid: 50000 | Student dashboard shows "Paid" and balance 0 with no manual database change | | |
| IT-07 | Fee Tracking | Notification for a fee due within 7 days (FR-003.3) | Test SMTP (Ethereal or Mailtrap) configured in the SMTP_* variables; PES1UG24CS005 has an outstanding balance | 1. Set the fee due date to D+5 2. Run the notification job (script or admin trigger) 3. Open the test inbox | Student: PES1UG24CS005, Due Date: D+5, Balance: 50000 | One email is delivered to the student's address in the test inbox, stating the balance and due date | | |
| IT-17 | Fee Tracking | No notification when the due date is far away or the service is disabled (FR-003.3) | PES1UG24CS006 has an outstanding balance | 1. Set the due date to D+20 and run the job 2. Unset the SMTP_* variables, set a due date of D+3 and run the job again | Student: PES1UG24CS006; Due Dates: D+20, then D+3 | Step 1: no email sent. Step 2: the job reports that notifications are disabled, sends nothing, does not claim success, and the application does not crash | | |
| ST-03 | Fee Tracking (End-to-end) | Admin sets the fee and records a payment; the student verifies | Admin logged in; PES1UG24CS007 has no fee record | 1. Admin sets the amount due and due date 2. Admin records a partial payment 3. The student logs in and opens the fee page | Student: PES1UG24CS007, Amount Due: 40000, Due Date: D+30, Amount Paid: 15000, Date: D | Student sees status "Partially Paid", balance 25000, and one payment of 15000 in the history | | |

### FR-004: Complaint Management

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-17 | Complaint Management | Submit a complaint with a category and description (FR-004.1) | Student PES1UG24CS001 logged in; no open complaint in this category | 1. Open Raise Complaint 2. Select the category 3. Enter the description 4. Submit | Category: Electrical, Description: "Fan not working in room A-204" | HTTP 201; complaint created with status "Open" and a timestamp; confirmation displayed | | |
| UT-18 | Complaint Management | Reject a second open complaint in the same category (FR-004.1) | Student has an open Electrical complaint (UT-17) | 1. Open Raise Complaint 2. Select Electrical again 3. Submit | Category: Electrical, Description: "Light flickering" | HTTP 409; message "You already have an open complaint in this category"; no new complaint | | |
| UT-19 | Complaint Management | A complaint in a different category is allowed (FR-004.1) | Student has an open Electrical complaint | 1. Open Raise Complaint 2. Select Plumbing 3. Enter the description 4. Submit | Category: Plumbing, Description: "Leaking tap in washroom" | HTTP 201; both complaints (Electrical, Plumbing) exist independently | | |
| UT-35 | Complaint Management | Reject a complaint with an empty description (FR-004.1) | Student logged in | 1. Open Raise Complaint 2. Select a category 3. Leave the description blank, then repeat with spaces only 4. Submit | Category: Furniture, Description: "" and "   " | HTTP 400; message "Description is required"; no complaint created | | |
| UT-20 | Complaint Management | Admin updates status to In Progress and then Resolved with remarks (FR-004.2) | Admin logged in; an open Electrical complaint exists (UT-17) | 1. Select the complaint 2. Set In Progress and enter remarks, submit 3. Set Resolved and enter remarks, submit | Step 2: In Progress, "Technician assigned". Step 3: Resolved, "Fan replaced" | Each update is saved with its remarks and timestamp; the status shown to the student matches | | |
| UT-36 | Complaint Management | Admin rejects a complaint; remarks are required (FR-004.2) | Admin logged in; an open Plumbing complaint exists (UT-19) | 1. Set the status to Rejected with blank remarks and submit 2. Set Rejected with remarks and submit | Set A: Rejected, remarks "". Set B: Rejected, "Not a hostel issue" | Set A: HTTP 400; message "Remarks are required". Set B: status Rejected and remarks saved | | |
| UT-37 | Complaint Management | Reject an invalid status value (FR-004.2) | Admin logged in; an open complaint exists | 1. Send PUT /api/complaints/{id} with a status that is not allowed | Status: "Closed" (also "done") | HTTP 400; message "Invalid status"; complaint unchanged | | |
| UT-21 | Complaint Management | A student account cannot update complaint status (NFR-002.b) | Logged in as a student; a complaint exists | 1. Send PUT /api/complaints/{id} with the student's session | Role: Student; body: {status: "Resolved"} | HTTP 403; complaint unchanged; no status controls shown in the student UI | | |
| IT-08 | Complaint Management | Student views complaint history with timestamps (FR-004.3) | Student has complaints with status changes (UT-17, UT-19, UT-20) | 1. Student logs in 2. Opens Complaint History | Student: PES1UG24CS001 | Each complaint shows category, description, submission timestamp, current status and remarks; entries are in a consistent order (newest first); only this student's complaints are shown | | |
| IT-20 | Complaint Management | A new complaint is allowed once the earlier one is no longer open (FR-004.1) | Student has an Electrical complaint | 1. With the complaint In Progress, submit another Electrical complaint 2. Admin sets it to Resolved; submit another Electrical complaint 3. Admin sets that one to Rejected; submit another Electrical complaint | Student: PES1UG24CS008, Category: Electrical | Step 1: HTTP 409 (In Progress still counts as open). Step 2: HTTP 201. Step 3: HTTP 201 | | |
| ST-04 | Complaint Management (End-to-end) | Student submits, admin resolves, student verifies | Student logged in; no open Water Supply complaint | 1. Student submits the complaint 2. Admin opens it and sets Resolved with remarks 3. Student opens Complaint History | Student: PES1UG24CS009, Category: Water Supply, Description: "No water supply since morning", Remarks: "Pump repaired" | Complaint appears as "Resolved" with the remarks in the student's history; timestamps are consistent | | |

### FR-005: Leave, Visitor, Dashboard and Reports

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-22 | Leave Management | Submit a leave request with valid dates and reason (FR-005.1) | Student PES1UG24CS001 logged in | 1. Open Leave Request 2. Enter start date, end date and reason 3. Submit | Start: D+3, End: D+6, Reason: "Family function" | HTTP 201; request created with status "Pending" | | |
| UT-23 | Leave Management | Reject a leave request whose end date is before the start date (FR-005.1) | Student logged in | 1. Open Leave Request 2. Enter an end date earlier than the start date 3. Submit | Start: D+6, End: D+4, Reason: "Family function" | HTTP 400; message "End date must be after start date"; no request created | | |
| UT-38 | Leave Management | Reject a leave request with no reason (FR-005.1) | Student logged in | 1. Open Leave Request 2. Enter valid dates and leave the reason blank 3. Submit | Start: D+3, End: D+4, Reason: "" | HTTP 400; message "Reason is required"; no request created | | |
| UT-24 | Leave Management | Admin approves a pending leave request (FR-005.2) | Admin logged in; the pending request from UT-22 exists | 1. Select the request 2. Click Approve | Leave request: PES1UG24CS001, D+3 to D+6 | Status "Approved"; the student sees "Approved" | | |
| UT-25 | Leave Management | Admin rejects a pending leave request (FR-005.2) | Admin logged in; a pending request from PES1UG24CS002 exists | 1. Select the request 2. Click Reject | Leave request: PES1UG24CS002, D+10 to D+12 | Status "Rejected"; the student sees "Rejected" | | |
| IT-22 | Leave Management | A leave request that is already decided cannot be decided again (FR-005.2) | Admin logged in; a request already "Approved" (UT-24) | 1. Send PUT /api/leaves/{id}/decision with Reject for the approved request | Leave request from UT-24; decision: Reject | HTTP 409; message "Leave request already decided"; status stays "Approved" | | |
| UT-26 | Visitor Management | Admin logs a visitor entry with all required fields (FR-005.3) | Admin logged in | 1. Open Visitor Log 2. Enter visitor name, contact, purpose, student visited and entry time 3. Submit | Name: Suresh Rao, Contact: 9988776655, Purpose: "Meeting", Student: PES1UG24CS001, Entry: D 10:00 | HTTP 201; entry saved and listed with no exit time | | |
| UT-39 | Visitor Management | Reject a visitor entry with a missing or invalid field (FR-005.3) | Admin logged in | 1. Submit an entry with the name blank 2. Submit an entry with a non-numeric contact | Set A: Name: "", Contact: 9988776655. Set B: Name: Suresh Rao, Contact: "abc123" | HTTP 400 for each, naming the invalid field; no entry created | | |
| UT-27 | Visitor Management | Admin logs the exit time of an existing visitor (FR-005.3) | A visitor entry without an exit time exists (UT-26) | 1. Select the entry 2. Enter the exit time 3. Submit | Exit: D 11:30 | The same record is updated with the exit time; no duplicate record | | |
| UT-40 | Visitor Management | Reject an exit time earlier than the entry time (FR-005.3) | A visitor entry with entry time D 10:00 and no exit | 1. Select the entry 2. Enter an earlier exit time 3. Submit | Exit: D 09:00 | HTTP 400; message "Exit time must be after entry time"; record unchanged | | |
| IT-09 | Admin Dashboard | Dashboard totals match the data and change correctly (FR-005.4) | Seeded data plus allocations, fee records and complaints from earlier tests; Compass open | 1. Admin opens the dashboard 2. Compare each figure with a database query 3. Allocate one student and raise one complaint 4. Reload the dashboard | Figures: total occupancy, vacant rooms, pending fee dues, open complaints | Step 2: all four figures equal the database values. Step 4: occupancy +1, vacant rooms −1, open complaints +1; pending dues unchanged | | |
| IT-10 | Reports | Export reports as CSV (FR-005.5) | Admin logged in; report data exists | 1. Open Reports 2. Select the report 3. Click "Export as CSV" 4. Open the file and compare it with the database | Set A: Fee Report. Set B: Student Report. Set C: Complaint Report | A CSV file downloads for each set; it has a header row, one row per record, and values equal to the database; no password or internal fields appear | | |
| IT-11 | Reports | Export reports as PDF (FR-005.5) | Admin logged in; report data exists | 1. Open Reports 2. Select the report 3. Click "Export as PDF" 4. Open the file and compare it with the database | Set A: Complaint Report. Set B: Fee Report. Set C: Student Report | A readable PDF downloads for each set; the records and values equal the database; tables are not cut off | | |
| IT-21 | Reports | A student or an unauthenticated user cannot export reports or read the visitor list (NFR-002.b) | Student logged in; a second request without any session | 1. As the student, call GET /api/reports/fee and GET /api/visitors 2. Repeat both with no session | Role: Student (PES1UG24CS001); no session | Student: HTTP 403 for both and no file or data returned. No session: HTTP 401 | | |
| ST-05 | Leave Management (End-to-end) | Student submits leave, admin approves, student verifies | Student logged in | 1. Student submits a leave request 2. Admin approves it 3. Student opens the leave status | Student: PES1UG24CS003, Start: D+3, End: D+5, Reason: "Medical" | Student sees status "Approved" with the correct dates | | |

---

## 4. Cross-Cutting Access Control Cases (NFR-002.b)

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IT-18 | Access Control | A student cannot read another student's dashboard or fee data | Student PES1UG24CS001 logged in; PES1UG24CS002 has a fee record and a dashboard | 1. Call GET /api/students/PES1UG24CS002/dashboard and GET /api/fees/PES1UG24CS002 2. Call both for the student's own USN 3. Log in as admin and call both for PES1UG24CS002 | Own USN: PES1UG24CS001; other USN: PES1UG24CS002 | Step 1: HTTP 403 and no data. Step 2: HTTP 200. Step 3: HTTP 200 | | |
| IT-19 | Access Control | A student sees only their own complaints and leave requests | PES1UG24CS001 and PES1UG24CS002 each have complaints and leave requests | 1. As PES1UG24CS001, call GET /api/complaints/mine and GET /api/leaves/mine 2. Call GET /api/complaints/{id} and GET /api/leaves/{id} using IDs that belong to PES1UG24CS002 | IDs of PES1UG24CS002's records | Step 1: lists contain only PES1UG24CS001's records. Step 2: HTTP 403 (or 404) and no data returned | | |

---

## 5. Nonfunctional Requirement Checks

| Test Case ID | Name of Module | Test case description | Pre-conditions | Test Steps | Test data | Expected Results | Actual Result | Test Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFR-01 | Performance (NFR-001.a) | Standard pages load within 3 seconds | Application deployed and reachable; seeded data loaded; one user, normal conditions | 1. Open each page with the browser developer tools (Network tab) or Lighthouse 2. Record the load time 3. Repeat 3 times per page | Pages: login, student dashboard, admin dashboard, room list | Every recorded load time is 3 seconds or less; the times are written in Actual Result | | |
| NFR-04 | Performance (NFR-001.b) | Load test with 200 concurrent users | Application deployed in the best available environment; k6 or autocannon installed; at least 20 seeded accounts | 1. Script 200 virtual users that log in and then load the student dashboard 2. Ramp up for 30 seconds, hold 2 minutes 3. Record p95 response time, error rate and the environment used | Tool: k6 or autocannon; Users: 200; Endpoints: POST /api/auth/login, GET /api/students/{usn}/dashboard; Accounts: PES1UG24CS001 to PES1UG24CS020 reused | Pass if the p95 response time is 3 seconds or less and the error rate is below 1%. If the environment cannot generate or serve the load, record the measured figures and mark the result "Limited by environment" rather than Pass | | |
| NFR-02 | Security (NFR-002.a) | Passwords are stored as a hash, never in plaintext | Database access (Compass) in a test environment | 1. Register a test user 2. Open the users collection in Compass 3. Read the stored password value 4. Inspect the register, login and GET /api/auth/me responses | USN: PES1UG24CS905, Password: Pass@123 | The stored value is a one-way hash (for example it starts with "$2b$" for bcrypt) and is not "Pass@123"; no API response contains a password or hash | | |
| NFR-03 | Security (NFR-002.c) | The session expires after inactivity | Test mode: SESSION_TIMEOUT_MINUTES=1; student logged in | 1. Perform an action at about 40 seconds and check the session still works 2. Then stay inactive for more than 1 minute 3. Perform an action that needs authentication | USN: PES1UG24CS001 | Step 1: the action succeeds (activity extends the session). Step 3: HTTP 401 with message "Session expired"; the user is redirected to the login page | | |
| NFR-05 | Configuration (FR-001.3, NFR-002.c) | The lockout and session settings default to 5 attempts, 15 minutes and 30 minutes | Access to the repository and a test environment | 1. Start the backend with MAX_FAILED_LOGINS, LOCKOUT_MINUTES and SESSION_TIMEOUT_MINUTES unset 2. Read the effective values (startup log, config test or config module) 3. Set LOCKOUT_MINUTES=1 and restart 4. Repeat IT-01 | Env: unset, then LOCKOUT_MINUTES=1 | Step 2: effective values are 5, 15 and 30. Step 4: the lock now lasts 1 minute. `.env.example` lists all three variables | | |

---

## 6. Requirements Traceability Matrix (Test Plan v1.1)

Every requirement in SRS v1.1 maps to at least one test case below. This table replaces the group labels (for example "FR001 test cases") used in the earlier documents and is the source for SRS Appendix C and the project RTM.

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
| Sprint 1 (19–23 Oct) | UT-01 to UT-07, UT-28 to UT-30, IT-01, IT-02, IT-12, IT-13, ST-06, UT-08, UT-31, UT-09 to UT-11, IT-05, ST-01, ST-02, NFR-02, NFR-03, NFR-05 | Registration, login, RBAC, room list, allocation, student dashboard, seed data |
| Sprint 2 (26–30 Oct) | IT-03, IT-04, IT-14, IT-15, IT-16, UT-12 to UT-16, UT-32 to UT-34, IT-06, IT-07, IT-17, ST-03, UT-17 to UT-21, UT-35 to UT-37, IT-08, IT-20, ST-04, UT-22 to UT-27, UT-38 to UT-40, IT-09 to IT-11, IT-21, IT-22, ST-05, IT-18, IT-19, NFR-01, NFR-04 | Reallocate and vacate, fees, complaints, leave, visitors, dashboard, reports, notifications, load-test script |

Regression: after the Sprint 2 merge freeze, re-run all Sprint 1 cases that touch authentication and rooms (UT-06, UT-09, IT-01, IT-05, ST-01, IT-16) before the final results are recorded.

## 9. Assumptions and Open Points

| # | Item | Action |
| --- | --- | --- |
| 1 | Seed data (admin account, 20 students, example room codes) is assumed to match Section 2 | Raiesh to confirm against the seed script (story HMS-26) and update the Test data column if it differs |
| 2 | Remarks are mandatory when an admin updates a complaint (UT-36), following "with remarks" in FR-004.2 | Confirm with the implementer; otherwise change UT-36 Set A |
| 3 | A leave request can be decided only once (IT-22) and an In Progress complaint counts as open (IT-20); neither is stated explicitly in the SRS | Confirm and, if kept, add a line to the SRS business rules |
| 4 | The exact UI and API error messages are as written in this plan | Record any difference in Actual Result and decide whether the plan or the code changes |
| 5 | NFR-04 depends on the available hosting environment | Report measured figures and the environment; do not mark Pass without evidence |
| 6 | SAD v1.1 and the API contract are still to be updated for MongoDB and the new endpoints | Endpoint names used here (for example GET /api/complaints/mine, GET /api/leaves/mine, GET /api/auth/me) must match `docs/API_CONTRACT.md` once it is frozen |

---

**Team:** Team 3, Class 5-J
**Project:** Hostel Management System
