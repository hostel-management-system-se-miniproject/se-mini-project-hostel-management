# HMS-20 performance results

## Status

Limited by environment

## Environment summary

This branch was updated without a live application or deployment environment available in the workspace, so the measurements required for the acceptance criteria were not run against a real instance.

## Required page-load evidence

The issue requires measured load times for the following pages under normal conditions:

- login page
- student dashboard
- admin dashboard

Current recorded values:

- login page: not measured in this environment
- student dashboard: not measured in this environment
- admin dashboard: not measured in this environment

## Required 200-user load test evidence

The issue requires a k6 or autocannon test that runs 200 concurrent virtual users against the login and dashboard endpoints.

Current recorded values:

- test script: `tests/performance/load-200.js`
- execution status: not executed in this environment
- p95 response time: not measured
- error rate: not measured
- result: Limited by environment

## Acceptance threshold

Pass requires both:

- p95 response time <= 3000 ms
- error rate < 1%

Otherwise the result must stay as `Limited by environment` and include the measured numbers plus a description of the environment.

## Next step

Run the following once the live app is available:

```bash
export API_BASE_URL=http://localhost:5000
export TEST_USN=PES1UG24CS001
export TEST_PASSWORD=Pass@123
k6 run tests/performance/load-200.js
```

Then replace the placeholders above with the measured values and update this file before claiming the requirement as passed.
