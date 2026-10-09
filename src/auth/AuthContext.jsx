import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  getSession,
  onAuthStateChange,
  signInWithPassword as apiSignInWithPassword,
  signUpWithPassword as apiSignUpWithPassword,
  signInWithOAuth as apiSignInWithOAuth,
  signOut as apiSignOut,
} from './session'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Initial session load
    getSession()
      .then((initialSession) => {
        if (isMounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          setIsLoading(false)
        }
      })
      .catch((error) => {
        console.error('[AuthContext] Error getting initial session:', error)
        if (isMounted) {
          setIsLoading(false)
        }
      })

    // Listen to auth state changes (login, logout, refresh, etc.)
    const unsubscribe = onAuthStateChange((newSession) => {
      if (isMounted) {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  const signInWithPassword = useCallback(async (credentials) => {
    return apiSignInWithPassword(credentials)
  }, [])

  const signUpWithPassword = useCallback(async (credentials) => {
    return apiSignUpWithPassword(credentials)
  }, [])

  const signInWithOAuth = useCallback(async (options) => {
    return apiSignInWithOAuth(options)
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setSession(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      signInWithPassword,
      signUpWithPassword,
      signInWithOAuth,
      signOut,
    }),
    [user, session, isLoading, signInWithPassword, signUpWithPassword, signInWithOAuth, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
