import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = Number(__ENV.VUS || 200);
const DURATION_SECONDS = Number(__ENV.DURATION_SECONDS || 60);
const STUDENT_EMAIL = __ENV.STUDENT_EMAIL || 'student@example.com';
const STUDENT_PASSWORD = __ENV.STUDENT_PASSWORD || 'Password123!';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Password123!';

const loginDuration = new Trend('login_duration_ms');
const dashboardDuration = new Trend('dashboard_duration_ms');
const loginDashboardErrors = new Rate('login_dashboard_errors');

export const options = {
  scenarios: {
    load_test: {
      executor: 'constant-vus',
      vus: VUS,
      duration: `${DURATION_SECONDS}s`,
    },
  },
  thresholds: {
    login_duration_ms: ['p(95)<3000'],
    dashboard_duration_ms: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

function loginAs(username, password) {
  const payload = JSON.stringify({ email: username, password });
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  loginDuration.add(res.timings.duration);
  const success = res.status >= 200 && res.status < 300;
  loginDashboardErrors.add(!success);

  check(res, {
    'login succeeded': (r) => r.status >= 200 && r.status < 300,
  });

  return res;
}

function requestDashboard(role) {
  const endpoint = role === 'admin' ? `${BASE_URL}/api/rooms` : `${BASE_URL}/api/auth/me`;
  const res = http.get(endpoint);

  dashboardDuration.add(res.timings.duration);
  const success = res.status >= 200 && res.status < 300;
  loginDashboardErrors.add(!success);

  check(res, {
    'dashboard succeeded': (r) => r.status >= 200 && r.status < 300,
  });

  return res;
}

export default function () {
  const role = __VU % 2 === 0 ? 'student' : 'admin';
  const loginUser = role === 'admin' ? ADMIN_EMAIL : STUDENT_EMAIL;
  const loginPassword = role === 'admin' ? ADMIN_PASSWORD : STUDENT_PASSWORD;

  loginAs(loginUser, loginPassword);
  requestDashboard(role);
  sleep(0.5);
}
