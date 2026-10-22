import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateRegistration } from './validation';
import { RegistrationError, registerStudent } from './api/register';
import { RegisterPage } from './pages/RegisterPage';

const valid = { usn: 'PES1UG24CS924', name: 'Ravi Kumar', email: 'ravi@pes.edu', phone: '9876543210', password: 'Pass@123' };

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({ status, json: async () => body });
}

describe('registration validation (mirrors the server rules)', () => {
  it('accepts a valid form', () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it('reports every missing field', () => {
    expect(Object.keys(validateRegistration({})).sort()).toEqual(['email', 'name', 'password', 'phone', 'usn']);
  });

  it('rejects a USN that is not 13 letters or digits', () => {
    expect(validateRegistration({ ...valid, usn: 'PES1UG24CS92' }).usn).toContain('13 alphanumeric');
    expect(validateRegistration({ ...valid, usn: 'PES1UG24CS92!' }).usn).toBeTruthy();
  });

  it('rejects a bad email, a bad phone and a blank password', () => {
    expect(validateRegistration({ ...valid, email: 'ravi@pes' }).email).toBe('Enter a valid email address');
    expect(validateRegistration({ ...valid, phone: '98ab' }).phone).toBe('Enter a valid phone number');
    expect(validateRegistration({ ...valid, password: '   ' }).password).toBe('Password is required');
  });

  it('limits the name to 60 characters', () => {
    expect(validateRegistration({ ...valid, name: 'a'.repeat(61) }).name).toContain('at most 60');
  });
});

describe('registerStudent', () => {
  it('posts trimmed values as JSON and returns the created student', async () => {
    const fetchImpl = fakeFetch(201, { success: true, data: { usn: valid.usn, name: valid.name, email: valid.email } });
    const created = await registerStudent({ ...valid, name: '  Ravi Kumar ' }, { fetchImpl });

    expect(created.usn).toBe(valid.usn);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain('/api/auth/register');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body).name).toBe('Ravi Kumar');
  });

  it('maps 409 USN_EXISTS and EMAIL_EXISTS to the right field', async () => {
    const usnTaken = fakeFetch(409, { success: false, error: { code: 'USN_EXISTS', message: 'USN already registered', details: { usn: 'USN already registered' } } });
    await expect(registerStudent(valid, { fetchImpl: usnTaken })).rejects.toMatchObject({ fieldErrors: { usn: 'USN already registered' } });

    const emailTaken = fakeFetch(409, { success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
    await expect(registerStudent(valid, { fetchImpl: emailTaken })).rejects.toMatchObject({ fieldErrors: { email: 'Email already registered' } });
  });

  it('maps server validation details to fields', async () => {
    const fetchImpl = fakeFetch(400, { success: false, error: { code: 'VALIDATION_ERROR', message: 'x', details: { phone: 'Enter a valid phone number' } } });
    const error = await registerStudent(valid, { fetchImpl }).catch((caught) => caught);

    expect(error).toBeInstanceOf(RegistrationError);
    expect(error.fieldErrors).toEqual({ phone: 'Enter a valid phone number' });
  });

  it('reports a network failure and a server error in plain words', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(registerStudent(valid, { fetchImpl: down })).rejects.toThrow('Could not reach the server');

    const broken = fakeFetch(500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again' } });
    await expect(registerStudent(valid, { fetchImpl: broken })).rejects.toThrow('Something went wrong');
  });
});

describe('RegisterPage', () => {
  it('renders every field, the register button and a login link, with no errors at first', () => {
    const html = renderToStaticMarkup(<RegisterPage />);

    for (const label of ['USN', 'Full name', 'Email', 'Phone number', 'Password']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Register');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('field-error');
    expect(html).toContain('type="password"');
  });
});
