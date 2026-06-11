import { useState } from 'react'
import AuthForm from './components/AuthForm'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  // Whether a user is currently authenticated.
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // The logged-in user's data (e.g. id, username) returned by the backend.
  const [user, setUser] = useState(null)

  // Which screen to show: 'login', 'register', or 'dashboard'.
  const [view, setView] = useState('login')

  // Called by AuthForm after a successful login/registration response.
  const onAuthSuccess = (userData) => {
    setUser(userData)
    setIsLoggedIn(true)
    setView('dashboard')
  }

  // Clear the session and return to the login screen.
  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
    setView('login')
  }

  // The dashboard is top-aligned and full-width; auth screens are centered.
  const pageStyle = isLoggedIn
    ? { ...styles.page, ...styles.pageDashboard }
    : { ...styles.page, ...styles.pageCentered }

  return (
    <div style={pageStyle}>
      {isLoggedIn ? (
        <Dashboard user={user} handleLogout={handleLogout} />
      ) : (
        <AuthForm
          mode={view}
          onSwitchMode={() =>
            setView(view === 'login' ? 'register' : 'login')
          }
          onAuthSuccess={onAuthSuccess}
        />
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: '#f0f4f1',
    padding: '1.5rem',
    boxSizing: 'border-box',
  },
  pageCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageDashboard: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
}

export default App
