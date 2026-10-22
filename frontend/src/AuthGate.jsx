import React from 'react';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { fetchCurrentUser, logout } from './api/auth';
import { Alert } from './components/Alert';

// Asks the server who is logged in. Shows the login page when nobody is,
// and the application when someone is.
export function AuthGate() {
  const [state, setState] = React.useState({ status: 'checking', user: null, notice: '' });

  React.useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setState(user ? { status: 'in', user, notice: '' } : { status: 'out', user: null, notice: '' });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ status: 'out', user: null, notice: error.message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoggedIn = (user) => setState({ status: 'in', user, notice: '' });

  const handleLogout = async () => {
    try {
      await logout();
      setState({ status: 'out', user: null, notice: '' });
    } catch (error) {
      setState((previous) => ({ ...previous, notice: error.message }));
    }
  };

  if (state.status === 'checking') {
    return <p className="login-checking">Checking your session...</p>;
  }

  if (state.status === 'out') {
    // Registration is public, so it is shown at /register while nobody is logged in.
    if (window.location.pathname.replace(/\/+$/, '') === '/register') {
      return <RegisterPage />;
    }
    return <LoginPage onLoggedIn={handleLoggedIn} notice={state.notice} />;
  }

  return (
    <>
      {state.notice ? <Alert variant="error" title="Log out failed" message={state.notice} /> : null}
      <App user={state.user} onLogout={handleLogout} />
    </>
  );
}
