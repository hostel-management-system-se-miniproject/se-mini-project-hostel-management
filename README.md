## Testing

- The Test Plan (`docs/TEST_PLAN.md`) defines Unit (UT), Integration (IT) and System (ST) test cases for FR-001 to FR-005 and the NFR checks.
- Record the **Actual Result** and **Test Result (Pass/Fail)** only **after** executing a test. Never mark an unexecuted test as passed.
- Log every failure as a GitHub Issue (label `bug`) and link it to the test case ID.
- Use test data only: the sample USNs in the seed data and dates relative to the day of execution.
- Automated tests run against a separate test database (or an in-memory MongoDB), never against development or demo data.
- Concurrency (room allocation) is tested with a script that sends two requests at the same time rather than by two people.
- Requirements that cannot be fully verified in a student environment (for example, 200 concurrent users) are reported honestly as *verified*, *failed*, *not tested* or *limited by environment*; the measurement file in `tests/performance/results.md` records the actual evidence.
- The 200-user benchmark is scripted in `tests/performance/load-200.js` and checks the login and dashboard endpoints for the NFR-001 requirement.

```bash
node tests/performance/load-200.js --url=http://localhost:5000 --users=200 --usn=PES1UG24CS001 --password=Pass@123
```
