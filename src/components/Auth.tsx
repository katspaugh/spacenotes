import { useState } from 'react'
import { signIn, signUp } from '../services/supabaseService.js'

type AuthProps = {
  onSuccess?: () => void
}

export function Auth({ onSuccess }: AuthProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    if (isSignUp) {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else setMessage('Check your email to confirm sign up')
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Signed in!')
        onSuccess?.()
      }
    }
    setLoading(false)
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    setMessage(null)
  }

  return (
    <form className="Auth" onSubmit={onSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {loading && <div className="Auth_loader">Loading…</div>}
      {message && <div className="Auth_message">{message}</div>}
      {error && <div className="Auth_error">{error}</div>}
      <button type="submit" disabled={loading}>
        {isSignUp ? 'Sign up' : 'Sign in'}
      </button>
      <button
        type="button"
        className="Auth_textButton"
        onClick={toggleMode}
        disabled={loading}
      >
        {isSignUp ? 'Have an account? Sign in' : 'Need an account? Sign up'}
      </button>
    </form>
  )
}
