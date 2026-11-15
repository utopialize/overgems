import { RULES } from './catalog'
import type { Gem, Slot } from './types'

/** Board stores each object only at its top-left anchor; covered cells stay null. */
export function boardColumns(board: readonly (Gem | null)[]): number { return board.length / RULES.rows }
export function footprint(gem: Gem, anchor: number, columns: number = RULES.columns): number[] {
  if (!Number.isInteger(anchor) || anchor < 0 || anchor >= columns * RULES.rows) return []
  if (gem.kind !== 'major') return [anchor]
  if (anchor % columns >= columns - 1 || Math.floor(anchor / columns) >= RULES.rows - 1) return []
  return [anchor, anchor + 1, anchor + columns, anchor + columns + 1]
}
export function occupantAt(board: readonly (Gem | null)[], index: number): { gem: Gem; anchor: number } | null {
  const columns = boardColumns(board)
  if (!Number.isInteger(index) || index < 0 || index >= board.length) return null
  const direct = board[index]
  if (direct) return { gem: direct, anchor: index }
  for (const anchor of [index - 1, index - columns, index - columns - 1]) {
    const gem = board[anchor]
    if (gem?.kind === 'major' && footprint(gem, anchor, columns).includes(index)) return { gem, anchor }
  }
  return null
}
export function normalizeSlot(board: readonly (Gem | null)[], slot: Slot): Slot {
  return slot.area === 'board' ? { ...slot, index: occupantAt(board, slot.index)?.anchor ?? slot.index } : slot
}
export function canPlace(board: readonly (Gem | null)[], stones: readonly boolean[], gem: Gem, anchor: number, ignoreId?: string): boolean {
  const cells = footprint(gem, anchor, boardColumns(board))
  return cells.length > 0 && cells.every((index) => !stones[index]
    && (!occupantAt(board, index) || occupantAt(board, index)!.gem.id === ignoreId))
}
export function validFootprints(board: readonly (Gem | null)[], stones: readonly boolean[]): boolean {
  const used = new Set<number>()
  for (let anchor = 0; anchor < board.length; anchor++) {
    const gem = board[anchor]
    if (!gem) continue
    const cells = footprint(gem, anchor, boardColumns(board))
    if (!cells.length || cells.some((index) => used.has(index) || stones[index])) return false
    cells.forEach((index) => used.add(index))
  }
  return true
}
