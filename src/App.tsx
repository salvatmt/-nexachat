import { useState } from 'react'
import RegisterForm from './components/auth/RegisterForm'
import LoginForm from './components/auth/LoginForm'
import ChatPage from './pages/ChatPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppContent() {
  const { user, loading, signOut } = useAuth()

  const [showLogin, setShowLogin] = useState(false)

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />

          <p className="text-sm text-zinc-400">
            Comprobando sesión...
          </p>
        </div>
      </main>
    )
  }

  if (user) {
    return (
      <ChatPage
        userEmail={user.email ?? 'Usuario'}
        onSignOut={signOut}
      />
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        {showLogin ? <LoginForm /> : <RegisterForm />}

        <button
          type="button"
          onClick={() => setShowLogin(!showLogin)}
          className="mt-4 w-full text-sm text-zinc-400 transition hover:text-white"
        >
          {showLogin
            ? '¿No tienes cuenta? Regístrate'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App