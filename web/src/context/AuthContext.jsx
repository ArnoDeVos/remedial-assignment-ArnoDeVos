/**
 * Application-wide authentication state and actions.
 *
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import api, { readToken, writeToken } from '../api/client.js';

const AuthContext = createContext(null);

/**
 * Provides the authenticated resident and authentication actions to descendants.
 *
 * @param {object} props Component props.
 * @param {import('react').ReactNode} props.children Subtree to render.
 * @returns {JSX.Element} The authentication context provider.
 */
export function AuthProvider({ children }) {
  const [resident, setResident] = useState(null);
  const [isRestoring, setIsRestoring] = useState(Boolean(readToken()));

  useEffect(() => {
    if (!readToken()) {
      setIsRestoring(false);
      return undefined;
    }

    const controller = new AbortController();

    api.auth
      .me(controller.signal)
      .then((payload) => setResident(payload.resident))
      .catch(() => {
        writeToken(null);
        setResident(null);
      })
      .finally(() => setIsRestoring(false));

    return () => controller.abort();
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await api.auth.login(credentials);
    writeToken(result.token);
    setResident(result.resident);
    return result.resident;
  }, []);

  const register = useCallback(async (details) => {
    const result = await api.auth.register(details);
    writeToken(result.token);
    setResident(result.resident);
    return result.resident;
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setResident(null);
  }, []);

  const value = useMemo(
    () => ({
      resident,
      isRestoring,
      isSignedIn: Boolean(resident),
      isModerator: resident?.role === 'moderator',
      login,
      register,
      logout,
    }),
    [resident, isRestoring, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Returns the authentication context for a component below AuthProvider.
 *
 * @returns {object} The current authentication state and actions.
 * @throws {Error} When called outside AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}

export default AuthContext;
