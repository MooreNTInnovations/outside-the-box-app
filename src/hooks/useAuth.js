import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../config/env';

const useAuth = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    authService
      .getSession()
      .then((currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user || null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setAuthError(error.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const { data } = authService.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user || null);
      setAuthError('');
      setLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const runAuthAction = useCallback(async (action) => {
    setAuthError('');
    setLoading(true);
    try {
      return await action();
    } catch (error) {
      setAuthError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(
    (payload) => runAuthAction(() => authService.signUp(payload)),
    [runAuthAction],
  );

  const signIn = useCallback(
    (payload) => runAuthAction(() => authService.signIn(payload)),
    [runAuthAction],
  );

  const signOut = useCallback(
    () => runAuthAction(() => authService.signOut()),
    [runAuthAction],
  );

  return useMemo(
    () => ({
      session,
      user,
      loading,
      authError,
      signUp,
      signIn,
      signOut,
    }),
    [authError, loading, session, signIn, signOut, signUp, user],
  );
};

export { useAuth };
