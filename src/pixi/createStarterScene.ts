import { Container, Graphics } from 'pixi.js'
import type { Application, Ticker } from 'pixi.js'

/** Keep the scene independent from React and return its resource cleanup. */
export function createStarterScene(app: Application): () => void {
  const scene = new Container()
  const gem = new Graphics()
    .poly([0, -74, 56, 0, 0, 74, -56, 0])
    .fill(0xa78bfa)
    .poly([0, -74, 56, 0, 0, 10])
    .fill(0xddd6fe)
    .poly([0, 10, 56, 0, 0, 74])
    .fill(0x7c3aed)
    .poly([0, -74, 0, 10, -56, 0])
    .fill(0xc4b5fd)

  scene.addChild(gem)
  app.stage.addChild(scene)

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let elapsed = 0

  const update = (ticker: Ticker) => {
    scene.position.set(app.screen.width / 2, app.screen.height / 2)
    if (reducedMotion.matches) {
      gem.position.y = 0
      gem.rotation = 0
      return
    }

    elapsed += ticker.deltaMS / 1000
    gem.position.y = Math.sin(elapsed * 1.5) * 12
    gem.rotation = Math.sin(elapsed * 0.8) * 0.1
  }

  app.ticker.add(update)

  return () => {
    app.ticker.remove(update)
    scene.destroy({ children: true })
  }
}
