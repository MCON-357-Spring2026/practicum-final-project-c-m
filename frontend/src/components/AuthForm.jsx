import { useState } from 'react'

const API_BASE = 'http://127.0.0.1:5000/api'

// Shared form used for both the Login and Registration screens.
// `mode` is either 'login' or 'register'. `onSwitchMode` flips between them.
// `onAuthSuccess` is called with the backend's user data on a successful auth.
function AuthForm({ mode, onSwitchMode, onAuthSuccess }) {
  const isLogin = mode === 'login'

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    // Only include the email field when registering.
    const formData = isLogin
      ? { username, password }
      : { username, email, password }

    const endpoint = isLogin ? `${API_BASE}/login` : `${API_BASE}/register`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // 200 / 201 — hand the user data up to App. Login nests it under
        // `user`; register returns the user object directly.
        onAuthSuccess(data.user || data)
      } else {
        // 400 / 401 / etc. — surface the backend's `error` message to the user.
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      // Network failure, server down, or non-JSON response.
      setError('Could not reach the server. Please try again.')
      console.error('Auth request failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.heading}>{isLogin ? 'Log In' : 'Create Account'}</h2>

      <label style={styles.label}>
        Username
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="birdlover42"
          autoComplete="username"
          required
          style={styles.input}
        />
      </label>

      {/* Email is only relevant when registering a new account. */}
      {!isLogin && (
        <label style={styles.label}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            style={styles.input}
          />
        </label>
      )}

      <label style={styles.label}>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          required
          style={styles.input}
        />
      </label>

      {/* Dynamically display any error returned by the backend. */}
      {error && <p style={styles.error}>{error}</p>}

      <button type="submit" style={styles.submitButton} disabled={submitting}>
        {submitting
          ? 'Please wait…'
          : isLogin
            ? 'Log In'
            : 'Register'}
      </button>

      <button
        type="button"
        onClick={() => {
          setError('')
          onSwitchMode()
        }}
        style={styles.toggleButton}
      >
        {isLogin
          ? 'Need an account? Register here'
          : 'Already have an account? Log in here'}
      </button>
    </form>
  )
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
    maxWidth: '360px',
    padding: '2rem',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
  },
  heading: {
    margin: 0,
    textAlign: 'center',
    color: '#2c3e50',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#34495e',
    textAlign: 'left',
  },
  input: {
    padding: '0.6rem 0.75rem',
    fontSize: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontWeight: 400,
  },
  submitButton: {
    marginTop: '0.5rem',
    padding: '0.7rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2e7d4f',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#2e7d4f',
    fontSize: '0.85rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  error: {
    margin: 0,
    color: '#c0392b',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
}

export default AuthForm
