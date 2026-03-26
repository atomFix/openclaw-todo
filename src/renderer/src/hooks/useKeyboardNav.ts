import { useState, useEffect, useCallback } from 'react'

interface UseKeyboardNavOptions<T> {
  items: T[]
  enabled: boolean
  onSelect: (item: T, index: number) => void
  onToggleComplete: (item: T, index: number) => void
  onDelete: (item: T, index: number) => void
}

export function useKeyboardNav<T>({ items, enabled, onSelect, onToggleComplete, onDelete }: UseKeyboardNavOptions<T>) {
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Reset focused index when items change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [items.length])

  // Reset when disabled
  useEffect(() => {
    if (!enabled) setFocusedIndex(-1)
  }, [enabled])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return

    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    if (isInput) return

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(prev => {
        const next = prev + 1
        return next < items.length ? next : prev
      })
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(prev => {
        const next = prev - 1
        return next >= 0 ? next : prev
      })
    } else if (e.key === 'e' || e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault()
        onSelect(items[focusedIndex], focusedIndex)
      }
    } else if (e.key === 'x') {
      if (focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault()
        onToggleComplete(items[focusedIndex], focusedIndex)
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault()
        onDelete(items[focusedIndex], focusedIndex)
      }
    }
  }, [enabled, items, focusedIndex, onSelect, onToggleComplete, onDelete])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { focusedIndex, setFocusedIndex }
}
