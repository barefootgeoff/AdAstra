// Convert a plan date like "3/16" into ISO "2026-03-16"
// The year is inferred from the week dates string ("Mar 16–22, 2026")
export function planDateToISO(dateStr: string, weekDates: string): string {
  const yearMatch = weekDates.match(/\d{4}/)
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString()
  const parts = dateStr.split('/')
  if (parts.length !== 2) return ''
  const month = parts[0].padStart(2, '0')
  const day = parts[1].padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
