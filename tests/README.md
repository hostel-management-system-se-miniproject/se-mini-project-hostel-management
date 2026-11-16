# Sprint 1 test artifacts

This directory contains the reproducible support files used for Sprint 1 validation work.

## ST-02 parallel request check

The concurrency check for the final bed allocation is scripted here:

```bash
node tests/ST-02-parallel-request.js
```

The script sets the test-mode values required by the Sprint 1 execution plan:

- SESSION_TIMEOUT_MINUTES=1
- LOCKOUT_MINUTES=1
- MAX_FAILED_LOGINS=5

It then invokes the existing room-allocation race check in `backend/scripts/race-last-bed.js`.

## NFR-03 session expiry check

The session expiry check is scripted in `tests/check-session-timeout.js`. Start the API with a 1-minute session timeout, then run the script from the `backend` folder:

```bash
# PowerShell: $env:SESSION_TIMEOUT_MINUTES=1; npm run dev      (in backend)
node ../tests/check-session-timeout.js                            # in a second terminal, in backend
```

It logs in as `student012@pes.edu` (override with `HMS_LOGIN` and `HMS_PASSWORD`) and calls `/api/auth/me` three times. Expected output:

```
Right after login:     HTTP 200
After 40 seconds:      HTTP 200
After 90 more seconds: HTTP 401 SESSION_EXPIRED
```

The script prints only status codes, never a cookie or password. Stop the API and start it normally afterwards.

## HMS-20 performance validation

The 200-user load scenario is stored under `tests/performance`.

```bash
bash tests/performance/run.sh
```

This runs a k6 script that exercises the login flow and representative dashboard requests for 200 concurrent virtual users. The recorded benchmark status is stored in `tests/performance/results.json` and `tests/performance/results.md`.

## Test mode environment

The environment file `tests/test-mode.env` can be loaded before running the app or test commands:

```bash
set -a
. ./tests/test-mode.env
set +a
```

This keeps the lockout and session timeout values aligned with Sprint 1 execution requirements.
