import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as auth from '../services/auth'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await auth.me()
        if (!mounted) return
        setAuthed(true)
      } catch {
        setAuthed(false)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Checking authentication...</div>
  if (!authed) return <Navigate to="/" replace />
  return children
}
