# Branch Coverage Report

**Project:** Hostel Management System (HMS), Team 3, Class 5-J, PES University
**Version:** 1.0
**Prepared by:** Chiranthan Sathrasala

## 1. Method

A branch is one way a decision can go: the true and the false side of an `if`, each side of a `? :`, each `&&` or `||` operand, each `case`, and each default value. Branch coverage is the share of those paths that at least one test takes. It is measured in the same runs as the Code Coverage Report (v8 coverage with Vitest for the frontend, c8 for the backend), and the HTML reports are stored next to this file.

## 2. Frontend results (5 November 2026, 156 tests)

| Measure | Result |
| --- | ---: |
| Branches (all files) | 80.00% |

### By folder

| Folder | Branches |
| --- | ---: |
| `src` | 85.22% |
| `src/api` | 81.25% |
| `src/components` | 76.92% |
| `src/pages` | 77.19% |

### Files at 100% branch coverage

`ProtectedRoute.jsx`, `validation.js`, `App.jsx`, `api/auth.js`, `Alert.jsx`, `AuthLayout.jsx`, `LoadingState.jsx`, `PlaceholderPage.jsx`, `LoginPage.jsx`, `StudentFeesPage.jsx`, and `api/reports.js` (it has few branches; its lines are mostly uncovered, see the Code Coverage Report).

### Files below 65% branch coverage

| File | Branches | Reason |
| --- | ---: | --- |
| `RegisterPage.jsx` | 30.00% | Uncovered lines 35-85 and 112-114: the field change, validation and submit handlers, which the static tests do not run. |
| `AuthGate.jsx` | 33.33% | Uncovered lines 14-55: the session lookup, login and logout handlers, which need effects and a browser. |
| `AdminComplaintsPage.jsx` | 50.00% | Uncovered lines 27-45 and 146-215: the update form and its handlers. |
| `ConfirmDialog.jsx` | 50.00% | Uncovered lines 19-56: the open-dialog behaviour (focus and keyboard handling) that needs a browser. |
| `FeeHistoryMini.jsx` | 50.00% | Uncovered lines 10-11, 34-42 and 49-55. |
| `NavIcon.jsx` | 50.00% | One branch at line 81. |
| `LeavePage.jsx` | 56.52% | Uncovered lines 65-123: the form submit and list handlers. |
| `feeFormat.js` | 60.00% | Fallbacks at lines 14, 23 and 28-30 (missing or invalid values). |
| `api/complaints.js` | 60.60% | Error-message branches on lines 11-121 for responses that no test sends. |
| `complaintFormat.js` | 62.50% | Fallbacks at lines 4-6 and 31. |
| `AdminLeavePage.jsx` | 64.00% | Uncovered lines 110-174: the decision handlers. |

### Reading these numbers

Most of the missed branches are error and handler paths in pages. They are exercised by the manual system tests in a real browser, not by the static-markup tests. The business rules that carry the most risk (fee status, overdue state, role-based pages, allocation confirmation, one-day leave) have their branches covered by `fees-admin.test.jsx`, `fees-student.test.jsx`, `app-routing.test.jsx`, `allocations.test.jsx` and `leave.test.jsx`.

## 3. Backend results

**Run:** 8 November 2026, 301 tests, all passed.

| Measure | Result |
| --- | ---: |
| Branches (all files) | 83.88% |

### By folder

| Folder | Branches |
| --- | ---: |
| `src` | 94.11% |
| `src/config` | 100% |
| `src/jobs` | 87.50% |
| `src/middleware` | 100% |
| `src/models` | 100% |
| `src/routes` | 77.82% |
| `src/services` | 89.55% |
| `src/validation` | 92.85% |

### Files at 100% branch coverage

All models, `config/auth.js`, `config/database.js`, `config/indexes.js`, `config/notifications.js`, `middleware/auth.js`, `routes/health.js` and `routes/rooms.js`.

### Files below 80% branch coverage

| File | Branches | Uncovered lines |
| --- | ---: | --- |
| `services/mailer.js` | 60.00% | 7-12: the default transport and the sign-in option when no user name is set. Tests pass a fake transport, so no real mail is sent. |
| `routes/reports.js` | 62.06% | 109, 217, 250-251: fallbacks for missing or empty data. |
| `routes/complaints.js` | 73.49% | Several `next(error)` and fallback branches (lines 111-255). |
| `routes/visitors.js` | 73.68% | 41-42, 51-52, 65-66: error forwarding. |
| `routes/fees.js` | 76.47% | Error forwarding and fallbacks (lines 186-365). |
| `routes/allocations.js` | 77.77% | 102-103, 126-130, 144-145: unexpected-error forwarding. |

### Reading these numbers

The missed branches are mostly the "something unexpected failed" side of a route, which sends the error to the safe 500 handler. That handler itself is tested (it returns a generic body with no message or stack), and one route of each family is tested through it. The decisions that carry business rules (access by role, one active allocation per student, full room, fee status, lock after five failures, one decision per leave request, closed complaints) have their branches covered.

## 4. Summary

| Part | Branches |
| --- | ---: |
| Frontend | 80.00% |
| Backend | 83.88% |

## 5. Conclusion

Branch coverage is 80.00% for the frontend and 83.88% for the backend. The remaining gaps are known and listed above. In the frontend they are mostly event handlers and error states that need a browser to run. In the backend they are mostly the unexpected-error side of routes.
