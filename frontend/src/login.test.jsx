import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import {
  AuthRequestError,
  describeLoginError,
  fetchCurrentUser,
  login,
  logout,
} from './api/auth';
import { LoginForm } from './pages/LoginPage';

function reply(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('login request', () => {
  test('posts the identifier and password with the session cookie and returns the user', async () => {
    const fetchImpl = reply(200, {
      success: true,
      message: 'Login successful',
      data: { role: 'student', usn: 'PES1UG24CS001', name: 'Ravi Kumar' },
    });

    const user = await login('PES1UG24CS001', 'Pass@123', { fetchImpl });

    expect(user).toEqual({ role: 'student', usn: 'PES1UG24CS001', name: 'Ravi Kumar' });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/login$/);
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect(JSON.parse(options.body)).toEqual({ identifier: 'PES1UG24CS001', password: 'Pass@123' });
  });

  test('a wrong password gives the server message and status 401', async () => {
    const fetchImpl = reply(401, {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
    });

    await expect(login('PES1UG24CS001', 'bad', { fetchImpl })).rejects.toMatchObject({
      message: 'Invalid credentials',
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  test('a locked account keeps the lockout message and the remaining minutes', async () => {
    const fetchImpl = reply(423, {
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: 'Account locked. Try again in 15 minute(s)',
        details: { remainingMinutes: 15 },
      },
    });

    await expect(login('PES1UG24CS010', 'Pass@123', { fetchImpl })).rejects.toMatchObject({
      message: 'Account locked. Try again in 15 minute(s)',
      status: 423,
      details: { remainingMinutes: 15 },
    });
  });

  test('a network failure gives a readable message', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(login('a', 'b', { fetchImpl })).rejects.toThrow(/Could not reach the server/);
  });

  test('a reply that is not JSON still gives a readable message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(login('a', 'b', { fetchImpl })).rejects.toThrow('Login failed. Please try again.');
  });
});

describe('session check and logout', () => {
  test('fetchCurrentUser returns the user, or null when there is no session', async () => {
    const loggedIn = reply(200, { success: true, data: { role: 'admin', usn: null, name: null } });
    expect(await fetchCurrentUser({ fetchImpl: loggedIn })).toEqual({ role: 'admin', usn: null, name: null });
    expect(loggedIn.mock.calls[0][1].credentials).toBe('include');

    const anonymous = reply(401, {
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Session expired' },
    });
    expect(await fetchCurrentUser({ fetchImpl: anonymous })).toBeNull();
  });

  test('fetchCurrentUser throws on a server error or a network failure', async () => {
    const broken = reply(500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again' } });
    await expect(fetchCurrentUser({ fetchImpl: broken })).rejects.toThrow('Something went wrong. Please try again');

    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchCurrentUser({ fetchImpl: offline })).rejects.toThrow(/Could not reach the server/);
  });

  test('logout posts with the cookie and accepts a session that already ended', async () => {
    const done = reply(200, { success: true, message: 'Logged out' });
    await logout({ fetchImpl: done });
    expect(done.mock.calls[0][0]).toMatch(/\/api\/auth\/logout$/);
    expect(done.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });

    const ended = reply(401, { success: false, error: { code: 'SESSION_EXPIRED', message: 'Session expired' } });
    await expect(logout({ fetchImpl: ended })).resolves.toBeUndefined();

    const failed = reply(500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again' } });
    await expect(logout({ fetchImpl: failed })).rejects.toThrow('Something went wrong. Please try again');
  });
});

describe('login messages', () => {
  test('each kind of failure has its own title and style', () => {
    expect(describeLoginError(new AuthRequestError('x', { status: 423, code: 'ACCOUNT_LOCKED' }))).toEqual({
      variant: 'warning',
      title: 'Account locked',
    });
    expect(describeLoginError(new AuthRequestError('x', { status: 401 })).title).toBe('Login failed');
    expect(describeLoginError(new AuthRequestError('x', { status: 400, code: 'VALIDATION_ERROR' })).title).toBe('Check your details');
    expect(describeLoginError(new AuthRequestError('x')).title).toBe('Cannot log in');
    expect(describeLoginError(new AuthRequestError('x', { status: 500 })).title).toBe('Something went wrong');
  });
});

describe('LoginForm', () => {
  const noop = () => {};
  const render = (props = {}) =>
    renderToStaticMarkup(
      <LoginForm identifier="" password="" submitting={false} onChange={noop} onSubmit={noop} {...props} />,
    );

  test('shows both fields, a masked password and no message at first', () => {
    const html = render();
    expect(html).toContain('USN or email');
    expect(html).toContain('name="identifier"');
    expect(html).toContain('name="password"');
    expect(html).toContain('type="password"');
    expect(html).not.toContain('role="alert"');
  });

  test('shows the invalid credentials message', () => {
    const html = render({
      error: new AuthRequestError('Invalid credentials', { status: 401, code: 'INVALID_CREDENTIALS' }),
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain('alert-error');
    expect(html).toContain('Login failed');
    expect(html).toContain('Invalid credentials');
  });

  test('shows the lockout message with the minutes left', () => {
    const html = render({
      error: new AuthRequestError('Account locked. Try again in 15 minute(s)', {
        status: 423,
        code: 'ACCOUNT_LOCKED',
        details: { remainingMinutes: 15 },
      }),
    });
    expect(html).toContain('alert-warning');
    expect(html).toContain('Account locked');
    expect(html).toContain('Account locked. Try again in 15 minute(s)');
  });

  test('disables the form and changes the button text while signing in', () => {
    const html = render({ submitting: true });
    expect(html).toContain('Signing in...');
    expect(html).toMatch(/<button[^>]*disabled/);
  });
});
