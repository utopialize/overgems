export type Direction = 'N' | 'E' | 'S' | 'W'
export type Setting = 'EW' | 'NS' | 'NE' | 'ES' | 'SW' | 'NW' | 'NES' | 'ESW' | 'NSW' | 'NEW' | 'NESW'
export type Gem = { readonly invested?: number; readonly rarity?: 'common' | 'rare' } & (
  | { readonly id: string; readonly kind: 'harvest'; readonly level: number }
  | { readonly id: string; readonly kind: 'major'; readonly level: number }
  | { readonly id: string; readonly kind: 'multiplier'; readonly level: number; readonly setting: Setting })
export type ExcavationTool = { readonly id: string; readonly kind: 'pickaxe' }
export type ShopItem = Gem | ExcavationTool
export type MineralId = 'quartz' | 'fluorite' | 'pyrite' | 'azurite'
export type Slot = { area: 'board' | 'inventory'; index: number }
export type GemOrigin = Slot | { area: 'shop'; index: number; offerId: string }
export type Point = { x: number; y: number }
export type FlowEvent = {
  type: 'move' | 'enter' | 'harvest' | 'multiply' | 'split' | 'turn' | 'end'
  branch: number
  step: number
  from: Point
  to: Point
  direction: Direction
  energy: number
  gain?: number
  factor?: number
  progress?: number
  atStep?: number
  reason?: 'edge' | 'connection' | 'stone' | 'loop' | 'power'
}
export type Emission = {
  events: FlowEvent[]
  gain: number
  limited: boolean
  maxStep: number
  limits: LimitReason[]
}
export type LimitReason = 'events' | 'power' | 'coins' | 'invalid-power'
export type Offer = { item: ShopItem; price: number }
export type Settings = { reducedMotion: boolean; paused: boolean; viewMode: 'simple' | 'advanced' }
export type GameState = {
  version: 1
  board: (Gem | null)[]
  inventory: (Gem | null)[]
  stones: boolean[]
  excavationSeed: number
  excavations: number
  minerals: Record<MineralId, number>
  coins: number
  purchases: number
  rerolls: number
  offers: Offer[]
  seed: number
  nextId: number
  stats: { emissions: number; earned: number; lastGain: number; recent: number[] }
  settings: Settings
  tutorial: number
}
export type Transaction = { game: GameState; message: string; ok: boolean; merged?: boolean; found?: MineralId; reward?: Gem }
