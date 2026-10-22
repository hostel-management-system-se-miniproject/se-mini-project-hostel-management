import React from 'react';
import { Alert } from '../components/Alert';
import { registerStudent } from '../api/register';
import { REGISTRATION_FIELDS, validateRegistration } from '../validation';
import '../register.css';

// The login page is shown at the site root whenever nobody is logged in (see AuthGate).
export const LOGIN_PATH = '/';

const EMPTY_VALUES = { usn: '', name: '', email: '', phone: '', password: '' };

const FIELD_CONFIG = [
  { name: 'usn', label: 'USN', type: 'text', placeholder: 'PES1UG24CS924', autoComplete: 'username', maxLength: 13 },
  { name: 'name', label: 'Full name', type: 'text', placeholder: 'Ravi Kumar', autoComplete: 'name', maxLength: 60 },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'ravi@pes.edu', autoComplete: 'email', maxLength: 80 },
  { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '9876543210', autoComplete: 'tel', maxLength: 15 },
  { name: 'password', label: 'Password', type: 'password', placeholder: '', autoComplete: 'new-password' },
];

export function RegisterPage() {
  const [values, setValues] = React.useState(EMPTY_VALUES);
  const [touched, setTouched] = React.useState({});
  const [serverErrors, setServerErrors] = React.useState({});
  const [formError, setFormError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [registered, setRegistered] = React.useState(null);

  const clientErrors = validateRegistration(values);
  // A field shows its message only after the student has left it or tried to submit.
  // A server message (for example "USN already registered") stays until that field is edited.
  const visibleError = (field) => serverErrors[field] || (touched[field] ? clientErrors[field] : '');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setServerErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(Object.fromEntries(REGISTRATION_FIELDS.map((field) => [field, true])));
    setFormError('');

    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const created = await registerStudent(values);
      setRegistered(created);
      setValues(EMPTY_VALUES);
      setTouched({});
      setServerErrors({});
    } catch (error) {
      setServerErrors(error.fieldErrors ?? {});
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <main className="login-page">
        <div className="form-card login-card">
          <Alert
            variant="success"
            title="Registration successful"
            message={`Welcome, ${registered.name}. You can now log in with your USN or email.`}
          />
          <p>
            <a href={LOGIN_PATH}>Go to login</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="form-card login-card">
        <h2>Student registration</h2>

        <form className="form-grid" onSubmit={handleSubmit} noValidate aria-label="Student registration">
          {FIELD_CONFIG.map((field) => {
            const message = visibleError(field.name);
            const errorId = `${field.name}-error`;
            return (
              <label key={field.name} className="full-width">
                <span>{field.label}</span>
                <input
                  name={field.name}
                  type={field.type}
                  value={values[field.name]}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  maxLength={field.maxLength}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={message ? 'true' : 'false'}
                  aria-describedby={message ? errorId : undefined}
                />
                {message ? (
                  <span id={errorId} className="field-error" role="alert">
                    {message}
                  </span>
                ) : null}
              </label>
            );
          })}

          {formError ? <Alert variant="error" title="Could not register" message={formError} /> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Registering …' : 'Register'}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <a href={LOGIN_PATH}>Log in</a>
        </p>
      </div>
    </main>
  );
}
