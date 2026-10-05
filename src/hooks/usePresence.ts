import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return

    let active = true

    const updateOnline = async () => {
      if (!active) return

      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'online',
          last_seen: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error(
          'Error actualizando presencia:',
          error
        )
      }
    }

    const updateOffline = async () => {
      if (!active) return

      active = false

      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'offline',
          last_seen: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error(
          'Error actualizando estado offline:',
          error
        )
      }
    }

    // Entrar como online
    updateOnline()

    // Heartbeat cada 30 segundos
    const heartbeat = window.setInterval(() => {
      updateOnline()
    }, 30_000)

    // Cuando el usuario vuelve a la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOnline()
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    )

    return () => {
      window.clearInterval(heartbeat)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )

      updateOffline()
    }
  }, [userId])
}