# Database backup (daily mongodump)

**Applies to:** MongoDB Atlas free M0 cluster `hms-dev`, database `hms`.
**Why:** The free M0 tier has no automatic cloud backups, so we take our own daily dump.

## What is backed up
The development database named in `MONGODB_URI` (`hms`). The test database (`hms_test`) is never backed up; it is wiped by the tests.

## Prerequisite
Install the MongoDB Database Tools (`mongodump`, `mongorestore`) from the MongoDB website. They are separate from the server and are not needed for the app itself.

## Daily backup
Run once a day, with `MONGODB_URI` set to the dev connection string (never type the password into a script that is committed):

```bash
mongodump --uri="$MONGODB_URI" --gzip --out=backups/$(date +%F)
```

- Output goes to `backups/YYYY-MM-DD/`. The `backups/` folder is listed in `.gitignore` and is never committed.
- Schedule it with cron on Linux or macOS (for example `0 2 * * *`), or with Task Scheduler on Windows, calling the same command.
- Keep the last 7 days and delete older folders.

## Restore
```bash
mongorestore --uri="$MONGODB_URI" --gzip --nsInclude="hms.*" backups/YYYY-MM-DD
```
Add `--drop` only when you want existing collections replaced by the backup. After a restore, start the server once so `ensureIndexes()` re-creates any missing index.

## Rules
- The connection string and password are never committed or pasted into chat or issues.
- Take a manual dump before any risky change (bulk delete, schema change, demo day).
- Test a restore into a database ending in `_test` at least once before the final demo.
