# HMS-20 performance benchmark

This directory contains the evidence for the NFR-001 performance requirement.

## Required evidence

The issue requires:

- page-load measurements for the login page, student dashboard, and admin dashboard
- a 200-user load test against the login and dashboard endpoints
- a result recorded as either Pass or Limited by environment with measured values

## Benchmark script

The project uses `k6` for the 200-user check because it matches the acceptance criteria exactly.

Run the script only after the app is running and seeded data is available:

```bash
k6 run tests/performance/load-200.js
```

The script reads these environment variables:

```bash
export API_BASE_URL=http://localhost:5000
export TEST_USN=PES1UG24CS001
export TEST_PASSWORD=Pass@123
```

Then run:

```bash
k6 run tests/performance/load-200.js
```

## Page-load measurement

For the page-load check, measure the real browser load time for each page in the same environment used for the k6 run. Record the measurements in `tests/performance/results.md`.

## Acceptance thresholds

The requirement passes only when:

- p95 response time <= 3000 ms
- error rate < 1 percent

If the environment is unavailable, record the result as `Limited by environment` and include whatever measured values exist and a description of the environment.
