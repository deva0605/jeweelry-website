import { useState } from 'react'
import { useAuth } from './AuthContext'
import './Auth.css'

export default function Auth() {
  const { user, loading, login, signup, logout } = useAuth()
  const [tab, setTab]         = useState('signin')
  const [error, setError]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* ── Sign In fields ── */
  const [siEmail, setSiEmail] = useState('')
  const [siPass,  setSiPass]  = useState('')

  /* ── Sign Up fields ── */
  const [suName,  setSuName]  = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPass,  setSuPass]  = useState('')
  const [suPass2, setSuPass2] = useState('')

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    if (!siEmail || !siPass) { setError('Please fill in all fields.'); return }
    setSubmitting(true)
    try {
      await login(siEmail, siPass)
    } catch (err) {
      // err.message comes from the server (already generic)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      // Server validates all rules including password match
      await signup(suName, suEmail, suPass, suPass2)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── While restoring session from cookie ── */
  if (loading) {
    return (
      <div className="auth auth--loading">
        <span className="auth__spinner" aria-label="Loading…" />
      </div>
    )
  }

  /* ── Logged-in state ── */
  if (user) {
    return (
      <div className="auth auth--welcome">
        <p className="auth__welcome-label">Welcome back</p>
        <p className="auth__welcome-name">{user.name}</p>
        <p className="auth__welcome-email">{user.email}</p>
        <button className="btn auth__signout" type="button" onClick={logout}>
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="auth">
      {/* ── Tabs ── */}
      <div className="auth__tabs">
        <button
          className={`auth__tab${tab === 'signin' ? ' is-active' : ''}`}
          type="button"
          onClick={() => { setTab('signin'); setError('') }}
        >
          Sign In
        </button>
        <button
          className={`auth__tab${tab === 'signup' ? ' is-active' : ''}`}
          type="button"
          onClick={() => { setTab('signup'); setError('') }}
        >
          Create Account
        </button>
      </div>

      {/* ── Error ── */}
      {error && <p className="auth__error">{error}</p>}

      {/* ── Sign In form ── */}
      {tab === 'signin' && (
        <form className="auth__form" onSubmit={handleSignIn} noValidate>
          <div className="form-field">
            <label className="form-field__label" htmlFor="si-email">Email</label>
            <input
              className="form-field__input"
              id="si-email"
              type="email"
              autoComplete="email"
              value={siEmail}
              onChange={(e) => setSiEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="si-pass">Password</label>
            <input
              className="form-field__input"
              id="si-pass"
              type="password"
              autoComplete="current-password"
              value={siPass}
              onChange={(e) => setSiPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>

          <button
            className="auth__forgot"
            type="button"
            onClick={() => alert('Password reset coming soon.')}
          >
            Forgot password?
          </button>
        </form>
      )}

      {/* ── Sign Up form ── */}
      {tab === 'signup' && (
        <form className="auth__form" onSubmit={handleSignUp} noValidate>
          <div className="form-field">
            <label className="form-field__label" htmlFor="su-name">Name</label>
            <input
              className="form-field__input"
              id="su-name"
              type="text"
              autoComplete="name"
              value={suName}
              onChange={(e) => setSuName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="su-email">Email</label>
            <input
              className="form-field__input"
              id="su-email"
              type="email"
              autoComplete="email"
              value={suEmail}
              onChange={(e) => setSuEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="su-pass">Password</label>
            <input
              className="form-field__input"
              id="su-pass"
              type="password"
              autoComplete="new-password"
              value={suPass}
              onChange={(e) => setSuPass(e.target.value)}
              placeholder="Min. 6 characters"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="su-pass2">Confirm Password</label>
            <input
              className="form-field__input"
              id="su-pass2"
              type="password"
              autoComplete="new-password"
              value={suPass2}
              onChange={(e) => setSuPass2(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      )}
    </div>
  )
}

