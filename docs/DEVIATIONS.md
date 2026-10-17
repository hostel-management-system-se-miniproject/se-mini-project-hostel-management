# Deviations from the Submitted Documents

**Project:** Hostel Management System (HMS), Team 3, Class 5-J, PES University
**Baseline:** SRS v1.0, SAD v1.0, Test Plan v1.0 (as submitted)
**Current:** SRS v1.1, SAD v1.1, Test Plan v1.1
**Owner:** Chiranthan Sathrasala (PM). **Last updated:** 17 Oct 2026 (Dry Run)
**Related:** Issue HMS-32

Anything that differs from the submitted SRS, SAD or Test Plan is listed here with the reason, the documents it affects and its impact. Add new rows as they are found. The final version is due on Fri 23 Oct.

**Status values:** Done (already reflected in the v1.1 documents), Planned (decided, not yet built), Open (needs a decision).

---

## 1. Deviations in the v1.1 documents

| # | Deviation | Was (v1.0) | Now (v1.1 / implementation) | Reason | Affected documents | Impact | Status |
|---|---|---|---|---|---|---|---|
| D-01 | Database | Relational database | MongoDB with Mongoose (MERN stack) | The course project uses MERN, and the professor approved MongoDB. | SRS (constraints), SAD 3.a.2, 3.b.5, ER diagram, Test Plan | No foreign keys, CHECK constraints or mandatory transactions. Integrity is enforced with unique and partial unique indexes, atomic conditional updates and compensating steps. The ER diagram becomes a collection diagram. | Done |
| D-02 | USN format | 10 alphanumeric characters | 13 alphanumeric characters, stored in upper case (e.g. PES1UG24CS924) | Matches the real PES USN format. | SRS FR-001.1, SAD 3.b.4, Test Plan UT-04, UT-05, UT-28 | Registration validation and the INVALID_USN error use the 13-character rule. Test data uses `PES1UG24CS###`. | Done |
| D-03 | Reallocate a student (new FR-002.5) | Not specified | Admin can move a student to another room | Allocation was one-way, so a wrong allocation could not be corrected. | SRS, SAD 3.b.3 and 3.b.5.1, Test Plan IT-03, IT-14, IT-16 | New endpoint and test cases. The old room occupancy is decremented and the new one incremented atomically, with a compensating step on failure. | Done |
| D-04 | Vacate a room (new FR-002.6) | Not specified | Admin vacates a student after an explicit confirmation (`confirm: true` plus a UI dialog) | Needed to free capacity, and to protect against accidental vacating. | SRS, SAD 3.b.3 and 3.b.6, Test Plan IT-04, IT-15, IT-16 | New endpoint, new confirmation dialog and new test cases. | Done |
| D-05 | Fee model | Separate fee and payment records, with a fee-record delete | One fee record per student with amount due, due date and a payment list. Status and balance are derived. Fee-record deletion is removed. | Simpler model, and no stored status that can go out of date. | SAD 3.a.6, 3.b.5, Test Plan UT-12, UT-13, UT-32 | New rule FR-003.4: a payment cannot exceed the amount due (conditional update). Admin cannot delete fee records. | Done |
| D-06 | Extra endpoints | Incomplete API list | Added the fee-due endpoint, list endpoints for the admin and student screens, the current-user endpoint, the report formats and the notification trigger | The screens could not be built from the v1.0 list. | SAD 3.b.3 | About 30 endpoints in total. The frontend and backend teams build against the same list of endpoints. | Done |
| D-07 | Roles | Roles not fully fixed | Two roles only: Student and Warden/Admin. Admin accounts are created by the seed script. | There is no admin self-registration. | SRS, SAD 3.a.1, 3.a.5 | Role middleware on every protected route, plus a self-or-admin check on routes carrying a USN. | Done |
| D-08 | NFR sub-IDs | NFR-001, NFR-002 | NFR-001.a/b and NFR-002.a/b/c | Each NFR needs its own testable ID so it can be traced to a test case. | SRS, SAD traceability, Test Plan (NFR-01 to NFR-05) | The traceability matrix is now per sub-requirement. | Done |
| D-09 | Login identifier and lockout | Not detailed | One `identifier` field accepts a USN or an email. 5 failed logins lock the account for 15 minutes. Session timeout is 30 minutes. All three values are configurable (test mode uses 1 minute). | A single field is simpler for users. Configurable limits make the lockout and timeout testable in a short time. | SRS FR-001.3, SAD 3.a.5, Test Plan UT-06, UT-07, IT-01, IT-02, NFR-05 | Unknown user and wrong password return the same 401 message so accounts cannot be enumerated. | Done |

## 2. Process deviations

| # | Deviation | Was | Now | Reason | Impact | Status |
|---|---|---|---|---|---|---|
| D-10 | Who may merge | Only the repo owners merge | Any teammate may merge an approved PR, but never their own. `main` is protected: 1 approving review and CI must pass. | Keeps the work moving when an owner is busy. | Branch protection is the control. Reviews by non-owners are allowed. | Done |
| D-11 | CI as a required check | Required from the start | `Backend: install & test` and `Frontend: install & build` are required status checks on `main` since 17 Oct 2026. A failing check blocks the merge (shown on a throwaway PR, see HMS-25). | A check can only be selected as required after it has run once on the repository. | CI was not enforced between repository setup and 17 Oct 2026. | Done |

---

## 3. How to add a deviation

1. Add a row with the next ID (D-12, D-13, ...).
2. Fill in every column. "Affected documents" must name the section or test ID.
3. If the SRS, SAD or Test Plan wording changes, update it too, and keep the traceability matrix consistent.
4. Mention the D-number in the PR description.