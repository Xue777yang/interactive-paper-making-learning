export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function overlaps<T>(left: T[], right: T[]) {
  return left.some((item) => right.includes(item))
}

export function formatPercent(value: number) {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`
}

export function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '0 秒'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes} 分 ${rest} 秒`
}

export function createEmptyRecord<K extends string, V>(keys: readonly K[], valueFactory: () => V) {
  return keys.reduce(
    (record, key) => {
      record[key] = valueFactory()
      return record
    },
    {} as Record<K, V>,
  )
}
