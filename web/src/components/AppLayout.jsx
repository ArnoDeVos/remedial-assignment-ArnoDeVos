/**
 * Application shell: header, navigation and the routed page.
 */

import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

/**
 * Renders the persistent chrome around every page.
 *
 * @returns {JSX.Element} The layout.
 */
export default function AppLayout() {
  const { resident, isSignedIn, isModerator, logout } = useAuth();

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          <span className="shell__logo" aria-hidden="true" />
          <div>
            <h1>Buurtwacht</h1>
            <p>Neighbourhood sightings, mapped</p>
          </div>
        </div>

        <nav className="shell__nav" aria-label="Main">
          <NavLink to="/" end>
            Map
          </NavLink>
          <NavLink to="/subjects">Subjects</NavLink>
          {isModerator ? <NavLink to="/review">Review</NavLink> : null}
        </nav>

        <div className="shell__account">
          {isSignedIn ? (
            <>
              <span className="shell__resident">
                {resident.displayName}
                {isModerator ? <span className="badge badge--role">moderator</span> : null}
              </span>
              <button type="button" className="button button--ghost" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="button button--ghost">
                Sign in
              </NavLink>
              <NavLink to="/register" className="button">
                Register
              </NavLink>
            </>
          )}
        </div>
      </header>

      <main className="shell__main">
        <Outlet />
      </main>

      <footer className="shell__footer">
        <p>
          Based on Asse, fictional map
        </p>
      </footer>
    </div>
  );
}
