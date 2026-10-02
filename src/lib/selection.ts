/** Toggle one id in a selection: add if absent, remove if present. */
export const toggleId = (cur: string[], id: string): string[] =>
  cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
