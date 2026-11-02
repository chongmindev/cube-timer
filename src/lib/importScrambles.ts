// Pasted scrambles, one per line. Numbering like "1." or "3)" at the start of a line is
// dropped, so lists copied from a competition sheet or another timer work as they are.

const NUMBERING = /^\s*(?:#?\d+\s*[.):-]\s+|[a-z]\d*\s*[.):]\s+)/i

/**
 * The scrambles in pasted text. Megaminx scrambles take seven lines each, so for Megaminx a
 * blank line separates scrambles; without blank lines, every seven lines make one.
 */
export function parseScrambles(text: string, event: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(NUMBERING, '').trim())
  if (event !== 'minx') return lines.filter(Boolean)

  const blocks = /\n\s*\n/.test(text)
  const out: string[] = []
  let block: string[] = []
  const flush = () => {
    if (block.length) out.push(block.join('\n'))
    block = []
  }
  for (const line of lines) {
    if (!line) {
      if (blocks) flush()
      continue
    }
    block.push(line)
    if (!blocks && block.length === 7) flush()
  }
  flush()
  return out
}
