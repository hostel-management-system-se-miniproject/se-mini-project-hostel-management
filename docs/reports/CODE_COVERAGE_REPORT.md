# Code Coverage Report

**Project:** Hostel Management System (HMS), Team 3, Class 5-J, PES University
**Version:** 1.0
**Prepared by:** Chiranthan Sathrasala

## 1. Method

Coverage is measured while the automated tests run: v8 coverage with Vitest for the frontend, and c8 with the Node.js test runner for the backend. The HTML reports are stored next to this file (`frontend-coverage/` and `backend-coverage/`; open `index.html`). The figures below are copied from the tool output.

- **Statements and lines:** the share of code lines run by at least one test.
- **Functions:** the share of functions called at least once.
- **Excluded from the frontend figures:** `src/main.jsx` (it only mounts the app in a browser) and the test files.

## 2. Frontend results (5 November 2026, 156 tests)

| Measure | Result |
| --- | ---: |
| Statements | 69.55% |
| Lines | 69.55% |
| Functions | 71.13% |
| Branches | 80.00% (see the Branch Coverage Report) |

### By folder

| Folder | Statements | Branches | Functions |
| --- | ---: | ---: | ---: |
| `src` | 63.88% | 85.22% | 78.26% |
| `src/api` | 88.43% | 81.25% | 96.72% |
| `src/components` | 83.89% | 76.92% | 100% |
| `src/pages` | 62.06% | 77.19% | 51.00% |

### Files with the lowest statement coverage

| File | Statements | Why |
| --- | ---: | --- |
| `api/reports.js` | 7.27% | The file download uses the browser's Blob and anchor APIs, which a server-side test cannot run. |
| `App.jsx` | 35.02% | Routing is tested; the layout, sidebar and navigation handlers need a browser. |
| `RoomsPage.jsx` | 35.51% | Data loading and filter handlers are not run by the static-markup tests. |
| `AuthGate.jsx` | 38.77% | Only the "checking session" state is rendered; the lookup, login and logout code (lines 14-55) is not run. |
| `AllocationsPage.jsx` | 45.97% | The allocate, reallocate and vacate handlers are not run. |
| `VisitorsPage.jsx` | 48.64% | The form and exit handlers are not run. |
| `AdminComplaintsPage.jsx` | 54.80% | The update form handlers are not run. |

### Files at 100% statements

`ProtectedRoute.jsx`, `validation.js`, `complaintFormat.js`, `feeFormat.js`, `leaveFormat.js`, `api/auth.js`, `Alert.jsx`, `AuthLayout.jsx`, `LoadingState.jsx`, `NavIcon.jsx`, `PlaceholderPage.jsx`.

### Reading these numbers

The frontend tests render each component to static markup and call the helpers and API functions with a mocked `fetch`. That covers what is shown on screen and the logic behind it. It does not run click or typing handlers or `useEffect` data loading, so those lines are the uncovered ones in the pages. The system tests (System Validation Report) exercise those paths in a real browser.

## 3. Backend results

**Run:** 8 November 2026, 301 tests, all passed. Source measured: every file under `backend/src/`.

| Measure | Result |
| --- | ---: |
| Statements | 94.62% |
| Lines | 94.62% |
| Functions | 96.35% |
| Branches | 83.88% (see the Branch Coverage Report) |

### By folder

| Folder | Statements | Branches | Functions |
| --- | ---: | ---: | ---: |
| `src` | 98.30% | 94.11% | 66.66% |
| `src/config` | 85.71% | 100% | 66.66% |
| `src/jobs` | 100% | 87.50% | 100% |
| `src/middleware` | 100% | 100% | 100% |
| `src/models` | 100% | 100% | 100% |
| `src/routes` | 93.16% | 77.82% | 98.48% |
| `src/services` | 94.52% | 89.55% | 97.61% |
| `src/validation` | 96.96% | 92.85% | 100% |

### Files with the lowest statement coverage

| File | Statements | Uncovered lines and reason |
| --- | ---: | --- |
| `config/database.js` | 33.33% | Lines 3-10: `connectDatabase`, the function the server uses to connect. The tests connect through their own test helper, which also checks that the database name ends in `_test`. |
| `services/allocationService.js` | 82.08% | Error-handling paths (for example lines 165-209 and 259-292): the failures that are hard to trigger, such as a database error half-way through. The main flows and the compensation cases are tested. |
| `config/auth.js` | 86.84% | Lines 32-36: the error thrown when `SESSION_SECRET` is missing. |
| `routes/auth.js` | 87.09% | Lines 21-31 and 81-83: the fallbacks that find which field caused a duplicate error, and the Mongoose field-error mapper. |
| `routes/authSession.js` | 88.73% | Four small groups of lines (27-33, 52-53, 64-65): session error paths. |
| `routes/fees.js` | 88.44% | Error branches such as the safe 500 and the less common validation messages. |
| `routes/complaints.js` | 90.03% | Same pattern: safe 500 and rarely used validation branches. |

### Files at 100% statements

All eight models and `models/index.js`, `config/indexes.js`, `config/notifications.js`, `jobs/feeNotificationJob.js`, `middleware/auth.js`, `routes/admin.js`, `routes/health.js`, `routes/rooms.js`, `services/accountStore.js`, `services/adminDashboardService.js`, `services/dashboardService.js`, `services/feeNotificationService.js`, `services/loginService.js`, `services/mailer.js`, `services/visitorService.js`.

### Reading these numbers

The backend tests run the real routes against a real database, so the business rules are covered well: allocation and its races, fee status, complaint rules, leave decisions and login lockout. The uncovered lines are almost all `next(error)` and `catch` paths that need a failure to be forced, and the start-up code in `database.js` that only runs when the server itself starts.

**Note on what is measured:** `c8` reports the files that the tests load. `src/server.js` (the file that starts the server and the scheduler) is not loaded by any test, so it is not in the table. It contains only start-up wiring.

## 4. Changes made to improve coverage

- Removed `FormDemo.jsx`, a demo component that nothing used.
- Split the fee table out of `FeesPage.jsx` so it can be tested: `FeesPage.jsx` went from 0% to 74.57%.
- Exported `renderPageContent` from `App.jsx` and added routing tests: `App.jsx` went from 0% to 35.02%.
- Frontend statement coverage rose from 60.40% to 69.55% and branch coverage from 78.47% to 80.00%. Function coverage went from 74.85% to 71.13%: the code under test grew, and the extra functions are mostly inline event handlers that the static tests do not call.

## 5. Summary

| Part | Statements | Branches | Functions |
| --- | ---: | ---: | ---: |
| Frontend | 69.55% | 80.00% | 71.13% |
| Backend | 94.62% | 83.88% | 96.35% |

## 6. Conclusion

Backend coverage is high (94.62% of statements). Coverage of the frontend logic (formatting, validation, API functions, routing) is high. Coverage of browser-only behaviour is low by design of the test approach, and it is covered by the manual system tests.
