import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
} from 'react'

import {
  Check,
  CheckCheck,
  Paperclip,
  Send,
  ShieldCheck,
  X,
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

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  message_type:
    | 'text'
    | 'image'
    | 'video'
    | 'file'
  is_view_once: boolean
  viewed_at: string | null
  read_at: string | null
  created_at: string
}

type MessageWithUrl = Message & {
  mediaUrl?: string
}

type ChatWindowProps = {
  conversationId: string
  profile: Profile
}

/*
 * ------------------------------------------------------
 * CONFIGURACIÓN MULTIMEDIA
 * ------------------------------------------------------
 */

const MAX_MEDIA_SIZE =
  50 * 1024 * 1024

const ALLOWED_MEDIA_TYPES = {
  image: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ],

  video: [
    'video/mp4',
    'video/webm',
    'video/ogg',
  ],
}

/*
 * ------------------------------------------------------
 * COMPONENTE
 * ------------------------------------------------------
 */

export default function ChatWindow({
  conversationId,
  profile,
}: ChatWindowProps) {
  const { user } = useAuth()

  const [currentProfile, setCurrentProfile] =
    useState<Profile>(profile)

  const [messages, setMessages] =
    useState<MessageWithUrl[]>([])

  const [content, setContent] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [sending, setSending] =
    useState(false)

  const [uploadingMedia, setUploadingMedia] =
    useState(false)

  const [error, setError] =
    useState('')

  const [selectedMedia, setSelectedMedia] =
    useState<File | null>(null)

  const [selectedMediaType, setSelectedMediaType] =
    useState<'image' | 'video' | null>(null)

  const [selectedMediaPreviewUrl, setSelectedMediaPreviewUrl] =
    useState<string | null>(null)

  const [fullscreenImage, setFullscreenImage] =
    useState<string | null>(null)

  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null)

  const [isOtherUserTyping, setIsOtherUserTyping] =
    useState(false)

  const typingChannelRef =
    useRef<ReturnType<
      typeof supabase.channel
    > | null>(null)

  const typingTimeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null)

  const isTypingRef =
    useRef(false)

  /*
   * ------------------------------------------------------
   * PERFIL
   * ------------------------------------------------------
   */

  useEffect(() => {
    setCurrentProfile(profile)
  }, [profile])

  /*
   * ------------------------------------------------------
   * PREVIEW MULTIMEDIA
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedMedia) {
      setSelectedMediaPreviewUrl(null)
      return
    }

    const previewUrl =
      URL.createObjectURL(selectedMedia)

    setSelectedMediaPreviewUrl(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [selectedMedia])

  /*
   * ------------------------------------------------------
   * CERRAR VISOR CON ESC
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (!fullscreenImage) {
      return
    }

    const handleEscape = (
      event: globalThis.KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        setFullscreenImage(null)
      }
    }

    window.addEventListener(
      'keydown',
      handleEscape
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape
      )
    }
  }, [fullscreenImage])

  /*
   * ------------------------------------------------------
   * REALTIME DEL PERFIL
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (!profile.id) return

    const channel = supabase
      .channel(`chat-profile-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          setCurrentProfile(
            payload.new as Profile
          )
        }
      )

    channel.subscribe((status) => {
      console.log(
        'Realtime perfil:',
        status
      )
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id])

  /*
   * ------------------------------------------------------
   * TYPING REALTIME
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (
      !user?.id ||
      !conversationId
    ) {
      return
    }

    setIsOtherUserTyping(false)

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'broadcast',
        {
          event: 'typing',
        },
        (payload) => {
          const senderId =
            payload.payload?.user_id

          const typing =
            payload.payload?.is_typing

          if (senderId === user.id) {
            return
          }

          if (senderId !== profile.id) {
            return
          }

          setIsOtherUserTyping(
            Boolean(typing)
          )
        }
      )

    typingChannelRef.current =
      channel

    channel.subscribe((status) => {
      console.log(
        '⌨️ Realtime typing:',
        status
      )
    })

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        )

        typingTimeoutRef.current = null
      }

      if (isTypingRef.current) {
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: user.id,
            is_typing: false,
          },
        })
      }

      isTypingRef.current = false

      typingChannelRef.current = null

      setIsOtherUserTyping(false)

      supabase.removeChannel(channel)
    }
  }, [
    conversationId,
    user?.id,
    profile.id,
  ])

  /*
   * ------------------------------------------------------
   * ENVIAR ESTADO DE TYPING
   * ------------------------------------------------------
   */

  const sendTypingStatus = async (
    isTyping: boolean
  ) => {
    if (
      !user?.id ||
      !typingChannelRef.current
    ) {
      return
    }

    try {
      await typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: user.id,
          is_typing: isTyping,
        },
      })

      isTypingRef.current = isTyping
    } catch (error) {
      console.error(
        'Error enviando typing:',
        error
      )
    }
  }

  /*
   * ------------------------------------------------------
   * CAMBIO DEL INPUT
   * ------------------------------------------------------
   */

  const handleContentChange = (
    value: string
  ) => {
    setContent(value)

    if (!value.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        )

        typingTimeoutRef.current = null
      }

      if (isTypingRef.current) {
        sendTypingStatus(false)
      }

      return
    }

    if (!isTypingRef.current) {
      sendTypingStatus(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      )
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        sendTypingStatus(false)

        typingTimeoutRef.current = null
      }, 1500)
  }

  /*
   * ------------------------------------------------------
   * MARCAR COMO LEÍDA
   * ------------------------------------------------------
   */

  const markConversationAsRead =
    async () => {
      if (
        !user?.id ||
        !conversationId
      ) {
        return
      }

      const { error } =
        await supabase.rpc(
          'mark_conversation_read',
          {
            p_conversation_id:
              conversationId,
          }
        )

      if (error) {
        console.error(
          'Error marcando mensajes como leídos:',
          error
        )

        return
      }

      setMessages(
        (currentMessages) =>
          currentMessages.map(
            (message) => {
              if (
                message.sender_id !==
                  user.id &&
                !message.read_at
              ) {
                return {
                  ...message,
                  read_at:
                    new Date().toISOString(),
                }
              }

              return message
            }
          )
      )
    }

  /*
   * ------------------------------------------------------
   * URL FIRMADA
   * ------------------------------------------------------
   */

  const getSignedMediaUrl =
    async (
      path: string
    ) => {
      const {
        data,
        error,
      } = await supabase.storage
        .from('private-media')
        .createSignedUrl(
          path,
          60 * 60
        )

      if (error) {
        console.error(
          'Error creando URL firmada:',
          error
        )

        return null
      }

      return data.signedUrl
    }

  /*
   * ------------------------------------------------------
   * PREPARAR MENSAJE MULTIMEDIA
   * ------------------------------------------------------
   */

  const prepareMessageMedia =
    async (
      message: Message
    ): Promise<MessageWithUrl> => {
      if (
        (
          message.message_type !==
            'image' &&
          message.message_type !==
            'video'
        ) ||
        !message.content
      ) {
        return message
      }

      const mediaUrl =
        await getSignedMediaUrl(
          message.content
        )

      return {
        ...message,
        mediaUrl:
          mediaUrl ?? undefined,
      }
    }

  /*
   * ------------------------------------------------------
   * CARGAR MENSAJES
   * ------------------------------------------------------
   */

  const loadMessages = async () => {
    setLoading(true)
    setError('')

    const {
      data,
      error,
    } = await supabase
      .from('messages')
      .select(
        `
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        is_view_once,
        viewed_at,
        read_at,
        created_at
        `
      )
      .eq(
        'conversation_id',
        conversationId
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )

    if (error) {
      console.error(
        'Error cargando mensajes:',
        error
      )

      setError(
        `No se pudieron cargar los mensajes: ${error.message}`
      )

      setLoading(false)

      return
    }

    const preparedMessages =
      await Promise.all(
        (data ?? []).map(
          (message) =>
            prepareMessageMedia(
              message as Message
            )
        )
      )

    setMessages(
      preparedMessages
    )

    setLoading(false)

    await markConversationAsRead()
  }

  /*
   * ------------------------------------------------------
   * REALTIME MENSAJES
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (
      !user?.id ||
      !conversationId
    ) {
      return
    }

    let cancelled = false

    const channel = supabase
      .channel(
        `chat-${conversationId}-${user.id}`
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
        async (payload) => {
          const newMessage =
            payload.new as Message

          if (cancelled) {
            return
          }

          const preparedMessage =
            await prepareMessageMedia(
              newMessage
            )

          setMessages(
            (currentMessages) => {
              const exists =
                currentMessages.some(
                  (message) =>
                    message.id ===
                    preparedMessage.id
                )

              if (exists) {
                return currentMessages
              }

              return [
                ...currentMessages,
                preparedMessage,
              ]
            }
          )

          if (
            newMessage.sender_id !==
            user.id
          ) {
            await markConversationAsRead()
          }
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
        async (payload) => {
          const updatedMessage =
            payload.new as Message

          let preparedMessage =
            updatedMessage

          if (
            updatedMessage.message_type ===
              'image' ||
            updatedMessage.message_type ===
              'video'
          ) {
            preparedMessage =
              await prepareMessageMedia(
                updatedMessage
              )
          }

          setMessages(
            (currentMessages) =>
              currentMessages.map(
                (message) =>
                  message.id ===
                  preparedMessage.id
                    ? {
                        ...message,
                        ...preparedMessage,
                      }
                    : message
              )
          )
        }
      )

    channel.subscribe((status) => {
      console.log(
        'Realtime chat:',
        status
      )
    })

    loadMessages()

    return () => {
      cancelled = true

      supabase.removeChannel(channel)
    }
  }, [
    conversationId,
    user?.id,
  ])

  /*
   * ------------------------------------------------------
   * SCROLL
   * ------------------------------------------------------
   */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages])

  /*
   * ------------------------------------------------------
   * SELECCIONAR MULTIMEDIA
   * ------------------------------------------------------
   */

  const handleSelectMedia = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    setError('')

    let mediaType:
      | 'image'
      | 'video'
      | null = null

    if (
      ALLOWED_MEDIA_TYPES.image.includes(
        file.type
      )
    ) {
      mediaType = 'image'
    }

    if (
      ALLOWED_MEDIA_TYPES.video.includes(
        file.type
      )
    ) {
      mediaType = 'video'
    }

    if (!mediaType) {
      setError(
        'Solo puedes enviar imágenes JPG, PNG, WEBP, GIF o videos MP4, WEBM y OGG.'
      )

      return
    }

    if (
      file.size >
      MAX_MEDIA_SIZE
    ) {
      setError(
        'El archivo no puede superar los 50 MB.'
      )

      return
    }

    setSelectedMedia(file)

    setSelectedMediaType(
      mediaType
    )
  }

  /*
   * ------------------------------------------------------
   * SUBIR MULTIMEDIA
   * ------------------------------------------------------
   */

  const handleUploadMedia =
    async () => {
      if (
        !selectedMedia ||
        !selectedMediaType ||
        !user?.id ||
        uploadingMedia
      ) {
        return
      }

      setUploadingMedia(true)
      setError('')

      try {
        const extension =
          selectedMedia.name
            .split('.')
            .pop()
            ?.toLowerCase() ??
          (
            selectedMediaType ===
            'image'
              ? 'jpg'
              : 'mp4'
          )

        const fileName =
          `${crypto.randomUUID()}.${extension}`

        const filePath =
          `${conversationId}/${user.id}/${fileName}`

        console.log(
          '📤 Subiendo multimedia:',
          filePath
        )

        const {
          error: uploadError,
        } = await supabase.storage
          .from('private-media')
          .upload(
            filePath,
            selectedMedia,
            {
              contentType:
                selectedMedia.type,
              upsert: false,
            }
          )

        if (uploadError) {
          console.error(
            'Error subiendo multimedia:',
            uploadError
          )

          throw new Error(
            `No se pudo subir el archivo: ${uploadError.message}`
          )
        }

        const {
          data,
          error:
            messageError,
        } = await supabase
          .from('messages')
          .insert({
            conversation_id:
              conversationId,
            sender_id:
              user.id,
            content:
              filePath,
            message_type:
              selectedMediaType,
            is_view_once:
              false,
          })
          .select(
            `
            id,
            conversation_id,
            sender_id,
            content,
            message_type,
            is_view_once,
            viewed_at,
            read_at,
            created_at
            `
          )
          .single()

        if (messageError) {
          console.error(
            'Error creando mensaje multimedia:',
            messageError
          )

          await supabase.storage
            .from('private-media')
            .remove([
              filePath,
            ])

          throw new Error(
            `No se pudo crear el mensaje: ${messageError.message}`
          )
        }

        const mediaUrl =
          await getSignedMediaUrl(
            filePath
          )

        if (data) {
          const preparedMessage:
            MessageWithUrl =
            {
              ...(data as Message),
              mediaUrl:
                mediaUrl ??
                undefined,
            }

          setMessages(
            (currentMessages) => {
              const exists =
                currentMessages.some(
                  (message) =>
                    message.id ===
                    preparedMessage.id
                )

              if (exists) {
                return currentMessages
              }

              return [
                ...currentMessages,
                preparedMessage,
              ]
            }
          )
        }

        setSelectedMedia(null)
        setSelectedMediaType(null)
      } catch (error) {
        console.error(
          'Error enviando multimedia:',
          error
        )

        setError(
          error instanceof Error
            ? error.message
            : 'No se pudo enviar el archivo.'
        )
      } finally {
        setUploadingMedia(false)
      }
    }

  /*
   * ------------------------------------------------------
   * CANCELAR MULTIMEDIA
   * ------------------------------------------------------
   */

  const cancelSelectedMedia =
    () => {
      if (uploadingMedia) {
        return
      }

      setSelectedMedia(null)
      setSelectedMediaType(null)
    }

  /*
   * ------------------------------------------------------
   * ENVIAR TEXTO
   * ------------------------------------------------------
   */

  const handleSendMessage = async (
    event: FormEvent
  ) => {
    event.preventDefault()

    const message =
      content.trim()

    if (
      !message ||
      !user?.id ||
      sending ||
      uploadingMedia
    ) {
      return
    }

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      )

      typingTimeoutRef.current =
        null
    }

    if (isTypingRef.current) {
      await sendTypingStatus(false)
    }

    setSending(true)
    setError('')

    const {
      data,
      error,
    } = await supabase
      .from('messages')
      .insert({
        conversation_id:
          conversationId,
        sender_id:
          user.id,
        content:
          message,
        message_type:
          'text',
      })
      .select(
        `
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        is_view_once,
        viewed_at,
        read_at,
        created_at
        `
      )
      .single()

    if (error) {
      console.error(
        'Error enviando mensaje:',
        error
      )

      setError(
        `No se pudo enviar el mensaje: ${error.message}`
      )

      setSending(false)

      return
    }

    if (data) {
      setMessages(
        (currentMessages) => {
          const exists =
            currentMessages.some(
              (message) =>
                message.id ===
                data.id
            )

          if (exists) {
            return currentMessages
          }

          return [
            ...currentMessages,
            data as Message,
          ]
        }
      )
    }

    setContent('')
    setSending(false)
  }

  /*
   * ------------------------------------------------------
   * ENTER
   * ------------------------------------------------------
   */

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()

      event.currentTarget.form?.requestSubmit()
    }
  }

  /*
   * ------------------------------------------------------
   * PRESENCIA
   * ------------------------------------------------------
   */

  const isOnline =
    currentProfile.status ===
      'online' &&
    !!currentProfile.last_seen &&
    Date.now() -
      new Date(
        currentProfile.last_seen
      ).getTime() <
      60_000

  /*
   * ------------------------------------------------------
   * RENDER
   * ------------------------------------------------------
   */

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">

        <div className="flex min-w-0 items-center gap-3">

          {/* AVATAR */}

          <div className="relative shrink-0">

            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm ring-1 ring-zinc-200">

              {currentProfile.avatar_url ? (
                <img
                  src={
                    currentProfile.avatar_url
                  }
                  alt={
                    currentProfile.display_name
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                currentProfile.display_name
                  .charAt(0)
                  .toUpperCase()
              )}

            </div>

            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
                isOnline
                  ? 'bg-emerald-500'
                  : 'bg-zinc-300'
              }`}
            />

          </div>

          {/* INFORMACIÓN */}

          <div className="min-w-0">

            <h2 className="truncate text-sm font-semibold tracking-tight text-zinc-950">
              {
                currentProfile.display_name
              }
            </h2>

            <div className="mt-0.5 flex items-center gap-1.5">

              <span
                className={`text-xs ${
                  isOtherUserTyping
                    ? 'font-medium text-blue-500'
                    : isOnline
                      ? 'text-emerald-600'
                      : 'text-zinc-400'
                }`}
              >
                {isOtherUserTyping
                  ? 'Escribiendo...'
                  : isOnline
                    ? 'En línea'
                    : `@${currentProfile.username}`}
              </span>

            </div>

          </div>

        </div>

        {/* PRIVACIDAD */}

        <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 sm:flex">

          <ShieldCheck
            size={14}
            className="text-emerald-600"
          />

          <span className="text-[11px] font-medium text-zinc-500">
            Conversación privada
          </span>

        </div>

      </header>

      {/* ==================================================
          ÁREA DE MENSAJES
      ================================================== */}

      <div
        className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-3 py-5 sm:px-6 sm:py-7"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.025) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      >

        <div className="mx-auto flex min-h-full max-w-4xl flex-col">

          {/* LOADING */}

          {loading && (
            <div className="flex flex-1 items-center justify-center">

              <div className="flex flex-col items-center">

                <div className="mb-3 h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />

                <p className="text-xs font-medium text-zinc-400">
                  Cargando conversación...
                </p>

              </div>

            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            messages.length === 0 && (
              <div className="flex flex-1 items-center justify-center">

                <div className="max-w-sm px-6 text-center">

                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-zinc-200">
                    💬
                  </div>

                  <h3 className="text-base font-semibold tracking-tight text-zinc-900">
                    Comienza la conversación
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Envía un mensaje, una
                    imagen o un video para
                    comenzar a hablar.
                  </p>

                </div>

              </div>
            )}

          {/* MENSAJES */}

          {!loading &&
            messages.length > 0 && (
              <div className="flex flex-col gap-1.5">

                {messages.map(
                  (message, index) => {
                    const isMine =
                      message.sender_id ===
                      user?.id

                    const isRead =
                      !!message.read_at

                    const isImage =
                      message.message_type ===
                      'image'

                    const isVideo =
                      message.message_type ===
                      'video'

                    const previousMessage =
                      messages[index - 1]

                    const sameSender =
                      previousMessage?.sender_id ===
                      message.sender_id

                    return (
                      <div
                        key={message.id}
                        className={`flex animate-[messageIn_0.22s_ease-out] ${
                          isMine
                            ? 'justify-end'
                            : 'justify-start'
                        } ${
                          sameSender
                            ? 'mt-0'
                            : 'mt-2.5'
                        }`}
                      >

                        <div
                          className={`flex max-w-[90%] flex-col sm:max-w-[72%] ${
                            isMine
                              ? 'items-end'
                              : 'items-start'
                          }`}
                        >

                          {/* =========================
                              IMAGEN
                          ========================= */}

                          {isImage &&
                            message.mediaUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setFullscreenImage(
                                    message.mediaUrl!
                                  )
                                }
                                className={`group relative overflow-hidden rounded-[22px] bg-zinc-200 shadow-sm ring-1 ring-black/5 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                                  isMine
                                    ? 'rounded-br-md'
                                    : 'rounded-bl-md'
                                }`}
                                aria-label="Ver imagen"
                              >

                                <img
                                  src={
                                    message.mediaUrl
                                  }
                                  alt="Imagen enviada"
                                  draggable={false}
                                  className="block max-h-[460px] max-w-full select-none object-cover transition duration-300 group-hover:scale-[1.015]"
                                  onContextMenu={(
                                    event
                                  ) =>
                                    event.preventDefault()
                                  }
                                />

                              </button>
                            )}

                          {/* =========================
                              VIDEO
                          ========================= */}

                          {isVideo &&
                            message.mediaUrl && (
                              <div
                                className={`overflow-hidden rounded-[22px] bg-black shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                                  isMine
                                    ? 'rounded-br-md'
                                    : 'rounded-bl-md'
                                }`}
                              >

                                <video
                                  src={
                                    message.mediaUrl
                                  }
                                  controls
                                  preload="metadata"
                                  controlsList="nodownload noplaybackrate"
                                  disablePictureInPicture
                                  playsInline
                                  className="block max-h-[460px] max-w-full"
                                  onContextMenu={(
                                    event
                                  ) =>
                                    event.preventDefault()
                                  }
                                />

                              </div>
                            )}

                          {/* =========================
                              TEXTO
                          ========================= */}

                          {!isImage &&
                            !isVideo && (
                              <div
                                className={`relative px-4 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md ${
                                  isMine
                                    ? 'rounded-[20px] rounded-br-md bg-zinc-900 text-white'
                                    : 'rounded-[20px] rounded-bl-md bg-white text-zinc-900 ring-1 ring-zinc-200/80'
                                }`}
                              >

                                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.5rem]">
                                  {
                                    message.content
                                  }
                                </p>

                              </div>
                            )}

                          {/* =========================
                              HORA / ESTADO
                          ========================= */}

                          <div
                            className={`mt-1 flex items-center gap-1.5 px-1.5 text-[10px] text-zinc-400 ${
                              isMine
                                ? 'justify-end'
                                : 'justify-start'
                            }`}
                          >

                            <span className="tabular-nums">
                              {new Date(
                                message.created_at
                              ).toLocaleTimeString(
                                'es-MX',
                                {
                                  hour: '2-digit',
                                  minute:
                                    '2-digit',
                                }
                              )}
                            </span>

                            {isMine &&
                              (isRead ? (
                                <CheckCheck
                                  size={13}
                                  strokeWidth={2.3}
                                  className="text-blue-500"
                                />
                              ) : (
                                <Check
                                  size={13}
                                  strokeWidth={2.3}
                                  className="text-zinc-400"
                                />
                              ))}

                          </div>

                        </div>

                      </div>
                    )
                  }
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />

              </div>
            )}

        </div>

      </div>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2.5">

          <p className="mx-auto max-w-4xl text-xs font-medium text-red-600">
            {error}
          </p>

        </div>
      )}

      {/* ==================================================
          PREVISUALIZACIÓN MULTIMEDIA
      ================================================== */}

      {selectedMedia &&
        selectedMediaType && (
          <div className="shrink-0 border-t border-zinc-200/80 bg-white px-3 py-3 sm:px-5">

            <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 shadow-sm">

              {/* PREVIEW */}

              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-zinc-200 sm:h-20 sm:w-28">

                {selectedMediaType ===
                  'image' &&
                  selectedMediaPreviewUrl && (
                    <img
                      src={
                        selectedMediaPreviewUrl
                      }
                      alt="Vista previa"
                      draggable={false}
                      className="h-full w-full select-none object-cover"
                    />
                  )}

                {selectedMediaType ===
                  'video' &&
                  selectedMediaPreviewUrl && (
                    <video
                      src={
                        selectedMediaPreviewUrl
                      }
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  )}

                {!uploadingMedia && (
                  <button
                    type="button"
                    onClick={
                      cancelSelectedMedia
                    }
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black active:scale-90"
                    aria-label="Cancelar archivo"
                  >
                    <X size={13} />
                  </button>
                )}

              </div>

              {/* INFO */}

              <div className="min-w-0 flex-1">

                <p className="truncate text-xs font-semibold text-zinc-800 sm:text-sm">
                  {
                    selectedMedia.name
                  }
                </p>

                <p className="mt-0.5 text-[11px] text-zinc-400">
                  {selectedMediaType ===
                  'image'
                    ? 'Imagen'
                    : 'Video'}{' '}
                  ·{' '}
                  {(
                    selectedMedia.size /
                    1024 /
                    1024
                  ).toFixed(2)}{' '}
                  MB
                </p>

              </div>

              {/* ENVIAR */}

              <button
                type="button"
                onClick={
                  handleUploadMedia
                }
                disabled={
                  uploadingMedia
                }
                className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-700 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadingMedia
                  ? 'Enviando...'
                  : 'Enviar'}
              </button>

            </div>

          </div>
        )}

      {/* ==================================================
          COMPOSER
      ================================================== */}

      <div className="shrink-0 border-t border-zinc-200/80 bg-white px-3 py-3 sm:px-5 sm:py-4">

        <form
          onSubmit={
            handleSendMessage
          }
          className="mx-auto flex max-w-4xl items-center gap-2"
        >

          <input
            ref={
              fileInputRef
            }
            type="file"
            accept="
              image/jpeg,
              image/png,
              image/webp,
              image/gif,
              video/mp4,
              video/webm,
              video/ogg
            "
            onChange={
              handleSelectMedia
            }
            className="hidden"
          />

          {/* ADJUNTAR */}

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={
              sending ||
              uploadingMedia
            }
            className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Adjuntar imagen o video"
          >
            <Paperclip
              size={18}
              className="transition-transform duration-200 group-hover:-rotate-12"
            />
          </button>

          {/* INPUT */}

          <input
            type="text"
            value={content}
            onChange={(event) =>
              handleContentChange(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            disabled={
              sending ||
              uploadingMedia
            }
            placeholder="Escribe un mensaje..."
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {/* ENVIAR */}

          <button
            type="submit"
            disabled={
              sending ||
              uploadingMedia ||
              !content.trim()
            }
            className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm transition-all hover:bg-zinc-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar mensaje"
          >
            <Send
              size={17}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>

        </form>

      </div>

      {/* ==================================================
          VISOR DE IMAGEN
      ================================================== */}

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() =>
            setFullscreenImage(null)
          }
        >

          {/* CERRAR */}

          <button
            type="button"
            onClick={() =>
              setFullscreenImage(null)
            }
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            aria-label="Cerrar imagen"
          >
            <X size={21} />
          </button>

          {/* IMAGEN */}

          <img
            src={fullscreenImage}
            alt="Imagen ampliada"
            draggable={false}
            className="max-h-[90vh] max-w-[95vw] select-none rounded-lg object-contain shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
            onContextMenu={(
              event
            ) =>
              event.preventDefault()
            }
          />

        </div>
      )}

      {/* ==================================================
          ANIMACIÓN DE MENSAJES
      ================================================== */}

      <style>{`
        @keyframes messageIn {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

    </div>
  )
}