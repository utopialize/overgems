import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { createFlowScene } from '../pixi/createFlowScene'
import type { FlowSnapshot } from '../pixi/createFlowScene'
import type { ActiveEmission } from '../game/runtime'

export function PixiCanvas({ emissions, reducedMotion }: { emissions: ActiveEmission[]; reducedMotion: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const snapshot = useRef<FlowSnapshot>({ emissions, reducedMotion, offset: 20 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    snapshot.current = { ...snapshot.current, emissions, reducedMotion }
  }, [emissions, reducedMotion])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    let cancelled = false
    let initialized = false
    let disposeScene: (() => void) | undefined
    let resizeObserver: ResizeObserver | undefined

    async function initialize(container: HTMLDivElement) {
      try {
        await app.init({
          resizeTo: container,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          preference: 'webgl',
          powerPreference: 'low-power',
        })
        initialized = true

        // StrictMode or hot reload can unmount while Pixi initializes.
        if (cancelled) {
          app.destroy(true, { children: true })
          return
        }

        app.canvas.setAttribute('aria-hidden', 'true')
        container.appendChild(app.canvas)
        // Pixi's event system sets touch-action to none by default.
        app.canvas.style.touchAction = 'manipulation'
        disposeScene = createFlowScene(app, snapshot, container)
        const resize = () => {
          snapshot.current.offset = parseFloat(getComputedStyle(container.parentElement!).paddingLeft)
          app.queueResize()
        }
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(container)
        resize()
      } catch (cause) {
        if (!cancelled) {
          console.error('Impossible de démarrer PixiJS', cause)
          setError('Animations indisponibles sur ce navigateur. Le circuit reste jouable.')
        }
      }
    }

    void initialize(host)

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
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
