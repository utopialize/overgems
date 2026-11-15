import type { CSSProperties } from 'react'
import { connections, gemLabel, gemRarity } from '../game/catalog'
import type { Gem } from '../game/types'
import { gemPalette } from './gemPalette'

export function GemView({ gem }: { gem: Gem }) {
  const ports = connections(gem)
  const palette = gemPalette(gem)
  const style = {
    '--gem-main': palette.main, '--gem-light': palette.light,
    '--gem-mid': palette.mid, '--gem-dark': palette.dark,
  } as CSSProperties
  return (
    <span className={`gem-view ${gem.kind}${gemRarity(gem) === 'rare' ? ' rare' : ''}`} data-level={gem.level + 1} data-rarity={gemRarity(gem)} style={style} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        {ports.map((port) => (
          <g key={port} transform={`rotate(${({ N: 0, E: 90, S: 180, W: 270 })[port]} 32 32)`}>
            <path d="M28 14 28 2 36 2 36 14" fill="#a59a8c" stroke="#d1c5b4" strokeWidth="1" />
            <path d="M30 3H34V10H30Z" fill="#f4d6ae" opacity=".5" />
          </g>
        ))}
        {gem.kind === 'major' ? <>
          <path d="M18 5 46 5 59 18 59 46 46 59 18 59 5 46 5 18Z" fill="var(--gem-main)" stroke="var(--gem-light)" strokeWidth="1" />
          <path d="M18 5 22 21 5 18ZM46 5 43 21 22 21 18 5ZM59 18 43 21 46 5Z" fill="var(--gem-light)" />
          <path d="M5 18 22 21 21 43 5 46ZM59 18 43 21 44 43 59 46Z" fill="var(--gem-mid)" />
          <path d="M5 46 21 43 18 59ZM21 43 44 43 46 59 18 59ZM59 46 44 43 46 59Z" fill="var(--gem-dark)" />
          <path d="M22 21 43 21 44 43 21 43Z" fill="var(--gem-main)" stroke="var(--gem-light)" strokeWidth=".45" />
          <path d="M10 18 20 8 44 8" fill="none" stroke="#fff3de" strokeWidth=".8" opacity=".7" />
        </> : <><path d="M32 7 51 17 56 36 43 55 21 55 8 36 13 17Z" fill="var(--gem-main)" stroke="var(--gem-light)" strokeWidth=".8" />
        <path d="M32 7 32 29 13 17ZM51 17 32 29 56 36Z" fill="var(--gem-light)" />
        <path d="M32 29 43 55 56 36ZM32 29 21 55 8 36Z" fill="var(--gem-dark)" />
        <path d="M13 17 32 29 8 36ZM32 29 43 55 21 55Z" fill="var(--gem-mid)" />
        <path d="M15 17 31 9" fill="none" stroke="#f1edf2" strokeWidth="1" opacity=".6" />
        </>}
      </svg>
      <span className="gem-value">{gemLabel(gem)}</span>
      {gemRarity(gem) === 'rare' && <span className="rarity-mark">✦</span>}
    </span>
  )
}
