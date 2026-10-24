// WCA event ids (for cubing.js scrambles) mapped to the puzzle used for the preview.
export interface CubeEvent {
  id: string
  name: string
  puzzle: string
}

export const EVENTS: CubeEvent[] = [
  { id: '333', name: '3x3', puzzle: '3x3x3' },
  { id: '222', name: '2x2', puzzle: '2x2x2' },
  { id: '444', name: '4x4', puzzle: '4x4x4' },
  { id: '555', name: '5x5', puzzle: '5x5x5' },
  { id: '666', name: '6x6', puzzle: '6x6x6' },
  { id: '777', name: '7x7', puzzle: '7x7x7' },
  { id: '333oh', name: '3x3 one-handed', puzzle: '3x3x3' },
  { id: '333bf', name: '3x3 blindfolded', puzzle: '3x3x3' },
  { id: 'pyram', name: 'Pyraminx', puzzle: 'pyraminx' },
  { id: 'skewb', name: 'Skewb', puzzle: 'skewb' },
  { id: 'minx', name: 'Megaminx', puzzle: 'megaminx' },
  { id: 'sq1', name: 'Square-1', puzzle: 'square1' },
  { id: 'clock', name: 'Clock', puzzle: 'clock' },
]

export function getEvent(id: string): CubeEvent {
  return EVENTS.find((e) => e.id === id) ?? EVENTS[0]
}
