/**
 * Registration page.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNeighbourhoodMap } from '../hooks/useNeighbourhood.js';

/**
 * Renders the resident registration page.
 *
 * @returns {JSX.Element} The controlled registration form.
 */
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const mapResource = useNeighbourhoodMap();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [homeZoneCode, setHomeZoneCode] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Registers the resident and redirects to the homepage.
   *
   * @param {import('react').FormEvent} event Form submission event.
   * @returns {Promise<void>} A promise that settles after registration.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await register({
        email,
        displayName,
        password,
        ...(homeZoneCode ? { homeZoneCode } : {}),
      });

      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught.message);

      if (caught instanceof ApiError && caught.details) {
        setFieldErrors(caught.details);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="centred">
      <form className="panel form" onSubmit={handleSubmit}>
        <h2>Register</h2>

        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          {fieldErrors.email ? <em className="field__error">{fieldErrors.email}</em> : null}
        </label>

        <label className="field">
          <span>Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="nickname"
            required
          />
          {fieldErrors.displayName ? (
            <em className="field__error">{fieldErrors.displayName}</em>
          ) : null}
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <small className="field__hint">
            Use at least 10 characters, including lowercase, uppercase and a number.
          </small>
          {fieldErrors.password ? <em className="field__error">{fieldErrors.password}</em> : null}
        </label>

        <label className="field">
          <span>Which zone do you live in? (optional)</span>
          <select value={homeZoneCode} onChange={(event) => setHomeZoneCode(event.target.value)}>
            <option value="">Prefer not to say</option>
            {(mapResource.data?.zones ?? []).map((zone) => (
              <option key={zone.code} value={zone.code}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="state state--error">{error}</p> : null}

        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="form__footnote">
          Already registered? <Link to="/login">Sign in</Link>.
        </p>
      </form>
    </div>
  );
}
