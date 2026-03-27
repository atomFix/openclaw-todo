import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button, Dropdown, message, Tooltip } from 'antd'
import {
  PlusOutlined, InboxOutlined, UndoOutlined, UnorderedListOutlined, AppstoreOutlined,
  DownloadOutlined, QuestionCircleOutlined, CalendarOutlined,
} from '@ant-design/icons'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import Sidebar from './components/Sidebar'
import QuickAdd from './components/QuickAdd'
import TodoFilter from './components/TodoFilter'
import TodoList from './components/TodoList'
import TodoForm from './components/TodoForm'
import TodoDrawer from './components/TodoDrawer'
import BoardView from './components/BoardView'
import CalendarView from './components/CalendarView'
import CommandPalette from './components/CommandPalette'
import ShortcutsHelp from './components/ShortcutsHelp'
import SummaryModal from './components/SummaryModal'
import StatusBar from './components/StatusBar'
import WeeklyChart from './components/WeeklyChart'
import { useTodos } from './hooks/useTodos'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { api } from './api/client'
import type { Todo, CreateTodoInput, UpdateTodoInput, WeeklyStat, TodoStatus, Subtask } from './types/todo'
import type { ParsedQuickAdd } from './utils/parseQuickAdd'

const App: React.FC = () => {
  const {
    todos, total, loading, query, setQuery, refresh,
    createTodo, updateTodo, updateTodoStatus, optimisticUpdateTodoStatus, deleteTodo,
    toggleSubtask, archiveTodos, getSources, deleteTodos,
    groups, selectedGroupId, setSelectedGroupId, allCount,
    createGroup, updateGroup, deleteGroup, promoteSubtask, fetchGroups, reorderGroups,
    summaryTodos,
    smartCounts, activeSmartView, handleSmartViewChange,
    getWeeklyStats, allTags,
  } = useTodos()

  // Dark mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    document.documentElement.dataset.colorMode = isDark ? 'dark' : 'light'
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = useCallback(() => setIsDark(v => !v), [])

  const themeConfig = useMemo(() => ({
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? '#60A5FA' : '#3B82F6',
      borderRadius: 10,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      colorBgContainer: isDark ? '#1E293B' : '#FFFFFF',
      colorBgLayout: isDark ? '#0F172A' : '#F8FAFC',
      colorText: isDark ? '#F1F5F9' : '#1E293B',
      colorTextSecondary: isDark ? '#94A3B8' : '#64748B',
      controlHeight: 36,
    },
    components: {
      Button: { borderRadius: 10, controlHeight: 36 },
      Select: { borderRadius: 10, controlHeight: 36 },
      Input: { borderRadius: 10, controlHeight: 36 },
      DatePicker: { borderRadius: 10, controlHeight: 36 },
      Modal: { borderRadiusLG: 16 },
      Tag: { borderRadiusSM: 6 },
      Drawer: { borderRadiusLG: 16 },
    },
  }), [isDark])

  const [formOpen, setFormOpen] = useState(false)
  const [prefilledTitle, setPrefilledTitle] = useState<string | undefined>(undefined)
  const [prefilledPriority, setPrefilledPriority] = useState<Todo['priority'] | undefined>(undefined)
  const [prefilledTags, setPrefilledTags] = useState<string[] | undefined>(undefined)
  const [prefilledDueDate, setPrefilledDueDate] = useState<string | undefined>(undefined)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [summaryTodo, setSummaryTodo] = useState<Todo | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([])
  const [deletedTodo, setDeletedTodo] = useState<Todo | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Command palette
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Shortcuts help
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // View mode: list, board, or calendar
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>(() => {
    return (localStorage.getItem('viewMode') as 'list' | 'board' | 'calendar') || 'list'
  })
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode)
  }, [viewMode])

  // Status filter from StatusBar
  const [activeStatusFilter, setActiveStatusFilter] = useState<TodoStatus | null>(null)

  // Active tag filter
  const [activeTag, setActiveTag] = useState<string | null>(null)

  // Calendar todos (all, for calendar view)
  const [calendarTodos, setCalendarTodos] = useState<Todo[]>([])

  // Refs for keyboard shortcuts
  const quickAddRef = useRef<{ focus: () => void }>(null)
  const inlineCreateRef = useRef<{ expand: () => void } | null>(null)

  // Notification tracking
  const notifiedOverdueRef = useRef(false)

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

  useEffect(() => {
    getSources().then(setSources).catch(() => {})
    getWeeklyStats().then(setWeeklyStats).catch(() => {})
  }, [getSources, getWeeklyStats])

  const refreshSidebarData = useCallback(() => {
    getSources().then(setSources).catch(() => {})
    getWeeklyStats().then(setWeeklyStats).catch(() => {})
  }, [getSources, getWeeklyStats])

  // Fetch all todos for calendar view
  useEffect(() => {
    if (viewMode === 'calendar') {
      api.listTodos({ ...query, page: 1, page_size: 999 })
        .then(res => setCalendarTodos(res.data))
        .catch(() => {})
    }
  }, [viewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tag counts for sidebar
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    todos.forEach(t => {
      try {
        const tags = JSON.parse(t.tags || '[]') as string[]
        tags.forEach(tag => { counts[tag] = (counts[tag] || 0) + 1 })
      } catch { /* ignore */ }
    })
    return counts
  }, [todos])

  const handleQuickCreate = useCallback(async (input: CreateTodoInput) => {
    await createTodo(input)
    message.success('任务已创建')
    refreshSidebarData()
  }, [createTodo, refreshSidebarData])

  const handleOpenFullForm = useCallback((title: string, parsed?: ParsedQuickAdd) => {
    setPrefilledTitle(title)
    setPrefilledPriority(parsed?.priority)
    setPrefilledTags(parsed?.tags)
    setPrefilledDueDate(parsed?.due_date)
    setFormOpen(true)
  }, [])

  const handleInlineOpenFullForm = useCallback((title: string, priority?: Todo['priority']) => {
    setPrefilledTitle(title)
    setPrefilledPriority(priority)
    setPrefilledTags(undefined)
    setPrefilledDueDate(undefined)
    setFormOpen(true)
  }, [])

  const handleCreate = useCallback(async (data: CreateTodoInput | UpdateTodoInput) => {
    await createTodo(data as CreateTodoInput)
    setFormOpen(false)
    setPrefilledTitle(undefined)
    setPrefilledPriority(undefined)
    setPrefilledTags(undefined)
    setPrefilledDueDate(undefined)
  }, [createTodo])

  const handleDrawerUpdate = useCallback(async (id: string, data: UpdateTodoInput) => {
    await updateTodo(id, data)
  }, [updateTodo])

  const handleEdit = useCallback((todo: Todo) => {
    setEditingTodo(todo)
  }, [])

  // Sync editingTodo when todos change (keep drawer data fresh)
  useEffect(() => {
    if (editingTodo) {
      const updated = todos.find(t => t.id === editingTodo.id)
      if (updated) {
        setEditingTodo(updated)
      }
    }
  }, [todos]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(async (todo: Todo) => {
    // Cache the todo for potential undo
    setDeletedTodo(todo)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      setDeletedTodo(null)
    }, 5000)

    await deleteTodo(todo.id)
    if (editingTodo?.id === todo.id) setEditingTodo(null)
    refreshSidebarData()
    message.success({
      content: '任务已删除',
      duration: 5,
    })
  }, [deleteTodo, refreshSidebarData, editingTodo])

  const handleUndoDelete = useCallback(async () => {
    if (!deletedTodo) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    const todo = deletedTodo
    setDeletedTodo(null)
    try {
      let tags: string[] = []
      try { tags = JSON.parse(todo.tags || '[]') } catch { tags = [] }
      let subtasks: Subtask[] = []
      try { subtasks = JSON.parse(todo.subtasks || '[]') } catch { subtasks = [] }
      await createTodo({
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        tags,
        due_date: todo.due_date,
        source: todo.source,
        notes: todo.notes,
        subtasks,
        group_id: todo.group_id,
        summary: todo.summary,
      })
      message.success('任务已恢复')
    } catch {
      message.error('恢复失败')
    }
  }, [deletedTodo, createTodo])

  // Use optimistic status update for instant feedback
  const handleStatusChange = useCallback((id: string, status: Todo['status']) => {
    optimisticUpdateTodoStatus(id, status)
  }, [optimisticUpdateTodoStatus])

  const handleToggleSubtask = useCallback(async (id: string, index: number) => {
    await toggleSubtask(id, index)
  }, [toggleSubtask])

  const handlePromoteSubtask = useCallback(async (todoId: string, index: number) => {
    await promoteSubtask(todoId, index)
    message.success('子任务已提升为独立任务')
  }, [promoteSubtask])

  const handleArchive = useCallback(async () => {
    const count = await archiveTodos()
    refreshSidebarData()
    if (count > 0) {
      message.success(`已归档 ${count} 个任务`)
    } else {
      message.info('没有需要归档的已完成任务')
    }
  }, [archiveTodos, refreshSidebarData])

  const handleViewSummary = useCallback((todo: Todo) => {
    setSummaryTodo(todo)
  }, [])

  const handleSaveSummary = useCallback(async (todoId: string, summary: string) => {
    await updateTodo(todoId, { summary })
  }, [updateTodo])

  const handleSidebarViewSummary = useCallback((todoId: string) => {
    const todo = todos.find(t => t.id === todoId)
    if (todo) {
      setSummaryTodo(todo)
    } else {
      api.getTodo(todoId).then(t => setSummaryTodo(t)).catch(() => {})
    }
  }, [todos])

  // Status filter from StatusBar
  const handleFilterStatus = useCallback((status: TodoStatus | null) => {
    setActiveStatusFilter(status)
    if (status) {
      setQuery({ ...query, status, page: 1 })
    } else {
      const { status: _, ...rest } = query
      setQuery({ ...rest, page: 1 })
    }
  }, [query, setQuery])

  // Tag filter
  const handleFilterTag = useCallback((tag: string | null) => {
    setActiveTag(tag)
    if (tag) {
      setQuery({ ...query, tag, page: 1 })
    } else {
      const { tag: _, ...rest } = query
      setQuery({ ...rest, page: 1 })
    }
  }, [query, setQuery])

  // ─── Batch Operations ───
  const handleBatchStatusChange = useCallback((status: Todo['status']) => {
    selectedIds.forEach(id => optimisticUpdateTodoStatus(id, status))
    setSelectedIds(new Set())
  }, [selectedIds, optimisticUpdateTodoStatus])

  const handleBatchDelete = useCallback(async () => {
    try {
      const count = selectedIds.size
      await deleteTodos(Array.from(selectedIds))
      setSelectedIds(new Set())
      refreshSidebarData()
      message.success(`已删除 ${count} 个任务`)
    } catch {
      message.error('批量删除失败')
    }
  }, [selectedIds, deleteTodos, refreshSidebarData])

  const handleBatchArchive = useCallback(async () => {
    try {
      const count = selectedIds.size
      await Promise.all(Array.from(selectedIds).map(id => updateTodo(id, { archived: 1 })))
      setSelectedIds(new Set())
      refreshSidebarData()
      message.success(`已归档 ${count} 个任务`)
    } catch {
      message.error('批量归档失败')
    }
  }, [selectedIds, updateTodo, refreshSidebarData])

  const handleBatchAddTags = useCallback(async (tags: string[]) => {
    try {
      const count = selectedIds.size
      await Promise.all(Array.from(selectedIds).map(id => {
        const todo = todos.find(t => t.id === id)
        let existingTags: string[] = []
        try { existingTags = JSON.parse(todo?.tags || '[]') } catch { existingTags = [] }
        const merged = [...new Set([...existingTags, ...tags])]
        return updateTodo(id, { tags: merged })
      }))
      setSelectedIds(new Set())
      message.success(`已为 ${count} 个任务添加标签`)
    } catch {
      message.error('批量添加标签失败')
    }
  }, [selectedIds, todos, updateTodo])

  // ─── Export ───
  const handleExportJSON = useCallback(() => {
    const data = todos.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      tags: t.tags,
      group_id: t.group_id,
      created_at: t.created_at,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openclaw-todo-${dayjs().format('YYYY-MM-DD')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success('已导出 JSON')
  }, [todos])

  const handleExportCSV = useCallback(() => {
    const statusMap: Record<string, string> = { pending: '待处理', in_progress: '进行中', done: '已完成' }
    const priorityMap: Record<string, string> = { high: '高', medium: '中', low: '低' }
    const headers = ['ID', '标题', '状态', '优先级', '截止日期', '标签', '分组', '创建时间']
    const rows = todos.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      statusMap[t.status] || t.status,
      priorityMap[t.priority] || t.priority,
      t.due_date || '',
      `"${(t.tags || '').replace(/"/g, '""')}"`,
      t.group_id || '',
      t.created_at,
    ])
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openclaw-todo-${dayjs().format('YYYY-MM-DD')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success('已导出 CSV')
  }, [todos])

  // ─── Desktop Notification ───
  useEffect(() => {
    const overdueTodos = todos.filter(t =>
      t.due_date && dayjs(t.due_date).isBefore(dayjs(), 'day') && t.status !== 'done'
    )
    if (overdueTodos.length > 0 && !notifiedOverdueRef.current) {
      notifiedOverdueRef.current = true
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          const n = new Notification('OpenClaw Todo', { body: `你有 ${overdueTodos.length} 个过期任务` })
          n.onclick = () => window.focus()
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              const n = new Notification('OpenClaw Todo', { body: `你有 ${overdueTodos.length} 个过期任务` })
              n.onclick = () => window.focus()
            }
          })
        }
      }
    } else if (overdueTodos.length === 0) {
      notifiedOverdueRef.current = false
    }
  }, [todos])

  // ─── Keyboard Navigation ───
  const keyboardNav = useKeyboardNav({
    items: todos,
    enabled: !formOpen && !editingTodo && !summaryTodo && !commandPaletteOpen && !shortcutsHelpOpen && selectedIds.size === 0,
    onSelect: (todo) => handleEdit(todo),
    onToggleComplete: (todo) => {
      const nextStatus = todo.status === 'done' ? 'pending' : todo.status === 'in_progress' ? 'done' : 'in_progress'
      handleStatusChange(todo.id, nextStatus)
    },
    onDelete: (todo) => handleDelete(todo),
  })

  // Reset keyboard nav when todos change
  useEffect(() => {
    keyboardNav.setFocusedIndex(-1)
  }, [todos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // N - focus quick add (only when not in input)
      if (e.key === 'n' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        quickAddRef.current?.focus()
      }

      // C - expand inline create (only when nothing else is active)
      if (e.key === 'c' && !isInput && !e.metaKey && !e.ctrlKey
          && !formOpen && !editingTodo && !summaryTodo && !commandPaletteOpen
          && !shortcutsHelpOpen && selectedIds.size === 0
          && keyboardNav.focusedIndex === -1
          && !window.getSelection()?.toString()) {
        e.preventDefault()
        inlineCreateRef.current?.expand()
      }

      // Cmd/Ctrl+K - toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }

      // ? - toggle shortcuts help
      if (e.key === '?' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShortcutsHelpOpen(prev => !prev)
      }

      // Tab - cycle view mode
      if (e.key === 'Tab' && !isInput && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        setViewMode(prev => prev === 'list' ? 'board' : prev === 'board' ? 'calendar' : 'list')
      }

      // Escape - close modals / clear search / clear selection (topmost first)
      if (e.key === 'Escape') {
        if (shortcutsHelpOpen) {
          setShortcutsHelpOpen(false)
        } else if (selectedIds.size > 0) {
          setSelectedIds(new Set())
        } else if (commandPaletteOpen) {
          setCommandPaletteOpen(false)
        } else if (summaryTodo) {
          setSummaryTodo(null)
        } else if (editingTodo) {
          setEditingTodo(null)
        } else if (formOpen) {
          setFormOpen(false)
          setPrefilledTitle(undefined)
          setPrefilledPriority(undefined)
          setPrefilledTags(undefined)
          setPrefilledDueDate(undefined)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [formOpen, editingTodo, summaryTodo, commandPaletteOpen, shortcutsHelpOpen, selectedIds])

  const pageTitle = activeSmartView === 'today' ? '今天'
    : activeSmartView === 'upcoming' ? '即将到期'
    : activeSmartView === 'overdue' ? '已过期'
    : activeTag
      ? `标签: ${activeTag}`
      : selectedGroupId
        ? (groups.find(g => g.id === selectedGroupId)?.name ?? '任务')
        : '全部任务'

  return (
    <ConfigProvider
      locale={zhCN}
      theme={themeConfig}
    >
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-layout)', transition: 'background 0.25s ease' }}>
        {/* Sidebar */}
        <Sidebar
          groups={groups}
          selectedGroupId={selectedGroupId}
          allCount={allCount}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          onSelectGroup={setSelectedGroupId}
          onCreateGroup={createGroup}
          onRenameGroup={updateGroup}
          onDeleteGroup={deleteGroup}
          onReorderGroups={reorderGroups}
          summaryTodos={summaryTodos}
          onViewSummary={handleSidebarViewSummary}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          smartCounts={smartCounts}
          activeSmartView={activeSmartView}
          onSmartViewChange={handleSmartViewChange}
          allTags={allTags}
          onFilterTag={handleFilterTag}
          activeTag={activeTag}
          tagCounts={tagCounts}
        />

        {/* Main content */}
        <div style={{ flex: 1, marginLeft: sidebarCollapsed ? 60 : 220, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.2s ease' }}>
          {/* Header */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '38px 32px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-primary)',
            height: 98,
            flexShrink: 0,
            transition: 'background 0.25s ease, border-color 0.25s ease',
            WebkitAppRegion: 'drag',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, WebkitAppRegion: 'no-drag' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {pageTitle}
              </span>
              <span key={total} className="count-badge-pulse" style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>
                {total} 个任务
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, WebkitAppRegion: 'no-drag' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <Tooltip title="列表视图">
                  <Button
                    icon={<UnorderedListOutlined />}
                    type={viewMode === 'list' ? 'primary' : 'default'}
                    ghost={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                    style={{ borderRadius: 10, height: 36 }}
                  />
                </Tooltip>
                <Tooltip title="看板视图">
                  <Button
                    icon={<AppstoreOutlined />}
                    type={viewMode === 'board' ? 'primary' : 'default'}
                    ghost={viewMode === 'board'}
                    onClick={() => setViewMode('board')}
                    style={{ borderRadius: 10, height: 36 }}
                  />
                </Tooltip>
                <Tooltip title="日历视图">
                  <Button
                    icon={<CalendarOutlined />}
                    type={viewMode === 'calendar' ? 'primary' : 'default'}
                    ghost={viewMode === 'calendar'}
                    onClick={() => setViewMode('calendar')}
                    style={{ borderRadius: 10, height: 36 }}
                  />
                </Tooltip>
              </div>

              {/* Export */}
              <Dropdown menu={{
                items: [
                  { key: 'json', label: '导出 JSON', onClick: handleExportJSON },
                  { key: 'csv', label: '导出 CSV', onClick: handleExportCSV },
                ],
              }}>
                <Tooltip title="导出">
                  <Button icon={<DownloadOutlined />} style={{ borderRadius: 10, height: 36 }} />
                </Tooltip>
              </Dropdown>

              {/* Shortcuts help */}
              <Tooltip title="快捷键 (?)">
                <Button
                  icon={<QuestionCircleOutlined />}
                  onClick={() => setShortcutsHelpOpen(true)}
                  style={{ borderRadius: 10, height: 36 }}
                />
              </Tooltip>

              <Tooltip title="归档所有已完成任务">
                <Button
                  icon={<InboxOutlined />}
                  onClick={handleArchive}
                  style={{
                    borderRadius: 10,
                    height: 36,
                    fontWeight: 500,
                  }}
                >
                  归档已完成
                </Button>
              </Tooltip>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setPrefilledTitle(undefined)
                  setPrefilledPriority(undefined)
                  setPrefilledTags(undefined)
                  setPrefilledDueDate(undefined)
                  setFormOpen(true)
                }}
                style={{
                  borderRadius: 10,
                  height: 36,
                  fontWeight: 600,
                  boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
                }}
              >
                新建任务
              </Button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '24px 32px' }}>
            {viewMode !== 'calendar' && (
              <>
                <QuickAdd
                  ref={quickAddRef}
                  onCreate={handleQuickCreate}
                  onOpenFullForm={handleOpenFullForm}
                />
                <TodoFilter query={query} onQueryChange={setQuery} onRefresh={refresh} sources={sources} />
              </>
            )}

            {viewMode === 'calendar' ? (
              <CalendarView
                todos={calendarTodos}
                onEdit={handleEdit}
                onStatusChange={handleStatusChange}
              />
            ) : viewMode === 'board' ? (
              <BoardView
                todos={todos}
                onEdit={handleEdit}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onToggleSubtask={handleToggleSubtask}
                onPromoteSubtask={handlePromoteSubtask}
                onViewSummary={handleViewSummary}
              />
            ) : (
              <TodoList
                todos={todos}
                total={total}
                loading={loading}
                page={query.page ?? 1}
                pageSize={query.page_size ?? 20}
                onPageChange={(page, pageSize) => setQuery({ ...query, page, page_size: pageSize })}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onToggleSubtask={handleToggleSubtask}
                onPromoteSubtask={handlePromoteSubtask}
                onViewSummary={handleViewSummary}
                focusedIndex={keyboardNav.focusedIndex}
                onFocusedIndexChange={keyboardNav.setFocusedIndex}
                isSearch={!!query.search}
                isFiltered={!!(query.status || query.priority || query.tag || query.source)}
                activeSmartView={activeSmartView}
                groupName={selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : null}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onBatchStatusChange={handleBatchStatusChange}
                onBatchDelete={handleBatchDelete}
                onBatchArchive={handleBatchArchive}
                onBatchAddTags={handleBatchAddTags}
                onCreateTodo={handleQuickCreate}
                onOpenFullForm={handleInlineOpenFullForm}
                defaultGroupId={selectedGroupId}
                inlineCreateRef={inlineCreateRef}
              />
            )}

            {deletedTodo && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
                padding: '10px 16px',
                background: 'var(--bg-tertiary)',
                borderRadius: 10,
                border: '1px solid var(--border-primary)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  已删除「{deletedTodo.title.length > 20 ? deletedTodo.title.slice(0, 20) + '...' : deletedTodo.title}」
                </span>
                <button
                  onClick={handleUndoDelete}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 12px',
                    border: 'none',
                    background: 'var(--brand-primary-light)',
                    color: 'var(--brand-primary)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                  }}
                >
                  <UndoOutlined style={{ fontSize: 11 }} />
                  撤销
                </button>
              </div>
            )}

            {viewMode === 'list' && (
              <>
                <StatusBar
                  todos={todos}
                  total={total}
                  onFilterStatus={handleFilterStatus}
                  activeStatusFilter={activeStatusFilter}
                />
                <WeeklyChart data={weeklyStats} />
              </>
            )}
          </div>
        </div>

        {/* Create task modal (TodoForm) */}
        <TodoForm
          open={formOpen}
          todo={null}
          onSubmit={handleCreate}
          onClose={() => {
            setFormOpen(false)
            setPrefilledTitle(undefined)
            setPrefilledPriority(undefined)
            setPrefilledTags(undefined)
            setPrefilledDueDate(undefined)
          }}
          sources={sources}
          groups={groups}
          defaultGroupId={selectedGroupId}
          prefilledTitle={prefilledTitle}
          prefilledPriority={prefilledPriority}
          prefilledTags={prefilledTags}
          prefilledDueDate={prefilledDueDate}
        />

        {/* Edit task drawer (replaces TodoForm modal for editing) */}
        <TodoDrawer
          open={!!editingTodo}
          todo={editingTodo}
          onClose={() => setEditingTodo(null)}
          onUpdate={handleDrawerUpdate}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onToggleSubtask={handleToggleSubtask}
          onPromoteSubtask={handlePromoteSubtask}
          onViewSummary={handleViewSummary}
          sources={sources}
          groups={groups}
        />

        <SummaryModal
          open={!!summaryTodo}
          todo={summaryTodo}
          onSave={handleSaveSummary}
          onClose={() => setSummaryTodo(null)}
        />

        {/* Command Palette */}
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          todos={todos}
          groups={groups}
          smartCounts={smartCounts}
          activeSmartView={activeSmartView}
          onSmartViewChange={handleSmartViewChange}
          onSelectGroup={setSelectedGroupId}
          onCreateNew={() => {
            setPrefilledTitle(undefined)
            setPrefilledPriority(undefined)
            setPrefilledTags(undefined)
            setPrefilledDueDate(undefined)
            setFormOpen(true)
          }}
          onToggleTheme={toggleTheme}
          onArchive={handleArchive}
          onEditTodo={handleEdit}
        />

        {/* Shortcuts Help */}
        <ShortcutsHelp
          open={shortcutsHelpOpen}
          onClose={() => setShortcutsHelpOpen(false)}
        />
      </div>
    </ConfigProvider>
  )
}

export default App
