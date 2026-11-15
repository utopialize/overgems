import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { createSession, sessionReducer, suspendSession } from './runtime'
import { loadGame, saveGame } from './save'

export function useGame() {
  const [loaded] = useState(loadGame)
  const [session, dispatch] = useReducer(sessionReducer, loaded.game, (game) => createSession(game, performance.now()))
  const [saveError, setSaveError] = useState('')
  const ref = useRef(session)
  useLayoutEffect(() => { ref.current = session }, [session])
  useEffect(() => {
    const timer = window.setTimeout(() => setSaveError(saveGame(session.game)), 150)
    return () => clearTimeout(timer)
  }, [session.game])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) dispatch({ type: 'tick', now: performance.now() })
    }, 25)
    const suspend = () => {
      const settled = suspendSession(ref.current)
      saveGame(settled.game)
      dispatch({ type: 'suspend', now: performance.now() })
    }
    const visibility = () => {
      if (document.hidden) suspend()
      else dispatch({ type: 'resume', now: performance.now() })
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', suspend)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', suspend)
    }
  }, [])
  return { session, dispatch, saveError, loadWarning: loaded.warning }
}
