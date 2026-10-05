import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
  UserRound,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function RegisterForm() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
        },
      },
    })

    setLoading(false)

    if (error) {
      setMessage(`❌ ${error.message}`)
      return
    }

    setMessage('✅ Cuenta creada correctamente')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 px-4 py-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-zinc-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'radial-gradient(#18181b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] border border-zinc-200/80 bg-white/95 p-7 shadow-2xl shadow-zinc-900/[0.07] backdrop-blur-xl sm:p-9">
          {/* Logo */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-lg font-bold text-white shadow-xl shadow-zinc-900/15 transition-transform duration-300 hover:-translate-y-1">
              N
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              NexaChat
            </h1>

            <div className="mt-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              <span className="text-xs font-medium text-zinc-400">
                Mensajería privada
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-900">
              Crea tu cuenta
            </h2>

            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Únete a NexaChat y comienza a conversar de forma privada.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="register-username"
                className="mb-2 block text-xs font-semibold text-zinc-700"
              >
                Nombre de usuario
              </label>

              <div className="group relative">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-700"
                />

                <input
                  id="register-username"
                  type="text"
                  placeholder="@usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-11 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5"
                />
              </div>
            </div>

            {/* Display name */}
            <div>
              <label
                htmlFor="register-display-name"
                className="mb-2 block text-xs font-semibold text-zinc-700"
              >
                Nombre para mostrar
              </label>

              <div className="group relative">
                <User
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-700"
                />

                <input
                  id="register-display-name"
                  type="text"
                  placeholder="Tu nombre"
                  value={displayName}
                  onChange={(e) =>
                    setDisplayName(e.target.value)
                  }
                  required
                  autoComplete="name"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-11 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
                className="mb-2 block text-xs font-semibold text-zinc-700"
              >
                Correo electrónico
              </label>

              <div className="group relative">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-700"
                />

                <input
                  id="register-email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-11 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="register-password"
                className="mb-2 block text-xs font-semibold text-zinc-700"
              >
                Contraseña
              </label>

              <div className="group relative">
                <LockKeyhole
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-700"
                />

                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-11 pr-12 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-900/5"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`rounded-xl border px-3.5 py-3 text-xs font-medium ${
                  message.startsWith('❌')
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <ShieldCheck
              size={14}
              className="text-emerald-500"
            />

            <span className="text-[10px] font-medium text-zinc-400">
              Tus datos están protegidos
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
          <Check size={12} className="text-emerald-500" />
          <span>Cuenta gratuita · NexaChat</span>
        </div>
      </div>
    </div>
  )
}