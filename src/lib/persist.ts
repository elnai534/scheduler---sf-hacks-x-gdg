import { useEffect, useState } from 'react'

// useState that survives tab switches' remounts and page reloads via localStorage (client side only).
export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`scheduler:${key}`)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch { return initial }
  })
  useEffect(() => {
    try { localStorage.setItem(`scheduler:${key}`, JSON.stringify(value)) } catch { /* storage full or blocked */ }
  }, [key, value])
  return [value, setValue] as const
}
