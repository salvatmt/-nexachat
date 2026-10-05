import UserSearch, {
  type Profile,
} from '../chat/UserSearch'

import ConversationList from '../chat/ConversationList'

type SidebarProps = {
  userEmail: string
  selectedConversationId: string | null
  refreshKey: number

  onConversationCreated: (
    conversationId: string,
    profile: Profile
  ) => void

  onSelectConversation: (
    conversationId: string,
    profile: Profile
  ) => void

  onSignOut: () => void
}

export default function Sidebar({
  userEmail,
  selectedConversationId,
  refreshKey,
  onConversationCreated,
  onSelectConversation,
  onSignOut,
}: SidebarProps) {
  const userInitial = userEmail
    .charAt(0)
    .toUpperCase()

  return (
    <aside className="relative flex h-screen w-full max-w-sm flex-col overflow-hidden border-r border-zinc-200/80 bg-white">
      {/* HEADER */}
      <header className="relative border-b border-zinc-200/70 bg-white px-5 pb-4 pt-5">
        {/* subtle top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />

        <div className="flex items-center justify-between">
          {/* BRAND */}
          <div className="flex items-center gap-3">
            <div className="group relative flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-bold text-white shadow-lg shadow-zinc-900/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-900/15">
              <span className="relative z-10">N</span>

              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] font-bold tracking-tight text-zinc-950">
                  NexaChat
                </h1>

                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-zinc-400">
                  Beta
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>

                <p className="text-[10px] font-medium tracking-wide text-zinc-400">
                  Mensajería privada
                </p>
              </div>
            </div>
          </div>

          {/* USER AVATAR */}
          <div
            className="group relative flex h-10 w-10 shrink-0 cursor-default items-center justify-center rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200 transition-all duration-300 hover:ring-zinc-300 hover:shadow-md"
            title={userEmail}
          >
            {userInitial}

            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
        </div>
      </header>

      {/* BUSCADOR */}
      <section className="px-4 pb-3 pt-4">
        <UserSearch
          onConversationCreated={
            onConversationCreated
          }
        />
      </section>

      {/* CONVERSACIONES */}
      <section className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent]">
        <div className="mb-2.5 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
              Conversaciones
            </h2>

            <span className="h-1 w-1 rounded-full bg-zinc-300" />
          </div>
        </div>

        <ConversationList
          selectedConversationId={
            selectedConversationId
          }
          refreshKey={refreshKey}
          onSelectConversation={
            onSelectConversation
          }
        />
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200/70 bg-gradient-to-b from-zinc-50/80 to-zinc-100/60 p-3">
        {/* ACCOUNT */}
        <div className="mb-2 flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white/80 px-3 py-2.5 shadow-sm shadow-zinc-900/[0.02] transition-all duration-200 hover:border-zinc-300 hover:bg-white hover:shadow-md">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white shadow-sm">
            {userInitial}

            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-zinc-800">
              {userEmail}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[9px] font-medium text-emerald-600">
                En línea
              </span>

              <span className="h-0.5 w-0.5 rounded-full bg-zinc-300" />

              <span className="text-[9px] text-zinc-400">
                Cuenta activa
              </span>
            </div>
          </div>
        </div>

        {/* LOGOUT */}
        <button
          type="button"
          onClick={onSignOut}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-500 transition-all duration-200 hover:border-red-100 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>

          Cerrar sesión
        </button>
      </footer>
    </aside>
  )
}