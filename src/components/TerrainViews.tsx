import { isGem } from '../game/catalog'
import type { ShopItem } from '../game/types'
import { GemView } from './GemView'

export function ItemView({ item }: { item: ShopItem }) {
  if (isGem(item)) return <GemView gem={item} />
  return <span className="tool-view" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false">
    <path d="M31 20 37 23 21 56 15 53Z" fill="#b38a61" stroke="#6a5145" strokeWidth="1.5" />
    <path d="M10 23c8-15 29-17 45-2l-4 6c-12-11-24-12-36 0Z" fill="#b9c4cd" stroke="#e3d7c2" strokeWidth="1.2" />
    <path d="M13 22c12-9 26-10 39 0" fill="none" stroke="#f4d6ae" strokeWidth="1.5" />
  </svg></span>
}

export function StoneView() {
  return <span className="stone-view" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false">
    <path d="M9 23 23 9 44 12 57 29 51 51 30 57 10 47 5 34Z" fill="#65717f" stroke="#87919b" strokeWidth="1" />
    <path d="M9 23 23 9 33 30 5 34Z" fill="#81909d" />
    <path d="M23 9 44 12 57 29 33 30Z" fill="#727f8c" />
    <path d="M33 30 51 51 30 57 10 47Z" fill="#465260" />
    <path d="m36 17-7 12 7 9-8 11" fill="none" stroke="#343f4c" strokeWidth="2.4" />
    <path d="m14 25 9-10" stroke="#a2aab0" opacity=".6" />
  </svg></span>
}

export function MineralIcon({ color = '#f4d6ae' }: { color?: string }) {
  return <svg className="mineral-icon" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <path d="M20 3 33 12 30 31 20 37 8 29 7 13Z" fill={color} />
    <path d="M20 3 20 20 7 13ZM20 20 33 12 30 31Z" fill="#fff" opacity=".35" />
    <path d="M20 20 20 37 8 29Z" fill="#141c2b" opacity=".3" />
    <path d="M20 3 33 12 30 31 20 37 8 29 7 13Z" fill="none" stroke={color} />
  </svg>
}
