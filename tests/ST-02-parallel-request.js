'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const env = {
  ...process.env,
  SESSION_TIMEOUT_MINUTES: '1',
  LOCKOUT_MINUTES: '1',
  MAX_FAILED_LOGINS: '5'
};

const backendRaceScript = path.join(__dirname, '..', 'backend', 'scripts', 'race-last-bed.js');
const result = spawnSync(process.execPath, [backendRaceScript, '--rounds', '20'], {
  stdio: 'inherit',
  env
});

if (result.error) {
  console.error('ST-02 parallel-request script failed to start:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
