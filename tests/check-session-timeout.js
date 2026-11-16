// NFR-03 check: the session ends after inactivity.
// Start the API first with SESSION_TIMEOUT_MINUTES=1, then run from the backend folder:
//   node ../tests/check-session-timeout.js
// Prints only HTTP status codes. No cookie, session id or password is printed.
const API = process.env.API_URL || 'http://localhost:5000';
const LOGIN = process.env.HMS_LOGIN || 'student012@pes.edu';
const PASSWORD = process.env.HMS_PASSWORD || 'Pass@123';
const PROTECTED = '/api/auth/me';

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

async function login() {
  const res = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: LOGIN, password: PASSWORD }),
  });
  if (res.status !== 200) {
    throw new Error('Login failed with HTTP ' + res.status + '. Check that the API is running and the account exists.');
  }
  return (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
}

async function check(cookie) {
  const res = await fetch(API + PROTECTED, { headers: { Cookie: cookie } });
  let code = '';
  try { code = (await res.json())?.error?.code || ''; } catch { /* no body */ }
  return `${res.status}${code ? ' ' + code : ''}`;
}

(async () => {
  const cookie = await login();
  console.log('Right after login:    HTTP', await check(cookie));
  await sleep(40);
  console.log('After 40 seconds:     HTTP', await check(cookie));
  await sleep(90);
  console.log('After 90 more seconds: HTTP', await check(cookie));
})().catch((e) => { console.error(e.message); process.exit(1); });
