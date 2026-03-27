import dayjs from 'dayjs'

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = dayjs(dateStr)
  const today = dayjs().startOf('day')
  const target = date.startOf('day')
  const diffDays = target.diff(today, 'day')

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === 2) return '后天'
  if (diffDays === -1) return '昨天'
  if (diffDays >= -6 && diffDays <= -2) return `${Math.abs(diffDays)}天前`
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays}天后`
  if (diffDays >= -13 && diffDays <= -7) return `上周${target.format('ddd')}`
  if (diffDays >= 7 && diffDays <= 13) return `下周${target.format('ddd')}`
  if (date.year() === today.year()) return target.format('M月D日')
  return target.format('YYYY年M月D日')
}

export function isOverdue(dateStr: string): boolean {
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}
