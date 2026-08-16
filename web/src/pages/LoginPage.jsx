/**
 * Sign-in page.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

/**
 * Renders the resident sign-in page.
 *
 * @returns {JSX.Element} The controlled sign-in form.
 */
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Signs the resident in and returns them to their requested page.
   *
   * @param {import('react').FormEvent} event event Form submission event.
   * @returns {Promise<void>} A promise that settles after the login attempt.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await login({ email, password });
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="centred">
      <form className="panel form" onSubmit={handleSubmit}>
        <h2>Sign in</h2>

        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <p className="state state--error">{error}</p> : null}

        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="form__footnote">
          No account yet? <Link to="/register">Register</Link>.
        </p>

        <p className="form__footnote form__footnote--muted">
          Seeded demo account: <code>lotte@buurtwacht.local</code> /{' '}
          <code>Buurtwacht!2026</code>
        </p>
      </form>
    </div>
  );
}
