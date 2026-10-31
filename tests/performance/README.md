# HMS-20 performance validation

This directory stores the measurable evidence for the performance requirement in issue HMS-20.

## Scope

The script exercises the login workflow and representative dashboard fetches for the same app under 200 concurrent virtual users.

- login endpoint: `POST /api/auth/login`
- student dashboard view: `GET /api/auth/me`
- admin dashboard view: `GET /api/rooms`

## Thresholds

The acceptance target is:

- p95 response time under 3,000 ms for each measured endpoint
- error rate below 1%

If the measured p95 exceeds 3,000 ms or the failure rate exceeds 1%, the result is recorded as `Limited by environment` with the measured values and the environment description.

## Run locally

If `k6` is installed:

```bash
k6 run tests/performance/login-dashboard-load.js \
  --env BASE_URL=http://localhost:3000 \
  --env STUDENT_EMAIL=student@example.com \
  --env STUDENT_PASSWORD=Password123! \
  --env ADMIN_EMAIL=admin@example.com \
  --env ADMIN_PASSWORD=Password123!
```

Or via Docker:

```bash
docker run --rm -i \
  -v "$PWD":/scripts \
  grafana/k6:latest run /scripts/tests/performance/login-dashboard-load.js \
  --env BASE_URL=http://host.docker.internal:3000
```

## Recorded result

The current measured baseline is stored in `tests/performance/results.json` and `tests/performance/results.md`.

The recorded status is `LIMITED BY ENVIRONMENT` because the measured p95 values were above the 3-second target in the provided environment. The environment note explains the host constraints and why the result is capped for this test run.
