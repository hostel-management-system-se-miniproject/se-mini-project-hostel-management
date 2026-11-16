import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 200,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<3000'],
  },
};

const baseUrl = __ENV.API_BASE_URL || 'http://localhost:5000';
const usn = __ENV.TEST_USN || 'PES1UG24CS001';
const password = __ENV.TEST_PASSWORD || 'Pass@123';

const loginUrl = `${baseUrl}/api/auth/login`;
const dashboardUrl = `${baseUrl}/api/students/${encodeURIComponent(usn)}/dashboard`;

export default function () {
  const loginRes = http.post(
    loginUrl,
    JSON.stringify({ identifier: usn, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      tags: { name: 'login' },
    },
  );

  const loginOk = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });

  if (!loginOk) {
    return;
  }

  const dashboardRes = http.get(dashboardUrl, {
    tags: { name: 'dashboard' },
  });

  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
