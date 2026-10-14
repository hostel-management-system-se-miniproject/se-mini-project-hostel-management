# HMS Mini-Project: Commit and Time Plan (Dry Run 14-18 Oct, Sprint 1 19-23 Oct, Sprint 2 26-30 Oct 2026)

Team 3, Class 5-J: Chiranthan (PM), Harsh, Raiesh, Neha. This plan follows the professor's Mini-Project Deliverables Part-2 dates and the updated backlog (`HMS_Backlog_Stories_v1.1.csv`, 37 stories, 121 story points). Stack: MERN with MongoDB. All times are IST. Issue IDs (HMS-nn) are the story IDs in the backlog; commits and branches use the GitHub issue number (#n).

## 1. Roles and story points

| Person | Role | Owns | Dry run | Sprint 1 | Sprint 2 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| Chiranthan | PM / repo owner | Board and backlog, DEVIATIONS.md, data model, rooms and allocation, visitors, student dashboard, admin dashboard, final docs and freeze | 8 | 11 | 11 | 30 |
| Harsh | Tech lead | Scaffold, ADR-001, API contract, SAD, auth, RBAC, secure config, leave submission, fees, notifications | 8 | 11 | 11 | 30 |
| Raiesh | QA lead | CI, seed data, UI layout, complaint submission, test runs, traceability, reports, performance and load test | 9 | 9 | 13 | 31 |
| Neha | Docs and demo lead | SRS and test plan in repo, README, diagrams, registration, room availability, complaints admin and history, fee display, leave decision, both videos | 9 | 9 | 12 | 30 |

Everyone also reviews pull requests. Every story is a vertical slice: API, UI and tests are delivered by the same owner.

## 2. Timeline at a glance

| Dates | What happens | Cutoff |
| --- | --- | --- |
| Wed 14 to Fri 16 Oct | **Dry run:** board update, scaffold, data model, CI and templates, seed data, v1.1 documents in the repo, ADR-001 and API contract, diagrams, UI layout | PRs by 8 PM each day. Fri 16, 8 PM: 15-minute retro |
| Sat 17, Sun 18 | Dry run buffer. Spillover only, no new work | Everything merged by Sun 18, 8 PM |
| Mon 19 Oct | Last day to change the backlog. Sprint 1 starts | Backlog frozen at 12 PM |
| Mon 19 to Thu 22 | **Sprint 1:** registration, login, RBAC, rooms, allocation, complaint submission, visitors, student dashboard | Feature PRs by Thu 22, 6 PM |
| Fri 23 Oct | Merge freeze, run Sprint 1 tests, record and upload the 1-minute video | Freeze 1 PM, results 5 PM, video 6 PM |
| Sat 24, Sun 25 | Buffer. Fix bugs found in the Sprint 1 test run | None |
| Mon 26 to Wed 28 | **Sprint 2:** reallocate and vacate, fees, notifications, complaints admin, leave, dashboard, reports, load test | Feature PRs by Wed 28, 8 PM |
| Thu 29 Oct | Review, merge, bug fixes, run the Sprint 2 tests | Merge freeze 8 PM |
| Fri 30 Oct | Final tests, final documents, 2-minute video, tag v1.0, **freeze development** | Dev freeze 1 PM, video 6 PM |

## 3. Rules and timings

* **Commit rhythm:** at least one commit a day, pushed by **8 PM**. Small commits, not one big dump at the end.
* **Branch:** `feature/<issue#>-short-name` (also `fix/`, `docs/`, `test/`, `ci/`, `chore/`). Commit message: `type(#issue): message`, for example `feat(#12): add withdraw endpoint`.
* **PR:** one PR per task, says `Closes #<issue>` and lists the SRS requirement IDs and test case IDs it covers. Run the relevant tests before opening it.
* **Review:** default reviewer is Chiranthan's PR by Harsh, Harsh's by Raiesh, Raiesh's by Neha, Neha's by Chiranthan. If that person is unavailable, any other teammate who is not the author may review. Review within 12 hours.
* **Merge:** any teammate may merge an approved PR whose checks pass, **but never the PR's author**. `main` is protected (1 approval from someone else, CI must pass once HMS-25 is in).
* **Cut-offs:** Sprint 1 feature PRs by Thu 22, 6 PM and merge freeze Fri 23, 1 PM. Sprint 2 feature PRs by Wed 28, 8 PM, merge freeze Thu 29, 8 PM and development freeze Fri 30, 1 PM. After a freeze only bug-fix, test-result, documentation and video PRs are accepted.
* **Local setup:** everyone runs MongoDB locally or on their own free Atlas cluster. Do not share one development database. `.env` files are never committed.
* **API changes:** the API contract is frozen on Fri 16. If you must change an endpoint, post in the group chat and update `docs/API_CONTRACT.md` in the same PR.
* **Deviations:** anything that differs from the submitted SRS, SAD or Test Plan goes in `docs/DEVIATIONS.md` with the reason.
* **Nothing is dropped:** CSV and PDF reports, fee notifications (tested with a test SMTP) and the 200-user load test all stay in scope. Results are reported honestly.
* **Running late:** post in the group chat by 8 PM on the day you will miss a deadline. Chiranthan then reassigns or reschedules. Do not skip tests to catch up.

## 4. Dry run: Wed 14 to Fri 16 Oct (setup, v1.1 documents, practice PRs)

The dry run is for practice. Use it to try the full PR workflow once (branch, PR, review, merge) and to get everything in place so Sprint 1 starts clean on Mon 19.

### Chiranthan (PM, data model)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Wed 14 | by 8 PM | Create issues HMS-25 to HMS-37 from the CSV. Update HMS-01 to HMS-24 (text, points, assignee) | HMS-32 | n/a |
| Thu 15 | by 6 PM | Finish the board: Sprint field (Dry Run, Sprint 1, Sprint 2), points, due dates. Check every issue for copy-paste damage | HMS-32 | n/a |
| Thu 15 | by 8 PM | Draft the schemas and indexes on a branch and push (after the scaffold is merged) | HMS-02 | n/a |
| Fri 16 | by 1 PM | feat(#n): Mongoose schemas for the 8 collections, unique and partial indexes, model tests, mongodump note | HMS-02 | Harsh |
| Fri 16 | by 1 PM | Settings: add the CI check as a required status check on main (after Raiesh's first run) | HMS-25 | n/a |
| Fri 16 | by 6 PM | docs(#n): DEVIATIONS.md with the known deviations | HMS-32 | Harsh |
| Sat 17, Sun 18 | any time | Review and merge spillover PRs | n/a | n/a |
| Mon 19 | by 12 PM | Final backlog check. All dry-run PRs merged. Backlog frozen | HMS-32 | n/a |

### Harsh (tech lead)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Wed 14 | by 8 PM | docs(#n): SAD v1.1 in docs/ and the v1.0 copy in docs/baseline/ | HMS-28 | Raiesh |
| Thu 15 | by 1 PM | feat(#n): scaffold backend and frontend, GET /health, MongoDB connection, .env.example, .gitignore (first practice PR) | HMS-01 | Raiesh |
| Thu 15 | by 8 PM | docs(#n): ADR-001 and API_CONTRACT.md | HMS-30 | Raiesh |
| Fri 16 | by 1 PM | Post "API contract frozen" in the group chat. Review Chiranthan's data model PR | HMS-30 | n/a |
| Fri 16 | by 6 PM | Reviews and merges of approved PRs. Read your Sprint 1 stories (HMS-05, HMS-06, HMS-22) | n/a | n/a |

### Raiesh (QA lead, CI)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Wed 14 | by 8 PM | Review Harsh's SAD PR. Draft the CI workflow locally (do not open the PR until the scaffold is merged) | HMS-25 | n/a |
| Thu 15 | by 8 PM | ci(#n): GitHub Actions workflow (install, lint, tests, build), PR template, issue templates. Run it once and tell Chiranthan | HMS-25 | Neha |
| Fri 16 | by 6 PM | feat(#n): UI layout, navigation and route guard | HMS-03 | Neha |
| Fri 16 | by 8 PM | feat(#n): seed script (admin, PES1UG24CS001 to 020, rooms) after the data model is merged. Buffer: Sun 18, 8 PM | HMS-26 | Neha |

### Neha (docs and demo lead)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Wed 14 | by 8 PM | docs(#n): SRS v1.1 in docs/ and the v1.0 copy in docs/baseline/ | HMS-27 | Chiranthan |
| Thu 15 | by 1 PM | docs(#n): Test Plan v1.1 in docs/, v1.0 copy in docs/baseline/, Section 8 updated to match this plan (see section 8 below) | HMS-29 | Chiranthan |
| Thu 15 | by 8 PM | docs(#n): README and docs structure (after the scaffold is merged) | HMS-33 | Chiranthan |
| Fri 16 | by 8 PM | docs(#n): UML use-case diagram and ER (collection) diagram | HMS-31 | Chiranthan |

**Fri 16, 8 PM:** 15-minute retro (what worked in the PR workflow, what to fix). **Sat 17, Sun 18:** spillover only. Read your Sprint 1 stories.

## 5. Sprint 1: Mon 19 to Fri 23 Oct (auth, rooms, allocation, complaints, visitors, student dashboard)

Mon 19, 12 PM is the last time to change the backlog. GitHub Actions is already running from the dry run, so every PR from now on goes through it.

### Chiranthan (rooms and allocation, visitors, student dashboard)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Mon 19 | by 8 PM | feat(#n): GET /api/students (unallocated filter), POST /api/allocations with the partial unique index, atomic occupancy update and rollback (ROOM_FULL 409) | HMS-08 | Harsh |
| Tue 20 | by 8 PM | feat(#n): allocation page with error display, GET /api/allocations, npm run check:consistency, parallel-request test for the last bed | HMS-08 | Harsh |
| Wed 21 | by 8 PM | feat(#n): GET /api/students/{usn}/dashboard (own or admin) and the student dashboard page with room status | HMS-34 | Harsh |
| Thu 22 | by 6 PM | feat(#n): visitor entry and exit endpoints (admin only) and admin visitor page | HMS-17 | Harsh |
| Fri 23 | by 1 PM | Reviews and merges. Merge freeze | n/a | n/a |

### Harsh (auth, RBAC, secure configuration)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Mon 19 | by 1 PM | feat(#n): requireAuth, requireRole, selfOrAdmin middleware (others need it first) | HMS-06 | Raiesh |
| Mon 19 | by 8 PM | feat(#n): POST /api/auth/login (USN or email), server-side session, GET /api/auth/me, POST /api/auth/logout, login page | HMS-05 | Raiesh |
| Tue 20 | by 8 PM | feat(#n): 5-failure lockout for 15 minutes (423), reset rules, 30-minute rolling session expiry, configurable timeouts, lockout messages on the login page | HMS-05 | Raiesh |
| Wed 21 | by 8 PM | chore(#n): bcrypt cost, helmet, CORS, secure cookies, generic errors, .env.example check, mongodump and restore note | HMS-22 | Raiesh |
| Thu 22 | by 6 PM | Reviews. Fix bugs found in integration | n/a | Raiesh |
| Fri 23 | by 1 PM | Reviews and merges. Merge freeze | n/a | n/a |

### Raiesh (complaint submission, traceability, Sprint 1 tests)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Mon 19 | by 8 PM | feat(#n): POST /api/complaints, one open complaint per category (409), GET /api/complaints/mine | HMS-13 | Neha |
| Tue 20 | by 8 PM | feat(#n): student complaint page (form and list) | HMS-13 | Neha |
| Wed 21 | by 8 PM | docs(#n): RTM with real test IDs and status, DEVIATIONS.md update | HMS-23 | Neha |
| Thu 22 | by 6 PM | test(#n): ST-02 parallel-request script and test mode settings (1-minute lockout and session) | HMS-21 | Neha |
| Fri 23 | 1 PM to 4 PM | Run the Sprint 1 test cases on main. Log every failure as a bug issue | HMS-21 | n/a |
| Fri 23 | by 5 PM | test(#n): Sprint 1 results in docs/TEST_PLAN.md (Actual Result, Test Result) | HMS-21 | Neha |

### Neha (registration, room availability, Sprint 1 video)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Mon 19 | by 8 PM | feat(#n): GET /api/rooms with block, floor, sharing and available filters, and the admin room availability page | HMS-07 | Chiranthan |
| Tue 20 | by 8 PM | feat(#n): POST /api/auth/register with validation, 409 for duplicates, rollback of the user if the profile insert fails | HMS-04 | Chiranthan |
| Wed 21 | by 8 PM | feat(#n): registration page with inline validation messages | HMS-04 | Chiranthan |
| Thu 22 | by 6 PM | Help fix integration issues. Plan the video script (register, login, allocate, see room) | HMS-24 | n/a |
| Fri 23 | by 6 PM | Record the 1-minute video, compress to 720p under 25 MB, docs: add videos/sprint1-demo.mp4 | HMS-24 | Chiranthan |

**Fri 23, 8 PM:** 15-minute retro. **Sat 24, Sun 25:** buffer. Owners fix the bugs from Friday's test run. Read your Sprint 2 stories.

## 6. Sprint 2: Mon 26 to Fri 30 Oct (fees, complaints admin, leave, dashboard, reports, load test, docs, freeze)

### Chiranthan (reallocate and vacate, admin dashboard, final docs)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Mon 26 | by 8 PM | feat(#n): PUT /api/allocations/{id}/reallocate with the compensating steps (full room keeps the old allocation) | HMS-09 | Harsh |
| Tue 27 | by 8 PM | feat(#n): POST /api/allocations/{id}/vacate with confirm flag, reallocate and vacate buttons with confirmation dialog, consistency check | HMS-09 | Harsh |
| Wed 28 | by 6 PM | feat(#n): GET /api/admin/dashboard (occupancy, vacancies, dues, open complaints) and the admin dashboard page | HMS-18 | Harsh |
| Thu 29 | by 8 PM | Reviews and merges. Draft the document alignment (SRS, SAD, README, DEVIATIONS.md). Merge freeze | HMS-37 | Harsh |
| Fri 30 | by 1 PM | docs(#n): final DEVIATIONS.md, README and RTM, tag v1.0. **Freeze development** | HMS-37 | Harsh |

### Harsh (leave submission, fees, notifications)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Mon 26 | by 1 PM | feat(#n): POST /api/leaves, GET /api/leaves/mine, student leave page (Neha needs it for the decision story) | HMS-15 | Raiesh |
| Mon 26 | by 8 PM | feat(#n): POST /api/fees, POST /api/fees/payments with the atomic payment update and validation | HMS-10 | Raiesh |
| Tue 27 | by 8 PM | feat(#n): GET /api/fees and GET /api/fees/{usn} with derived status, admin fee page | HMS-10 | Raiesh |
| Wed 28 | by 6 PM | feat(#n): daily notification job, POST /api/admin/notifications/run, test SMTP | HMS-12 | Raiesh |
| Thu 29 | by 6 PM | Reviews and merges. Fix bugs from testing | n/a | Raiesh |
| Fri 30 | by 1 PM | Final bug fixes and CI check. Freeze | n/a | Raiesh |

### Raiesh (reports, performance, final tests)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Mon 26 | by 8 PM | feat(#n): GET /api/reports/{type} with CSV format and export buttons | HMS-19 | Neha |
| Tue 27 | by 8 PM | feat(#n): PDF format with pdfkit and PDF export buttons | HMS-19 | Neha |
| Wed 28 | by 8 PM | test(#n): page-load timings and the 200-user load test script (k6 or autocannon) | HMS-20 | Neha |
| Thu 29 | by 12 PM | Run the load test and record results under tests/performance | HMS-20 | Neha |
| Thu 29 | by 8 PM | Run the Sprint 2 test cases on main after the merges. Log bugs | HMS-35 | n/a |
| Fri 30 | by 1 PM | test(#n): regression cases, final results in docs/TEST_PLAN.md with Pass, Fail and Not run counts | HMS-35 | Neha |

### Neha (complaints admin and history, fee display, leave decision, Sprint 2 video)

| Day | Time | Commit / task | Issue | Reviewer |
| --- | --- | --- | --- | --- |
| Mon 26 | by 8 PM | feat(#n): GET /api/complaints (admin), PUT /api/complaints/{id} with status, remarks and history | HMS-14 | Chiranthan |
| Tue 27 | by 8 PM | feat(#n): admin complaint page and student complaint history page with timestamps | HMS-14 | Chiranthan |
| Wed 28 | by 1 PM | feat(#n): fee status, balance and history on the student dashboard and fee page (needs Harsh's fee endpoints from Tue) | HMS-11 | Chiranthan |
| Wed 28 | by 8 PM | feat(#n): GET /api/leaves (admin), PUT /api/leaves/{id}/decision with 409 for repeated decisions, admin leave page and student status | HMS-16 | Chiranthan |
| Thu 29 | by 6 PM | Help fix bugs. Help Chiranthan check the SRS and SAD against the final code | HMS-37 | n/a |
| Fri 30 | by 6 PM | Record the 2-minute video, compress, docs: add videos/sprint2-demo.mp4 | HMS-36 | Chiranthan |

## 7. Test cases to run in each sprint (for Raiesh)

Run a case only after its feature is merged. A case that cannot run is marked Not run with the reason, never Pass.

* **Sprint 1 (Fri 23):** UT-01 to UT-07, UT-28 to UT-30, IT-01, IT-02, IT-12, IT-13, ST-06, UT-08, UT-31, UT-09 to UT-11, IT-05, IT-16, IT-18, ST-01, ST-02, UT-17 to UT-19, UT-35, IT-19 (complaints part), UT-26, UT-27, UT-39, UT-40, NFR-02, NFR-03, NFR-05
* **Sprint 2 (Thu 29 and Fri 30):** IT-03, IT-04, IT-14, IT-15, UT-32, UT-12 to UT-16, UT-33, UT-34, IT-06, IT-07, IT-17, ST-03, UT-20, UT-21, UT-36, UT-37, IT-08, IT-20, ST-04, UT-22 to UT-25, UT-38, IT-22, ST-05, IT-09 to IT-11, IT-21, IT-18 (fee data), IT-19 (leave part), NFR-01, NFR-04
* **Regression after the Sprint 2 freeze:** UT-06, UT-09, IT-01, IT-05, ST-01, IT-16

## 8. Change to Test Plan v1.1 Section 8 (Neha, HMS-29)

Compared with the schedule in Test Plan v1.1, three modules move from Sprint 2 to Sprint 1: complaint submission (UT-17 to UT-19, UT-35), the visitor log (UT-26, UT-27, UT-39, UT-40) and the student dashboard (IT-18). Update the Section 8 table to the lists in section 7 above. The test cases themselves do not change.

## 9. Part 2 checklist

| Item | Due | Status |
| --- | --- | --- |
| 1a to 1d: project linked to repo, FR and NFR backlog, story points, assignees | Wed 14 to Fri 16 Oct (finish by Mon 19, 12 PM) | In progress |
| 1e, 1f: two sprints planned, dry run done | Fri 16 Oct (buffer Sun 18) | To do |
| 1g: last day to change the backlog | Mon 19 Oct | To do |
| 2a to 2d: Sprint 1 items done, GitHub Actions on, PRs raised by owners and merged by a different teammate | Fri 23 Oct | To do |
| 2g, 2h: 1-minute working-product video uploaded to the repo | Fri 23 Oct, 6 PM | To do |
| 2i: deviations documented | Fri 23 Oct and Fri 30 Oct | To do |
| 3a, 3b: Sprint 2 items done, 2-minute working-product video uploaded | Fri 30 Oct, 6 PM | To do |
| 3c, 3d: documentation complete, development frozen | Fri 30 Oct, 1 PM | To do |

## 10. What to keep in the repo

* `docs/`: SRS, SAD and TEST_PLAN (v1.1), `baseline/` with the submitted v1.0 files unchanged, COMMIT_PLAN.md, DEVIATIONS.md, ADR-001.md, API_CONTRACT.md, `diagrams/`
* `backend/` and `frontend/`: code, schemas, seed script, tests
* `tests/`: parallel-request script, performance script and results
* `.github/`: workflows, PR and issue templates
* `videos/`: sprint1-demo.mp4 (1 minute) and sprint2-demo.mp4 (2 minutes), compressed and well under 25 MB
* Never commit `.env` files, passwords or real student data
