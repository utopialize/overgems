import { connections, gemLabel } from '../game/catalog'
import type { Gem } from '../game/types'

export function GemView({ gem }: { gem: Gem }) {
  const ports = connections(gem)
  return (
    <span className={`gem-view ${gem.kind}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        {ports.map((port) => (
          <g key={port} transform={`rotate(${({ N: 0, E: 90, S: 180, W: 270 })[port]} 32 32)`}>
            <path d="M28 14 28 2 36 2 36 14" fill="#a59a8c" stroke="#d1c5b4" strokeWidth="1" />
            <path d="M30 3H34V10H30Z" fill="#f4d6ae" opacity=".5" />
          </g>
        ))}
        <path d="M32 7 51 17 56 36 43 55 21 55 8 36 13 17Z" fill="var(--gem-main)" stroke="var(--gem-light)" strokeWidth=".8" />
        <path d="M32 7 32 29 13 17ZM51 17 32 29 56 36Z" fill="var(--gem-light)" />
        <path d="M32 29 43 55 56 36ZM32 29 21 55 8 36Z" fill="var(--gem-dark)" />
        <path d="M13 17 32 29 8 36ZM32 29 43 55 21 55Z" fill="var(--gem-mid)" />
        <path d="M15 17 31 9" fill="none" stroke="#f1edf2" strokeWidth="1" opacity=".6" />
      </svg>
      <span className="gem-value">{gemLabel(gem)}</span>
    </span>
  )
}
