import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { AuthRequestError, describeLoginError, login } from '../api/auth';
import '../login.css';

// The form only. It holds no state, so it can be shown in any condition.
export function LoginForm({ identifier, password, error, submitting, onChange, onSubmit }) {
  const problem = error ? describeLoginError(error) : null;

  return (
    <form className="form-card login-card" onSubmit={onSubmit} noValidate>
      <h2>Log in</h2>
      <p className="login-hint">Use your USN or email and your password.</p>

      <div className="form-grid">
        <label className="full-width">
          <span>USN or email</span>
          <input
            name="identifier"
            value={identifier}
            onChange={onChange}
            autoComplete="username"
            placeholder="PES1UG24CS001 or name@pes.edu"
            disabled={submitting}
          />
        </label>

        <label className="full-width">
          <span>Password</span>
          <input
            name="password"
            type="password"
            value={password}
            onChange={onChange}
            autoComplete="current-password"
            disabled={submitting}
          />
        </label>

        {problem ? (
          <Alert variant={problem.variant} title={problem.title} message={error.message} />
        ) : null}

        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Log in'}
        </button>

        <p className="login-hint full-width">
          New student? <a href="/register">Register here</a>
        </p>
      </div>
    </form>
  );
}

LoginForm.propTypes = {
  identifier: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  error: PropTypes.instanceOf(Error),
  submitting: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export function LoginPage({ onLoggedIn, loginImpl = login, notice = '' }) {
  const [form, setForm] = React.useState({ identifier: '', password: '' });
  const [error, setError] = React.useState(notice ? new AuthRequestError(notice) : null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const identifier = form.identifier.trim();
    if (!identifier || !form.password) {
      setError(
        new AuthRequestError('Enter your USN or email and your password.', {
          code: 'VALIDATION_ERROR',
        }),
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const user = await loginImpl(identifier, form.password);
      onLoggedIn(user);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new AuthRequestError('Login failed.'));
      setForm((previous) => ({ ...previous, password: '' }));
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <LoginForm
        identifier={form.identifier}
        password={form.password}
        error={error}
        submitting={submitting}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

LoginPage.propTypes = {
  onLoggedIn: PropTypes.func.isRequired,
  loginImpl: PropTypes.func,
  notice: PropTypes.string,
};
