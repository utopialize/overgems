import { PixiCanvas } from './components/PixiCanvas'
import './App.css'

export default function App() {
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">React + Vite + PixiJS</p>
          <h1>Overgems</h1>
        </div>
        <span className="badge">Prêt à créer</span>
      </header>
      <section className="scene" aria-label="Démonstration PixiJS">
        <PixiCanvas />
      </section>
      <footer>
        Interface dans <code>src/App.tsx</code> · Scène dans{' '}
        <code>src/pixi/createStarterScene.ts</code>
      </footer>
    </main>
  )
}
