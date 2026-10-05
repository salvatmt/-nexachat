import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

import Sidebar from '../components/layout/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'

import { useAuth } from '../contexts/AuthContext'
import { usePresence } from '../hooks/usePresence'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  status: 'online' | 'offline'
  last_seen: string | null
}

type ChatPageProps = {
  userEmail: string
  onSignOut: () => void
}

export default function ChatPage({
  userEmail,
  onSignOut,
}: ChatPageProps) {
  const { user } = useAuth()

  usePresence(user?.id)

  const [conversationId, setConversationId] =
    useState<string | null>(null)

  const [selectedProfile, setSelectedProfile] =
    useState<Profile | null>(null)

  const [refreshKey, setRefreshKey] =
    useState(0)

  /*
   * ------------------------------------------------------
   * CONVERSACIÓN CREADA
   * ------------------------------------------------------
   */

  const handleConversationCreated = (
    id: string,
    profile: Profile
  ) => {
    setConversationId(id)
    setSelectedProfile(profile)

    setRefreshKey((current) => current + 1)
  }

  /*
   * ------------------------------------------------------
   * SELECCIONAR CONVERSACIÓN
   * ------------------------------------------------------
   */

  const handleSelectConversation = (
    id: string,
    profile: Profile
  ) => {
    setConversationId(id)
    setSelectedProfile(profile)
  }

  /*
   * ------------------------------------------------------
   * VOLVER A CONVERSACIONES
   * ------------------------------------------------------
   */

  const handleBackToConversations = () => {
    setConversationId(null)
    setSelectedProfile(null)
  }

  /*
   * ------------------------------------------------------
   * REALTIME PERFIL SELECCIONADO
   * ------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedProfile?.id) {
      return
    }

    const channel = supabase
      .channel(
        `selected-profile-${selectedProfile.id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${selectedProfile.id}`,
        },
        (payload) => {
          setSelectedProfile(
            payload.new as Profile
          )
        }
      )

    channel.subscribe((status) => {
      console.log(
        'Realtime perfil seleccionado:',
        status
      )
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedProfile?.id])

  /*
   * ------------------------------------------------------
   * RENDER
   * ------------------------------------------------------
   */

  return (
    <main className="flex h-screen overflow-hidden bg-zinc-100">

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <div
        className={`h-full w-full shrink-0 md:block md:w-[360px] lg:w-[380px] ${
          conversationId
            ? 'hidden'
            : 'block'
        }`}
      >
        <Sidebar
          userEmail={userEmail}
          selectedConversationId={
            conversationId
          }
          refreshKey={refreshKey}
          onConversationCreated={
            handleConversationCreated
          }
          onSelectConversation={
            handleSelectConversation
          }
          onSignOut={onSignOut}
        />
      </div>

      {/* ==================================================
          CHAT
      ================================================== */}

      <section
        className={`min-w-0 flex-1 ${
          conversationId
            ? 'flex'
            : 'hidden md:flex'
        }`}
      >

        {conversationId &&
        selectedProfile ? (
          <div className="relative flex min-w-0 flex-1 flex-col">

            {/* ==================================================
                BOTÓN VOLVER — SOLO MÓVIL
            ================================================== */}

            <div className="absolute left-3 top-3 z-30 md:hidden">
              <button
                type="button"
                onClick={
                  handleBackToConversations
                }
                className="
                  flex
                  h-10
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-zinc-200/80
                  bg-white/90
                  px-3
                  text-sm
                  font-medium
                  text-zinc-700
                  shadow-sm
                  backdrop-blur-md
                  transition-all
                  hover:bg-white
                  hover:text-zinc-950
                  hover:shadow-md
                  active:scale-95
                "
                aria-label="Volver a conversaciones"
              >
                <ArrowLeft size={17} />

                <span>
                  Chats
                </span>
              </button>
            </div>

            {/* ==================================================
                CHAT WINDOW
            ================================================== */}

            <ChatWindow
              conversationId={
                conversationId
              }
              profile={
                selectedProfile
              }
            />

          </div>
        ) : (

          /* ==================================================
             EMPTY STATE DESKTOP
          ================================================== */

          <div className="hidden flex-1 items-center justify-center bg-zinc-50 md:flex">

            <div className="max-w-md px-6 text-center">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-2xl text-white shadow-sm">
                💬
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Bienvenido a NexaChat
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Selecciona una conversación
                o busca a una persona para
                comenzar.
              </p>

              <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Mensajería privada
              </div>

            </div>

          </div>
        )}

      </section>

    </main>
  )
}