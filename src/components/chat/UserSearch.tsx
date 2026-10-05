import { useEffect, useState } from 'react'
import {
  Search,
  UserRound,
  X,
} from 'lucide-react'

import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  status: 'online' | 'offline'
  last_seen: string | null
}

type UserSearchProps = {
  onConversationCreated?: (
    conversationId: string,
    profile: Profile
  ) => void
}

export default function UserSearch({
  onConversationCreated,
}: UserSearchProps) {
  const { user } = useAuth()

  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingConversation, setCreatingConversation] =
    useState<string | null>(null)
  const [error, setError] = useState('')

  /*
   * ------------------------------------------------------
   * BUSCAR USUARIOS
   * ------------------------------------------------------
   */

  useEffect(() => {
    const searchUsers = async () => {
      const search = query.trim()

      if (!search) {
        setUsers([])
        setError('')
        return
      }

      if (!user) {
        setUsers([])
        return
      }

      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, username, display_name, avatar_url, status, last_seen'
        )
        .or(
          `username.ilike.%${search}%,display_name.ilike.%${search}%`
        )
        .neq('id', user.id)
        .limit(10)

      if (error) {
        console.error(
          'Error buscando usuarios:',
          error
        )

        setUsers([])
        setError(
          'No se pudieron buscar los usuarios.'
        )
      } else {
        setUsers(data ?? [])
      }

      setLoading(false)
    }

    const timeout = window.setTimeout(
      searchUsers,
      300
    )

    return () => {
      window.clearTimeout(timeout)
    }
  }, [query, user?.id])

  /*
   * ------------------------------------------------------
   * CREAR / ABRIR CONVERSACIÓN
   * ------------------------------------------------------
   */

  const handleUserClick = async (
    profile: Profile
  ) => {
    if (!user) return

    setCreatingConversation(profile.id)
    setError('')

    const { data, error } =
      await supabase.rpc(
        'create_direct_conversation',
        {
          target_user_id: profile.id,
        }
      )

    setCreatingConversation(null)

    if (error) {
      console.error(
        'Error creando conversación:',
        error
      )

      setError(error.message)
      return
    }

    onConversationCreated?.(
      data as string,
      profile
    )

    /*
     * Limpiar búsqueda después
     * de abrir la conversación.
     */
    setQuery('')
    setUsers([])
  }

  /*
   * ------------------------------------------------------
   * ESTADO ONLINE
   * ------------------------------------------------------
   */

  const isProfileOnline = (
    profile: Profile
  ) => {
    if (
      profile.status !== 'online' ||
      !profile.last_seen
    ) {
      return false
    }

    const lastSeen = new Date(
      profile.last_seen
    ).getTime()

    return (
      Date.now() -
        lastSeen <
      60_000
    )
  }

  const hasQuery =
    query.trim().length > 0

  /*
   * ------------------------------------------------------
   * RENDER
   * ------------------------------------------------------
   */

  return (
    <div className="space-y-3">

      {/* ==================================================
          TÍTULO
      ================================================== */}

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
            Buscar personas
          </h2>

          <p className="mt-0.5 text-[11px] leading-5 text-zinc-400">
            Encuentra a alguien para comenzar un chat
          </p>
        </div>

      </div>

      {/* ==================================================
          BUSCADOR
      ================================================== */}

      <div className="relative">

        <Search
          size={17}
          strokeWidth={2}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />

        <input
          type="text"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Buscar usuario o nombre..."
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 hover:bg-white focus:border-zinc-300 focus:bg-white focus:ring-4 focus:ring-zinc-100"
        />

        {hasQuery && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setUsers([])
              setError('')
            }}
            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Limpiar búsqueda"
          >
            <X size={15} />
          </button>
        )}

      </div>

      {/* ==================================================
          BUSCANDO
      ================================================== */}

      {loading && (
        <div className="space-y-1">

          {[1, 2].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl p-2.5"
            >

              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-200" />

              <div className="flex-1 space-y-2">

                <div className="h-3 w-24 animate-pulse rounded-full bg-zinc-200" />

                <div className="h-2.5 w-32 animate-pulse rounded-full bg-zinc-100" />

              </div>

            </div>
          ))}

        </div>
      )}

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">

          <p className="text-xs font-medium leading-5 text-red-600">
            {error}
          </p>

        </div>
      )}

      {/* ==================================================
          SIN RESULTADOS
      ================================================== */}

      {!loading &&
        hasQuery &&
        users.length === 0 &&
        !error && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-7 text-center">

            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
              <UserRound
                size={19}
                className="text-zinc-300"
              />
            </div>

            <p className="text-xs font-medium text-zinc-600">
              No encontramos usuarios
            </p>

            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              Intenta buscar por otro nombre o usuario.
            </p>

          </div>
        )}

      {/* ==================================================
          RESULTADOS
      ================================================== */}

      {!loading &&
        users.length > 0 && (
          <div className="space-y-1">

            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Resultados
            </p>

            {users.map((profile) => {
              const online =
                isProfileOnline(profile)

              const isCreating =
                creatingConversation ===
                profile.id

              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() =>
                    handleUserClick(profile)
                  }
                  disabled={isCreating}
                  className="group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-all duration-150 hover:bg-zinc-100 active:scale-[0.995] disabled:cursor-wait disabled:opacity-60"
                >

                  {/* AVATAR */}

                  <div className="relative shrink-0">

                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm">

                      {profile.avatar_url ? (
                        <img
                          src={
                            profile.avatar_url
                          }
                          alt={
                            profile.display_name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        profile.display_name
                          .charAt(0)
                          .toUpperCase()
                      )}

                    </div>

                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                        online
                          ? 'bg-emerald-500'
                          : 'bg-zinc-300'
                      }`}
                    />

                  </div>

                  {/* INFORMACIÓN */}

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-semibold text-zinc-800">
                      {
                        profile.display_name
                      }
                    </p>

                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">

                      <p className="truncate text-[11px] text-zinc-400">
                        @{profile.username}
                      </p>

                      {online && (
                        <>
                          <span className="text-zinc-300">
                            ·
                          </span>

                          <span className="shrink-0 text-[10px] font-medium text-emerald-600">
                            En línea
                          </span>
                        </>
                      )}

                    </div>

                  </div>

                  {/* ESTADO */}

                  {isCreating ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">

                      <span className="h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-zinc-700" />

                      Abriendo

                    </div>
                  ) : (
                    <span className="hidden text-[10px] font-medium text-zinc-400 transition group-hover:block">
                      Abrir
                    </span>
                  )}

                </button>
              )
            })}

          </div>
        )}

    </div>
  )
}