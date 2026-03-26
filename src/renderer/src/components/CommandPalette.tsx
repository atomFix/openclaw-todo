import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Input, Tooltip } from 'antd'
import {
  PlusOutlined,
  BulbOutlined,
  InboxOutlined,
  SwapOutlined,
  SearchOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FolderOutlined,
} from '@ant-design/icons'
import type { Todo, Group, SmartCounts, SmartView } from '../types/todo'
import { fuzzySearch } from '../utils/fuzzySearch'

interface CommandItem {
  id: string
  label: string
  section: 'command' | 'smart' | 'group' | 'task'
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  searchKey: string
  _flatIndex?: number
}

interface Props {
  open: boolean
  onClose: () => void
  todos: Todo[]
  groups: Group[]
  smartCounts: SmartCounts
  activeSmartView: SmartView
  onSmartViewChange: (view: SmartView) => void
  onSelectGroup: (id: string | null) => void
  onCreateNew: () => void
  onToggleTheme: () => void
  onArchive: () => void
  onEditTodo: (todo: Todo) => void
}

const RECENT_KEY = 'command-palette-recent'
const MAX_RECENT = 5

function getRecentItems(): string[] {
  try {
    const data = localStorage.getItem(RECENT_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function addRecentItem(id: string) {
  try {
    const items = getRecentItems().filter(i => i !== id)
    items.unshift(id)
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}

const CommandPalette: React.FC<Props> = ({
  open, onClose, todos, groups, smartCounts, activeSmartView,
  onSmartViewChange, onSelectGroup, onCreateNew, onToggleTheme, onArchive, onEditTodo,
}) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<any>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build command items
  const items = useMemo((): CommandItem[] => {
    const cmds: CommandItem[] = [
      {
        id: 'new-todo', label: '新建任务', section: 'command',
        icon: <PlusOutlined style={{ fontSize: 14 }} />, shortcut: 'N',
        action: () => { onCreateNew(); onClose() },
        searchKey: '新建任务 new todo create',
      },
      {
        id: 'toggle-theme', label: '切换主题', section: 'command',
        icon: <BulbOutlined style={{ fontSize: 14 }} />, shortcut: '',
        action: () => { onToggleTheme(); onClose() },
        searchKey: '切换主题 theme dark light',
      },
      {
        id: 'archive', label: '归档已完成', section: 'command',
        icon: <InboxOutlined style={{ fontSize: 14 }} />, shortcut: '',
        action: () => { onArchive(); onClose() },
        searchKey: '归档 archive completed done',
      },
    ]

    // Smart views
    const smartItems: CommandItem[] = [
      {
        id: 'view-all', label: '全部任务', section: 'smart',
        icon: <SearchOutlined style={{ fontSize: 14 }} />,
        action: () => { onSmartViewChange('all'); onSelectGroup(null); onClose() },
        searchKey: '全部任务 all tasks',
      },
      {
        id: 'view-today', label: `今天 (${smartCounts.today})`, section: 'smart',
        icon: <CalendarOutlined style={{ fontSize: 14 }} />,
        action: () => { onSmartViewChange('today'); onSelectGroup(null); onClose() },
        searchKey: `今天 today ${smartCounts.today}`,
      },
      {
        id: 'view-upcoming', label: `即将到期 (${smartCounts.upcoming})`, section: 'smart',
        icon: <ClockCircleOutlined style={{ fontSize: 14 }} />,
        action: () => { onSmartViewChange('upcoming'); onSelectGroup(null); onClose() },
        searchKey: `即将到期 upcoming ${smartCounts.upcoming}`,
      },
      {
        id: 'view-overdue', label: `已过期 (${smartCounts.overdue})`, section: 'smart',
        icon: <ExclamationCircleOutlined style={{ fontSize: 14 }} />,
        action: () => { onSmartViewChange('overdue'); onSelectGroup(null); onClose() },
        searchKey: `已过期 overdue ${smartCounts.overdue}`,
      },
    ]

    // Groups
    const groupItems: CommandItem[] = groups.map(g => ({
      id: `group-${g.id}`, label: g.name, section: 'group' as const,
      icon: <FolderOutlined style={{ fontSize: 14 }} />,
      action: () => { onSelectGroup(g.id); onSmartViewChange('all'); onClose() },
      searchKey: `分组 ${g.name} group`,
    }))

    // Tasks (limit 8)
    const taskItems: CommandItem[] = todos.slice(0, 8).map(t => ({
      id: `task-${t.id}`, label: t.title, section: 'task' as const,
      icon: <span style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className={`status-dot ${t.status}`} />
      </span>,
      action: () => { onEditTodo(t); onClose() },
      searchKey: t.title,
    }))

    return [...cmds, ...smartItems, ...groupItems, ...taskItems]
  }, [todos, groups, smartCounts, onCreateNew, onToggleTheme, onArchive, onSmartViewChange, onSelectGroup, onEditTodo, onClose])

  // Filter items
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items
    return fuzzySearch(query, items, item => item.searchKey).map(r => r.item)
  }, [query, items])

  // Recent items (when query is empty)
  const recentItems = useMemo(() => {
    if (query.trim()) return []
    const recentIds = getRecentItems()
    return recentIds
      .map(id => items.find(i => i.id === id))
      .filter((i): i is CommandItem => !!i)
  }, [query, items])

  // Reset activeIndex when filtered items change
  useEffect(() => {
    setActiveIndex(0)
  }, [filteredItems.length])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeEl = list.querySelector('[data-active="true"]') as HTMLElement
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % filteredItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i - 1 + filteredItems.length) % filteredItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredItems[activeIndex]
      if (item) {
        addRecentItem(item.id)
        item.action()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [filteredItems, activeIndex, onClose])

  // Group items by section
  const groupedItems = useMemo(() => {
    const groups: { section: string; label: string; items: CommandItem[] }[] = []
    const sectionOrder = ['command', 'smart', 'group', 'task']
    const sectionLabels: Record<string, string> = {
      command: '命令',
      smart: '智能视图',
      group: '分组',
      task: '任务',
    }

    let flatIndex = 0
    for (const section of sectionOrder) {
      const sectionItems = filteredItems.filter(i => i.section === section)
      if (sectionItems.length > 0) {
        groups.push({ section, label: sectionLabels[section], items: sectionItems.map(item => ({ ...item, _flatIndex: flatIndex++ })) })
      }
    }
    return groups
  }, [filteredItems])

  if (!open) return null

  // Compute the flat index for the active section
  const flatItems = filteredItems

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-panel" onClick={e => e.stopPropagation()}>
        <Input
          ref={inputRef}
          className="command-palette-input"
          placeholder="搜索命令、任务、分组..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          prefix={<SearchOutlined style={{ color: 'var(--text-quaternary)' }} />}
          autoComplete="off"
        />

        <div className="command-palette-results" ref={listRef}>
          {/* Recent items */}
          {recentItems.length > 0 && !query.trim() && (
            <div className="command-palette-section">
              <div className="command-palette-section-title">最近使用</div>
              {recentItems.map((item, idx) => {
                const flatIdx = flatItems.indexOf(item)
                return (
                  <div
                    key={`recent-${item.id}`}
                    className={`command-palette-item${flatIdx === activeIndex ? ' active' : ''}`}
                    data-active={flatIdx === activeIndex}
                    onClick={() => { addRecentItem(item.id); item.action() }}
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                  >
                    <span className="command-palette-item-icon">{item.icon}</span>
                    <span className="command-palette-item-label">{item.label}</span>
                    {item.shortcut && <span className="command-palette-shortcut">{item.shortcut}</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Grouped results */}
          {groupedItems.map(group => (
            <div key={group.section} className="command-palette-section">
              <div className="command-palette-section-title">{group.label}</div>
              {group.items.map(item => (
                <div
                  key={item.id}
                  className={`command-palette-item${item._flatIndex === activeIndex ? ' active' : ''}`}
                  data-active={item._flatIndex === activeIndex}
                  onClick={() => { addRecentItem(item.id); item.action() }}
                  onMouseEnter={() => setActiveIndex(item._flatIndex ?? 0)}
                >
                  <span className="command-palette-item-icon">{item.icon}</span>
                  <span className="command-palette-item-label">{item.label}</span>
                  {item.shortcut && <span className="command-palette-shortcut">{item.shortcut}</span>}
                </div>
              ))}
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-quaternary)', fontSize: 13 }}>
              没有找到匹配的结果
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
