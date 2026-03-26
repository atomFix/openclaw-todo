interface FuzzyResult<T> {
  item: T
  score: number
  indices: number[] // matched character positions in the key string
}

/**
 * Lightweight fuzzy search — no external dependencies.
 * Returns items sorted by relevance with character indices for highlighting.
 */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  getKey: (item: T) => string,
): FuzzyResult<T>[] {
  if (!query.trim()) return []

  const q = query.toLowerCase()

  const results: FuzzyResult<T>[] = []

  for (const item of items) {
    const key = getKey(item).toLowerCase()
    const match = fuzzyMatch(q, key)
    if (match !== null) {
      results.push({ item, score: match.score, indices: match.indices })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

interface MatchResult {
  score: number
  indices: number[]
}

function fuzzyMatch(query: string, text: string): MatchResult | null {
  let qi = 0
  let score = 0
  const indices: number[] = []

  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      indices.push(ti)
      // Bonus for consecutive matches
      if (qi > 0 && indices[qi - 1] === ti - 1) {
        score += 10
      }
      // Bonus for matching at word boundaries
      if (ti === 0 || /[\s\-_]/.test(text[ti - 1])) {
        score += 5
      }
      // Bonus for matching at the start
      if (ti === 0) {
        score += 15
      }
      score += 1
      qi++
    }
  }

  // All query chars must match
  if (qi < query.length) return null

  // Penalty for long text (prefer shorter matches)
  score -= text.length * 0.1

  return { score, indices }
}
