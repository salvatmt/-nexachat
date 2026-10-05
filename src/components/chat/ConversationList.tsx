import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Check,
  CheckCheck,
  MessageCircle,
} from 'lucide-react'

import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  status: 'online' | 'offline'
  last_seen: string | null
}

type Conversation = {
  id: string
  profile: Profile
  lastMessage: string | null
  lastMessageAt: string | null
  lastMessageSenderId: string | null
  unreadCount: number
}

type ConversationListProps = {
  selectedConversationId: string | null
  refreshKey?: number

  onSelectConversation: (
    conversationId: string,
    profile: Profile
  ) => void
}

export default function ConversationList({
  selectedConversationId,
  refreshKey = 0,
  onSelectConversation,
}: ConversationListProps) {
  const { user } = useAuth()

  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>([])

  const [loading, setLoading] =
    useState(true)

  /*
   * ------------------------------------------------------
   * CARGAR CONVERSACIONES
   * ------------------------------------------------------
   */

  const loadConversations =
    useCallback(async () => {
      if (!user?.id) return

      try {
        /*
         * 1. CONVERSACIONES DEL USUARIO
         */

        const {
          data: memberships,
          error: membershipsError,
        } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq(
            'user_id',
            user.id
          )

        if (membershipsError) {
          console.error(
            '❌ Error obteniendo conversaciones:',
            membershipsError
          )

          return
        }

        if (
          !memberships ||
          memberships.length === 0
        ) {
          setConversations([])
          return
        }

        const conversationIds =
          memberships.map(
            (membership) =>
              membership.conversation_id
          )

        /*
         * 2. MIEMBROS
         */

        const {
          data: members,
          error: membersError,
        } = await supabase
          .from(
            'conversation_members'
          )
          .select(
            'conversation_id, user_id'
          )
          .in(
            'conversation_id',
            conversationIds
          )

        if (membersError) {
          console.error(
            '❌ Error obteniendo miembros:',
            membersError
          )

          return
        }

        /*
         * 3. OTROS USUARIOS
         */

        const otherUserIds =
          Array.from(
            new Set(
              (members ?? [])
                .filter(
                  (member) =>
                    member.user_id !==
                    user.id
                )
                .map(
                  (member) =>
                    member.user_id
                )
            )
          )

        if (
          otherUserIds.length === 0
        ) {
          setConversations([])
          return
        }

        /*
         * 4. PERFILES
         */

        const {
          data: profiles,
          error: profilesError,
        } = await supabase
          .from('profiles')
          .select(
            `
            id,
            username,
            display_name,
            avatar_url,
            status,
            last_seen
            `
          )
          .in(
            'id',
            otherUserIds
          )

        if (profilesError) {
          console.error(
            '❌ Error obteniendo perfiles:',
            profilesError
          )

          return
        }

        const profileMap =
          new Map<
            string,
            Profile
          >()

        for (const profile of
          profiles ?? []) {
          profileMap.set(
            profile.id,
            profile as Profile
          )
        }

        /*
         * 5. MENSAJES
         */

        const {
          data: messages,
          error: messagesError,
        } = await supabase
          .from('messages')
          .select(
            `
            id,
            conversation_id,
            sender_id,
            content,
            message_type,
            created_at,
            read_at
            `
          )
          .in(
            'conversation_id',
            conversationIds
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          )

        if (messagesError) {
          console.error(
            '❌ Error obteniendo mensajes:',
            messagesError
          )

          return
        }

        /*
         * 6. ÚLTIMO MENSAJE
         */

        const latestMessageMap =
          new Map<
            string,
            {
              content:
                | string
                | null

              created_at: string

              sender_id: string

              read_at:
                | string
                | null
            }
          >()

        /*
         * 7. MENSAJES NO LEÍDOS
         */

        const unreadMap =
          new Map<
            string,
            number
          >()

        for (const message of
          messages ?? []) {
          if (
            !latestMessageMap.has(
              message.conversation_id
            )
          ) {
            let preview:
              | string
              | null =
              message.content

            if (
              message.message_type ===
              'image'
            ) {
              preview = '🖼️ Imagen'
            } else if (
              message.message_type ===
              'video'
            ) {
              preview = '🎥 Video'
            } else if (
              message.message_type ===
              'file'
            ) {
              preview = '📎 Archivo'
            } else if (
              message.message_type ===
              'text'
            ) {
              preview =
                message.content
            }

            latestMessageMap.set(
              message.conversation_id,
              {
                content:
                  preview,

                created_at:
                  message.created_at,

                sender_id:
                  message.sender_id,

                read_at:
                  message.read_at,
              }
            )
          }

          if (
            message.sender_id !==
              user.id &&
            !message.read_at
          ) {
            unreadMap.set(
              message.conversation_id,
              (unreadMap.get(
                message.conversation_id
              ) ?? 0) + 1
            )
          }
        }

        /*
         * 8. CONSTRUIR LISTA
         */

        const result: Conversation[] =
          []

        for (const conversationId of
          conversationIds) {
          const conversationMembers =
            (members ?? []).filter(
              (member) =>
                member.conversation_id ===
                conversationId
            )

          const otherMember =
            conversationMembers.find(
              (member) =>
                member.user_id !==
                user.id
            )

          if (!otherMember) {
            continue
          }

          const profile =
            profileMap.get(
              otherMember.user_id
            )

          if (!profile) {
            continue
          }

          const latest =
            latestMessageMap.get(
              conversationId
            )

          result.push({
            id: conversationId,

            profile,

            lastMessage:
              latest?.content ??
              null,

            lastMessageAt:
              latest?.created_at ??
              null,

            lastMessageSenderId:
              latest?.sender_id ??
              null,

            unreadCount:
              unreadMap.get(
                conversationId
              ) ?? 0,
          })
        }

        /*
         * 9. ORDENAR
         */

        result.sort((a, b) => {
          const dateA =
            a.lastMessageAt
              ? new Date(
                  a.lastMessageAt
                ).getTime()
              : 0

          const dateB =
            b.lastMessageAt
              ? new Date(
                  b.lastMessageAt
                ).getTime()
              : 0

          return dateB - dateA
        })

        setConversations(result)

        console.log(
          '🔄 Lista actualizada:',
          result
        )
      } catch (error) {
        console.error(
          '❌ Error inesperado:',
          error
        )
      }
    }, [user?.id])

  /*
   * ------------------------------------------------------
   * CARGA INICIAL
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (!user?.id) return

    setLoading(true)

    loadConversations().finally(() => {
      setLoading(false)
    })
  }, [
    user?.id,
    refreshKey,
    loadConversations,
  ])

  /*
   * ------------------------------------------------------
   * REALTIME
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false

    const channels: ReturnType<
      typeof supabase.channel
    >[] = []

    const setupRealtime =
      async () => {
        const {
          data: memberships,
          error,
        } = await supabase
          .from(
            'conversation_members'
          )
          .select(
            'conversation_id'
          )
          .eq(
            'user_id',
            user.id
          )

        if (cancelled) {
          return
        }

        if (error) {
          console.error(
            '❌ Error preparando Realtime:',
            error
          )

          return
        }

        const conversationIds =
          Array.from(
            new Set(
              (memberships ?? []).map(
                (membership) =>
                  membership.conversation_id
              )
            )
          )

        console.log(
          '📡 Conversaciones para Realtime:',
          conversationIds
        )

        for (const conversationId of
          conversationIds) {
          if (cancelled) {
            break
          }

          const channel =
            supabase
              .channel(
                `conversation-list-${user.id}-${conversationId}`
              )
              .on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'messages',
                  filter:
                    `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                  console.log(
                    '📨 NUEVO MENSAJE:',
                    conversationId,
                    payload.new
                  )

                  loadConversations()
                }
              )
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'messages',
                  filter:
                    `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                  console.log(
                    '👀 MENSAJE ACTUALIZADO:',
                    conversationId,
                    payload.new
                  )

                  loadConversations()
                }
              )

          channels.push(channel)

          channel.subscribe(
            (status) => {
              console.log(
                `📡 Realtime ${conversationId}:`,
                status
              )
            }
          )
        }

        /*
         * REALTIME PERFILES
         */

        const profileChannel =
          supabase
            .channel(
              `conversation-profiles-${user.id}`
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
              },
              (payload) => {
                console.log(
                  '🟢 PERFIL ACTUALIZADO:',
                  payload.new
                )

                loadConversations()
              }
            )

        channels.push(
          profileChannel
        )

        profileChannel.subscribe(
          (status) => {
            console.log(
              '📡 Realtime perfiles:',
              status
            )
          }
        )
      }

    setupRealtime()

    return () => {
      cancelled = true

      console.log(
        '🔌 Cerrando canales de ConversationList'
      )

      for (const channel of
        channels) {
        supabase.removeChannel(
          channel
        )
      }
    }
  }, [
    user?.id,
    refreshKey,
    loadConversations,
  ])

  /*
   * ------------------------------------------------------
   * ONLINE
   * ------------------------------------------------------
   */

  const isOnline = (
    profile: Profile
  ) => {
    if (
      profile.status !==
        'online' ||
      !profile.last_seen
    ) {
      return false
    }

    const lastSeen =
      new Date(
        profile.last_seen
      ).getTime()

    return (
      Date.now() -
        lastSeen <
      60_000
    )
  }

  /*
   * ------------------------------------------------------
   * HORA
   * ------------------------------------------------------
   */

  const formatMessageTime = (
    date: string
  ) => {
    const messageDate =
      new Date(date)

    const now = new Date()

    const sameDay =
      messageDate.toDateString() ===
      now.toDateString()

    if (sameDay) {
      return messageDate.toLocaleTimeString(
        'es-MX',
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      )
    }

    const yesterday =
      new Date(now)

    yesterday.setDate(
      now.getDate() - 1
    )

    if (
      messageDate.toDateString() ===
      yesterday.toDateString()
    ) {
      return 'Ayer'
    }

    return messageDate.toLocaleDateString(
      'es-MX',
      {
        day: '2-digit',
        month: '2-digit',
      }
    )
  }

  /*
   * ------------------------------------------------------
   * LOADING
   * ------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="space-y-1 px-1">

        {[1, 2, 3].map(
          (item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl p-3"
            >

              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-zinc-200" />

              <div className="min-w-0 flex-1 space-y-2">

                <div className="h-3 w-28 animate-pulse rounded-full bg-zinc-200" />

                <div className="h-2.5 w-36 animate-pulse rounded-full bg-zinc-100" />

              </div>

              <div className="h-2.5 w-8 animate-pulse rounded-full bg-zinc-100" />

            </div>
          )
        )}

      </div>
    )
  }

  /*
   * ------------------------------------------------------
   * VACÍO
   * ------------------------------------------------------
   */

  if (
    conversations.length ===
    0
  ) {
    return (
      <div className="mx-1 overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-4 py-10 text-center">

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm">

          <MessageCircle
            size={22}
            strokeWidth={1.8}
          />

        </div>

        <p className="text-sm font-semibold text-zinc-800">
          Sin conversaciones
        </p>

        <p className="mx-auto mt-1.5 max-w-[210px] text-xs leading-5 text-zinc-400">
          Busca a una persona arriba
          para comenzar una
          conversación privada.
        </p>

      </div>
    )
  }

  /*
   * ------------------------------------------------------
   * LISTA
   * ------------------------------------------------------
   */

  return (
    <div className="space-y-1">

      {conversations.map(
        (
          conversation,
          index
        ) => {
          const selected =
            conversation.id ===
            selectedConversationId

          const online =
            isOnline(
              conversation.profile
            )

          const isOwnLastMessage =
            conversation.lastMessageSenderId ===
            user?.id

          const unread =
            conversation.unreadCount >
            0

          return (
            <button
              key={
                conversation.id
              }
              type="button"
              onClick={() =>
                onSelectConversation(
                  conversation.id,
                  conversation.profile
                )
              }
              style={{
                animationDelay: `${Math.min(
                  index * 35,
                  180
                )}ms`,
              }}
              className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl p-3 text-left transition-all duration-200 animate-[conversationIn_0.25s_ease-out_both] ${
                selected
                  ? 'bg-zinc-900 shadow-md shadow-zinc-900/10'
                  : 'hover:bg-zinc-100/90 active:scale-[0.99]'
              }`}
            >

              {/* INDICADOR SELECCIONADO */}

              {selected && (
                <span className="absolute bottom-3 left-0 top-3 w-0.5 rounded-r-full bg-white" />
              )}

              {/* ========================================
                  AVATAR
              ======================================== */}

              <div className="relative shrink-0">

                <div
                  className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-sm font-semibold shadow-sm ring-1 ${
                    selected
                      ? 'bg-white text-zinc-900 ring-white/20'
                      : 'bg-zinc-900 text-white ring-zinc-200'
                  }`}
                >

                  {conversation
                    .profile
                    .avatar_url ? (
                    <img
                      src={
                        conversation
                          .profile
                          .avatar_url
                      }
                      alt={
                        conversation
                          .profile
                          .display_name
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    conversation
                      .profile
                      .display_name
                      .charAt(0)
                      .toUpperCase()
                  )}

                </div>

                {/* ONLINE */}

                <span
                  className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2.5px] ${
                    selected
                      ? 'border-zinc-900'
                      : 'border-white'
                  } ${
                    online
                      ? 'bg-emerald-500'
                      : 'bg-zinc-300'
                  }`}
                />

              </div>

              {/* ========================================
                  INFORMACIÓN
              ======================================== */}

              <div className="min-w-0 flex-1">

                {/* NOMBRE + HORA */}

                <div className="flex items-center justify-between gap-2">

                  <p
                    className={`truncate text-sm font-semibold tracking-tight ${
                      selected
                        ? 'text-white'
                        : unread
                          ? 'text-zinc-950'
                          : 'text-zinc-800'
                    }`}
                  >
                    {
                      conversation
                        .profile
                        .display_name
                    }
                  </p>

                  {conversation.lastMessageAt && (
                    <span
                      className={`shrink-0 text-[10px] tabular-nums ${
                        selected
                          ? 'text-zinc-400'
                          : unread
                            ? 'font-semibold text-zinc-700'
                            : 'text-zinc-400'
                      }`}
                    >
                      {formatMessageTime(
                        conversation.lastMessageAt
                      )}
                    </span>
                  )}

                </div>

                {/* PREVIEW */}

                <div className="mt-1 flex min-w-0 items-center gap-1.5">

                  {/* CHECKS */}

                  {isOwnLastMessage &&
                    conversation.lastMessage && (
                      <span className="flex shrink-0 items-center">

                        {conversation.unreadCount ===
                        0 ? (
                          <CheckCheck
                            size={13}
                            strokeWidth={2.2}
                            className={
                              selected
                                ? 'text-zinc-400'
                                : 'text-blue-500'
                            }
                          />
                        ) : (
                          <Check
                            size={13}
                            strokeWidth={2.2}
                            className={
                              selected
                                ? 'text-zinc-500'
                                : 'text-zinc-400'
                            }
                          />
                        )}

                      </span>
                    )}

                  {/* MENSAJE */}

                  <p
                    className={`min-w-0 flex-1 truncate text-xs leading-5 ${
                      selected
                        ? 'text-zinc-400'
                        : unread
                          ? 'font-semibold text-zinc-800'
                          : 'text-zinc-500'
                    }`}
                  >
                    {conversation
                      .lastMessage ??
                      'Nueva conversación'}
                  </p>

                  {/* UNREAD */}

                  {unread && (
                    <span
                      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[9px] font-bold shadow-sm ${
                        selected
                          ? 'bg-white text-zinc-900'
                          : 'bg-zinc-900 text-white'
                      }`}
                    >
                      {conversation
                        .unreadCount >
                      99
                        ? '99+'
                        : conversation.unreadCount}
                    </span>
                  )}

                </div>

              </div>

            </button>
          )
        }
      )}

    </div>
  )
}