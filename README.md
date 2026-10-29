## Performance evidence for HMS-20

The repository includes the performance evidence under `tests/performance` for the NFR-001 issue.

### Required checks

- Login, student dashboard, and admin dashboard page loads must be measured and recorded.
- A k6-based 200-user load test must run against the login and dashboard endpoints.
- Results must be either pass or `Limited by environment` with actual numbers and environment notes.

### Commands

```bash
export API_BASE_URL=http://localhost:5000
export TEST_USN=PES1UG24CS001
export TEST_PASSWORD=Pass@123
k6 run tests/performance/load-200.js
```

### Result file

The measured outcomes and environment notes are recorded in `tests/performance/results.md`.
