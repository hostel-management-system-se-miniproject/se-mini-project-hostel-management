# Sprint 1 test artifacts

This directory contains the reproducible support files used for the Sprint 1 validation work.

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

## Test mode environment

The environment file `tests/test-mode.env` can be loaded before running the app or test commands:

```bash
set -a
. ./tests/test-mode.env
set +a
```

This keeps the lockout and session timeout values aligned with Sprint 1 execution requirements.
