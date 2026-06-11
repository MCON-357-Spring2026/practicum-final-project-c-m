import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000/api'

// Main authenticated view: a form to log new sightings and a feed of past ones.
function Dashboard({ user, handleLogout }) {
  const [sightings, setSightings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Fetch this user's sightings as soon as the dashboard mounts.
  useEffect(() => {
    let active = true

    const loadSightings = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const response = await fetch(`${API_BASE}/sightings/user/${user.id}`)
        const data = await response.json()
        if (!active) return
        if (response.ok) {
          setSightings(data)
        } else {
          setLoadError(data.error || 'Could not load your sightings.')
        }
      } catch (err) {
        if (active) setLoadError('Could not reach the server.')
        console.error('Failed to load sightings:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSightings()

    // Guard against setting state after unmount.
    return () => {
      active = false
    }
  }, [user.id])

  // Called by the form when a new sighting is saved successfully.
  const addSighting = (newSighting) => {
    setSightings((prev) => [newSighting, ...prev])
  }

  // Remove a sighting from the feed after a successful DELETE.
  const removeSighting = (id) => {
    setSightings((prev) => prev.filter((s) => s.id !== id))
  }

  // Replace a sighting in place after a successful PUT.
  const updateSighting = (updated) => {
    setSightings((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Birdwatcher's Diary</h1>
          <p style={styles.subtitle}>
            Logged in as <strong>{user.username}</strong>
          </p>
        </div>
        <button type="button" onClick={handleLogout} style={styles.logoutButton}>
          Log Out
        </button>
      </header>

      <div style={styles.layout}>
        <SightingForm userId={user.id} onAdd={addSighting} />

        <section style={styles.feed}>
          <h2 style={styles.feedHeading}>Your Sightings</h2>

          {loading && <p style={styles.muted}>Loading your sightings…</p>}

          {loadError && <p style={styles.error}>{loadError}</p>}

          {!loading && !loadError && sightings.length === 0 && (
            <p style={styles.muted}>No bird sightings logged yet. Go explore! 🐦</p>
          )}

          {sightings.map((s) => (
            <SightingCard
              key={s.id}
              sighting={s}
              onDelete={removeSighting}
              onUpdate={updateSighting}
            />
          ))}
        </section>
      </div>
    </div>
  )
}

// Form for logging a new sighting.
function SightingForm({ userId, onAdd }) {
  const [species, setSpecies] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = { user_id: userId, species, location, date, notes }

    try {
      const response = await fetch(`${API_BASE}/sightings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (response.ok) {
        onAdd(data) // Append to the feed instantly — no refresh needed.
        // Reset the form for the next entry.
        setSpecies('')
        setLocation('')
        setDate('')
        setNotes('')
      } else {
        setError(data.error || 'Could not save your sighting.')
      }
    } catch (err) {
      setError('Could not reach the server. Please try again.')
      console.error('Failed to save sighting:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.formHeading}>Log a New Sighting</h2>

      <label style={styles.label}>
        Species
        <input
          type="text"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          placeholder="American Robin"
          required
          style={styles.input}
        />
      </label>

      <label style={styles.label}>
        Location
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Central Park, NYC"
          required
          style={styles.input}
        />
      </label>

      <label style={styles.label}>
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          style={styles.input}
        />
      </label>

      <label style={styles.label}>
        Field Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Spotted near the pond, bright orange breast…"
          rows={4}
          style={{ ...styles.input, resize: 'vertical' }}
        />
      </label>

      {error && <p style={styles.error}>{error}</p>}

      <button type="submit" style={styles.submitButton} disabled={saving}>
        {saving ? 'Saving…' : 'Add Sighting'}
      </button>
    </form>
  )
}

// A single sighting rendered as a card, with inline edit + delete.
function SightingCard({ sighting, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [location, setLocation] = useState(sighting.location)
  const [notes, setNotes] = useState(sighting.notes || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false) // true during save or delete
  const [showSummary, setShowSummary] = useState(false) // collapsible facts
  const [showImage, setShowImage] = useState(false) // image popup modal

  // Reset the editable fields and drop back to read-only view.
  const cancelEdit = () => {
    setLocation(sighting.location)
    setNotes(sighting.notes || '')
    setError('')
    setEditing(false)
  }

  const handleDelete = async () => {
    setError('')
    setBusy(true)
    try {
      const response = await fetch(`${API_BASE}/sightings/${sighting.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        onDelete(sighting.id) // Remove from the feed instantly.
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Could not delete this sighting.')
        setBusy(false)
      }
    } catch (err) {
      setError('Could not reach the server. Please try again.')
      console.error('Failed to delete sighting:', err)
      setBusy(false)
    }
    // On success the card unmounts, so no need to reset `busy`.
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await fetch(`${API_BASE}/sightings/${sighting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, notes }),
      })
      const data = await response.json()
      if (response.ok) {
        onUpdate(data) // Update the entry in place.
        setEditing(false)
      } else {
        setError(data.error || 'Could not save your changes.')
      }
    } catch (err) {
      setError('Could not reach the server. Please try again.')
      console.error('Failed to update sighting:', err)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} style={styles.card}>
        <h3 style={styles.species}>{sighting.species}</h3>
        <p style={styles.meta}>{formatDate(sighting.date)}</p>

        <label style={styles.label}>
          Location
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Field Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </label>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.cardActions}>
          <button type="submit" style={styles.saveButton} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            style={styles.cancelButton}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <article style={styles.card}>
      <div style={styles.cardHead}>
        <h3 style={styles.species}>{sighting.species}</h3>
        {sighting.image_url && (
          <button
            type="button"
            onClick={() => setShowImage(true)}
            style={styles.imageIconButton}
            title="View photo"
            aria-label={`View photo of ${sighting.species}`}
          >
            📷
          </button>
        )}
      </div>

      <p style={styles.meta}>
        {formatDate(sighting.date)} · {sighting.location}
      </p>

      {sighting.notes && (
        <p style={styles.notes}>
          <span style={styles.notesLabel}>Field notes: </span>
          {sighting.notes}
        </p>
      )}

      {sighting.audio_url && (
        <audio
          src={sighting.audio_url}
          controls
          style={{ width: '100%', marginTop: '10px' }}
        />
      )}

      {sighting.wikipedia_summary && (
        <div style={styles.summaryBlock}>
          <button
            type="button"
            onClick={() => setShowSummary((open) => !open)}
            style={styles.summaryToggle}
            aria-expanded={showSummary}
          >
            <span>{showSummary ? '▾' : '▸'}</span> Wikipedia facts
          </button>
          {showSummary && (
            <p style={styles.summary}>{sighting.wikipedia_summary}</p>
          )}
        </div>
      )}

      {showImage && sighting.image_url && (
        <ImageModal
          src={sighting.image_url}
          alt={sighting.species}
          caption={sighting.species}
          onClose={() => setShowImage(false)}
        />
      )}

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.cardActions}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={styles.editButton}
          disabled={busy}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          style={styles.deleteButton}
          disabled={busy}
        >
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </article>
  )
}

// Full-screen popup that shows a sighting's image until the user closes it.
function ImageModal({ src, alt, caption, onClose }) {
  // Close when the backdrop (but not the image itself) is clicked.
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div style={styles.overlay} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        <button
          type="button"
          onClick={onClose}
          style={styles.modalClose}
          aria-label="Close photo"
        >
          ✕
        </button>
        <img src={src} alt={alt} style={styles.modalImage} />
        {caption && <p style={styles.modalCaption}>{caption}</p>}
      </div>
    </div>
  )
}

// Render an ISO date (YYYY-MM-DD) as a friendly, locale-aware string.
function formatDate(iso) {
  if (!iso) return ''
  const parsed = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    color: '#2c3e50',
  },
  subtitle: {
    margin: '0.25rem 0 0',
    color: '#5b6b7b',
    fontSize: '0.9rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#2e7d4f',
    backgroundColor: 'transparent',
    border: '1px solid #2e7d4f',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) 2fr',
    gap: '1.5rem',
    alignItems: 'start',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    padding: '1.5rem',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    position: 'sticky',
    top: '1rem',
  },
  formHeading: {
    margin: 0,
    fontSize: '1.15rem',
    color: '#2c3e50',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#34495e',
  },
  input: {
    padding: '0.55rem 0.7rem',
    fontSize: '0.95rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontWeight: 400,
    fontFamily: 'inherit',
  },
  submitButton: {
    marginTop: '0.25rem',
    padding: '0.7rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2e7d4f',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  feedHeading: {
    margin: 0,
    fontSize: '1.15rem',
    color: '#2c3e50',
  },
  card: {
    padding: '1.1rem 1.25rem',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
    borderLeft: '4px solid #2e7d4f',
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  imageIconButton: {
    background: '#eef4f0',
    border: '1px solid #cde0d4',
    borderRadius: '8px',
    fontSize: '1.1rem',
    lineHeight: 1,
    padding: '0.35rem 0.5rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  species: {
    margin: '0 0 0.3rem',
    fontSize: '1.25rem',
    color: '#1f3a2c',
  },
  meta: {
    margin: '0 0 0.5rem',
    fontSize: '0.85rem',
    color: '#7a8a99',
    fontWeight: 600,
  },
  summaryBlock: {
    marginTop: '0.7rem',
  },
  summaryToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#2e7d4f',
    cursor: 'pointer',
  },
  summary: {
    margin: '0.5rem 0 0',
    fontSize: '0.9rem',
    color: '#4a5a6a',
    lineHeight: 1.55,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    zIndex: 1000,
  },
  modal: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1rem',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
  },
  modalClose: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    width: '2rem',
    height: '2rem',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#ffffff',
    fontSize: '1rem',
    cursor: 'pointer',
    lineHeight: 1,
  },
  modalImage: {
    maxWidth: '100%',
    maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '8px',
    display: 'block',
  },
  modalCaption: {
    margin: '0.75rem 0 0',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#2c3e50',
  },
  notes: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#3c4858',
    lineHeight: 1.5,
  },
  notesLabel: {
    fontWeight: 600,
    color: '#2c3e50',
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.9rem',
  },
  editButton: {
    padding: '0.4rem 0.9rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#2e7d4f',
    backgroundColor: 'transparent',
    border: '1px solid #2e7d4f',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.4rem 0.9rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#c0392b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '0.4rem 0.9rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2e7d4f',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '0.4rem 0.9rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#5b6b7b',
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  muted: {
    color: '#7a8a99',
    fontStyle: 'italic',
  },
  error: {
    margin: 0,
    color: '#c0392b',
    fontSize: '0.85rem',
  },
}

export default Dashboard
