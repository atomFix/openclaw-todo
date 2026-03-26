import dayjs from 'dayjs'

export interface ParsedQuickAdd {
  title: string
  due_date?: string
  tags?: string[]
  priority?: 'high' | 'medium' | 'low'
}

export interface ParsedToken {
  type: 'date' | 'tag' | 'priority'
  value: string
  label: string
  color: string
  start: number
  end: number
}

export interface ParsedQuickAddTokens extends ParsedQuickAdd {
  tokens: ParsedToken[]
}

/**
 * Parse natural language quick-add input.
 *
 * Supported patterns:
 *   Priority: p1/p2/p3 or !1/!2/!3
 *   Tags: #工作 #urgent
 *   Date keywords: 今天/明天/后天, 下周一~下周日, today/tomorrow
 *   Explicit dates: 3/15, 2026-03-15
 */
export function parseQuickAdd(input: string): ParsedQuickAdd {
  let text = input.trim()
  let due_date: string | undefined
  let priority: 'high' | 'medium' | 'low' | undefined
  const tags: string[] = []

  // 1. Extract priority: p1/p2/p3 or !1/!2/!3
  const priorityMatch = text.match(/\b([p!])([123])\b/i)
  if (priorityMatch) {
    const level = priorityMatch[2]
    if (level === '1') priority = 'high'
    else if (level === '2') priority = 'medium'
    else if (level === '3') priority = 'low'
    text = text.replace(priorityMatch[0], '').trim()
  }

  // 2. Extract tags: #tag
  const tagRegex = /#(\S+)/g
  let tagMatch: RegExpExecArray | null
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    tags.push(tagMatch[1])
  }
  text = text.replace(/#\S+/g, '').trim()

  // 3. Extract date keywords
  const today = dayjs().startOf('day')

  // Chinese date keywords
  const dateKeywordMap: Record<string, dayjs.Dayjs> = {
    '今天': today,
    '明天': today.add(1, 'day'),
    '后天': today.add(2, 'day'),
    '大后天': today.add(3, 'day'),
  }

  // 下周X (next Monday ~ Sunday)
  const weekdayMap: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0,
  }
  const nextWeekMatch = text.match(/下星期?([一二三四五六日天])/)
  if (nextWeekMatch) {
    const targetDay = weekdayMap[nextWeekMatch[1]]
    if (targetDay !== undefined) {
      const currentDay = today.day()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      daysUntil += 7 // next week
      dateKeywordMap[`下星期${nextWeekMatch[1]}`] = today.add(daysUntil, 'day')
    }
  }

  // English date keywords
  dateKeywordMap['today'] = today
  dateKeywordMap['tomorrow'] = today.add(1, 'day')

  // Check for date keywords in text
  for (const [keyword, date] of Object.entries(dateKeywordMap)) {
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
    if (idx !== -1) {
      due_date = date.format('YYYY-MM-DD')
      text = text.slice(0, idx) + text.slice(idx + keyword.length)
      break
    }
  }
  text = text.replace(/\s+/g, ' ').trim()

  // 4. Extract explicit dates: M/D or YYYY-MM-DD
  if (!due_date) {
    // YYYY-MM-DD
    const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
    if (isoMatch) {
      const parsed = dayjs(`${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`)
      if (parsed.isValid()) {
        due_date = parsed.format('YYYY-MM-DD')
        text = text.replace(isoMatch[0], '').trim()
      }
    }

    // M/D (current year)
    if (!due_date) {
      const mdMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)
      if (mdMatch) {
        const month = parseInt(mdMatch[1], 10)
        const day = parseInt(mdMatch[2], 10)
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const year = today.year()
          const parsed = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
          if (parsed.isValid()) {
            due_date = parsed.format('YYYY-MM-DD')
            text = text.replace(mdMatch[0], '').trim()
          }
        }
      }
    }
  }

  // Clean up remaining text
  text = text.replace(/\s+/g, ' ').trim()

  return {
    title: text,
    due_date,
    tags: tags.length > 0 ? tags : undefined,
    priority,
  }
}

/**
 * Extended version that also returns token positions for preview chips.
 */
export function parseQuickAddTokens(input: string): ParsedQuickAddTokens {
  let text = input.trim()
  const tokens: ParsedToken[] = []
  let due_date: string | undefined
  let priority: 'high' | 'medium' | 'low' | undefined
  const tags: string[] = []

  // 1. Extract priority: p1/p2/p3 or !1/!2/!3
  const priorityMatch = text.match(/\b([p!])([123])\b/i)
  if (priorityMatch) {
    const level = priorityMatch[2]
    if (level === '1') priority = 'high'
    else if (level === '2') priority = 'medium'
    else if (level === '3') priority = 'low'
    const priorityColors: Record<string, string> = { high: '#EF4444', medium: '#F97316', low: '#22C55E' }
    const priorityLabels: Record<string, string> = { high: '高优先', medium: '中优先', low: '低优先' }
    const pValue = priority!
    tokens.push({
      type: 'priority',
      value: pValue,
      label: priorityLabels[pValue],
      color: priorityColors[pValue],
      start: priorityMatch.index!,
      end: priorityMatch.index! + priorityMatch[0].length,
    })
    text = text.replace(priorityMatch[0], '').trim()
  }

  // Adjust offsets after removal
  let offset = 0
  const originalInput = input.trim()

  // 2. Extract tags: #tag
  const tagRegex = /#(\S+)/g
  let tagMatch: RegExpExecArray | null
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    tags.push(tagMatch[1])
    tokens.push({
      type: 'tag',
      value: tagMatch[1],
      label: `#${tagMatch[1]}`,
      color: '#7C3AED',
      start: -1, // computed below
      end: -1,
    })
  }
  // Find tag positions in original text (approximate)
  const tagRegex2 = /#(\S+)/g
  let tagMatch2: RegExpExecArray | null
  while ((tagMatch2 = tagRegex2.exec(originalInput)) !== null) {
    const tokIdx = tokens.findIndex(t => t.type === 'tag' && t.label === `#${tagMatch2![1]}` && t.start === -1)
    if (tokIdx !== -1) {
      tokens[tokIdx].start = tagMatch2.index!
      tokens[tokIdx].end = tagMatch2.index! + tagMatch2[0].length
    }
  }
  text = text.replace(/#\S+/g, '').trim()

  // 3. Extract date keywords
  const today = dayjs().startOf('day')

  const dateKeywordMap: Record<string, dayjs.Dayjs> = {
    '今天': today,
    '明天': today.add(1, 'day'),
    '后天': today.add(2, 'day'),
    '大后天': today.add(3, 'day'),
  }

  const weekdayMap: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0,
  }
  const nextWeekMatch = text.match(/下星期?([一二三四五六日天])/)
  if (nextWeekMatch) {
    const targetDay = weekdayMap[nextWeekMatch[1]]
    if (targetDay !== undefined) {
      const currentDay = today.day()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      daysUntil += 7
      dateKeywordMap[`下星期${nextWeekMatch[1]}`] = today.add(daysUntil, 'day')
    }
  }

  dateKeywordMap['today'] = today
  dateKeywordMap['tomorrow'] = today.add(1, 'day')

  for (const [keyword, date] of Object.entries(dateKeywordMap)) {
    const idx = originalInput.toLowerCase().indexOf(keyword.toLowerCase())
    if (idx !== -1) {
      due_date = date.format('YYYY-MM-DD')
      tokens.push({
        type: 'date',
        value: due_date,
        label: keyword,
        color: '#3B82F6',
        start: idx,
        end: idx + keyword.length,
      })
      text = text.slice(0, text.toLowerCase().indexOf(keyword.toLowerCase())) + text.slice(text.toLowerCase().indexOf(keyword.toLowerCase()) + keyword.length)
      break
    }
  }
  text = text.replace(/\s+/g, ' ').trim()

  // 4. Extract explicit dates: M/D or YYYY-MM-DD
  if (!due_date) {
    const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
    if (isoMatch) {
      const parsed = dayjs(`${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`)
      if (parsed.isValid()) {
        due_date = parsed.format('YYYY-MM-DD')
        const idx = originalInput.indexOf(isoMatch[0])
        tokens.push({
          type: 'date', value: due_date, label: isoMatch[0], color: '#3B82F6',
          start: idx, end: idx + isoMatch[0].length,
        })
        text = text.replace(isoMatch[0], '').trim()
      }
    }

    if (!due_date) {
      const mdMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)
      if (mdMatch) {
        const month = parseInt(mdMatch[1], 10)
        const day = parseInt(mdMatch[2], 10)
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const year = today.year()
          const parsed = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
          if (parsed.isValid()) {
            due_date = parsed.format('YYYY-MM-DD')
            const idx = originalInput.indexOf(mdMatch[0])
            tokens.push({
              type: 'date', value: due_date, label: mdMatch[0], color: '#3B82F6',
              start: idx, end: idx + mdMatch[0].length,
            })
            text = text.replace(mdMatch[0], '').trim()
          }
        }
      }
    }
  }

  text = text.replace(/\s+/g, ' ').trim()

  return {
    title: text,
    due_date,
    tags: tags.length > 0 ? tags : undefined,
    priority,
    tokens,
  }
}
