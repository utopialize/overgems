import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { createStarterScene } from '../pixi/createStarterScene'

export function PixiCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    let cancelled = false
    let initialized = false
    let disposeScene: (() => void) | undefined

    async function initialize(container: HTMLDivElement) {
      try {
        await app.init({
          resizeTo: container,
          background: '#101420',
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          preference: 'webgl',
        })
        initialized = true

        // StrictMode or hot reload can unmount while Pixi initializes.
        if (cancelled) {
          app.destroy(true, { children: true })
          return
        }

        app.canvas.setAttribute('role', 'img')
        app.canvas.setAttribute('aria-label', 'Un cristal violet animé avec PixiJS')
        container.appendChild(app.canvas)
        disposeScene = createStarterScene(app)
      } catch (cause) {
        if (!cancelled) {
          console.error('Impossible de démarrer PixiJS', cause)
          setError('Impossible de démarrer la scène. Vérifiez que WebGL est disponible dans votre navigateur.')
        }
      }
    }

    void initialize(host)

    return () => {
      cancelled = true
      if (initialized) {
        disposeScene?.()
        app.destroy(true, { children: true })
      }
    }
  }, [])

  return (
    <div ref={hostRef} className="pixi-canvas">
      {error && <p className="scene-error" role="alert">{error}</p>}
    </div>
  )
}
