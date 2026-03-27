import { useState, useEffect, useCallback, useRef } from 'react'
import { message } from 'antd'
import { api, initClient } from '../api/client'
import type { Todo, TodoStats, TodoQuery, CreateTodoInput, UpdateTodoInput, Subtask, WeeklyStat, Group, CreateGroupInput, UpdateGroupInput, TodoSummaryItem, SmartView, SmartCounts } from '../types/todo'
import dayjs from 'dayjs'

// ─── Data comparison (excludes volatile timestamps) ───
function todosEqual(
  a: Todo[], b: Todo[],
  totalA: number, totalB: number,
): boolean {
  if (totalA !== totalB || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id ||
        a[i].title !== b[i].title ||
        a[i].description !== b[i].description ||
        a[i].status !== b[i].status ||
        a[i].priority !== b[i].priority ||
        a[i].tags !== b[i].tags ||
        a[i].subtasks !== b[i].subtasks ||
        a[i].due_date !== b[i].due_date ||
        a[i].notes !== b[i].notes ||
        a[i].group_id !== b[i].group_id ||
        a[i].source !== b[i].source ||
        a[i].summary !== b[i].summary ||
        a[i].archived !== b[i].archived ||
        a[i].deadline_label !== b[i].deadline_label ||
        a[i].remind_count !== b[i].remind_count) return false
  }
  return true
}

// ─── Client-side smart view derivation ───
function deriveForSmartView(view: SmartView, cache: Todo[]): Todo[] {
  const today = dayjs().format('YYYY-MM-DD')
  const weekLater = dayjs().add(7, 'day').format('YYYY-MM-DD')
  switch (view) {
    case 'today':
      return cache.filter(t => t.due_date === today)
    case 'upcoming':
      return cache.filter(t => t.due_date && t.due_date >= today && t.due_date <= weekLater)
    case 'overdue':
      return cache.filter(t => t.due_date && t.due_date < today && t.status !== 'done')
    default:
      return cache
  }
}

type FetchMode = 'loading' | 'silent'
const SKELETON_MIN_MS = 500

interface UseTodosReturn {
  todos: Todo[]
  total: number
  loading: boolean
  stats: TodoStats | null
  query: TodoQuery
  setQuery: (query: TodoQuery) => void
  refresh: () => void
  createTodo: (input: CreateTodoInput) => Promise<Todo>
  updateTodo: (id: string, input: UpdateTodoInput) => Promise<Todo>
  updateTodoStatus: (id: string, status: Todo['status']) => Promise<Todo>
  optimisticUpdateTodoStatus: (id: string, status: Todo['status']) => void
  updateSubtasks: (id: string, subtasks: Subtask[]) => Promise<Todo>
  toggleSubtask: (id: string, index: number) => Promise<Todo>
  archiveTodos: () => Promise<number>
  deleteTodo: (id: string) => Promise<void>
  deleteTodos: (ids: string[]) => Promise<number>
  getSources: () => Promise<string[]>
  getWeeklyStats: () => Promise<WeeklyStat[]>
  groups: Group[]
  selectedGroupId: string | null
  setSelectedGroupId: (id: string | null) => void
  allCount: number
  createGroup: (input: CreateGroupInput) => Promise<Group>
  updateGroup: (id: string, input: UpdateGroupInput) => Promise<Group>
  deleteGroup: (id: string) => Promise<void>
  promoteSubtask: (todoId: string, index: number) => Promise<Todo>
  fetchGroups: () => void
  reorderGroups: (items: { id: string; sort_order: number }[]) => Promise<void>
  summaryTodos: TodoSummaryItem[]
  fetchSummaryTodos: () => void
  smartCounts: SmartCounts
  activeSmartView: SmartView
  handleSmartViewChange: (view: SmartView) => void
  allTags: string[]
}

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TodoStats | null>(null)
  const [query, setQueryState] = useState<TodoQuery>({ page: 1, page_size: 20, archived: '0' })
  const [initialized, setInitialized] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [allCount, setAllCount] = useState(0)
  const [summaryTodos, setSummaryTodos] = useState<TodoSummaryItem[]>([])
  const [smartCounts, setSmartCounts] = useState<SmartCounts>({ today: 0, upcoming: 0, overdue: 0 })
  const [activeSmartView, setActiveSmartView] = useState<SmartView>('all')
  const [allTags, setAllTags] = useState<string[]>([])

  // ─── Refs ───
  const todosSnapshotRef = useRef<{ todos: Todo[]; total: number }>({ todos: [], total: 0 })
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const masterCacheRef = useRef<Todo[]>([])
  const activeSmartViewRef = useRef<SmartView>('all')
  const cacheLoadingRef = useRef(false)
  const currentDateRef = useRef(dayjs().format('YYYY-MM-DD'))

  useEffect(() => { todosSnapshotRef.current = { todos, total } }, [todos, total])
  useEffect(() => { activeSmartViewRef.current = activeSmartView }, [activeSmartView])
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    }
  }, [])

  useEffect(() => {
    initClient().then(() => setInitialized(true))
  }, [])

  // ─── Master cache: all non-archived todos for instant smart-view switching ───
  const refreshMasterCache = useCallback(async () => {
    if (!initialized || cacheLoadingRef.current) return
    cacheLoadingRef.current = true
    try {
      const result = await api.listTodos({ page: 1, page_size: 9999, archived: '0' })
      masterCacheRef.current = result.data
      // Re-derive current smart view if needed
      if (activeSmartViewRef.current !== 'all') {
        const derived = deriveForSmartView(activeSmartViewRef.current, result.data)
        const snap = todosSnapshotRef.current
        if (!todosEqual(snap.todos, derived, snap.total, derived.length)) {
          setTodos(derived)
          setTotal(derived.length)
        }
        setLoading(false)
      }
    } catch (err) {
      console.error('Failed to refresh master cache:', err)
    } finally {
      cacheLoadingRef.current = false
    }
  }, [initialized])

  // Load cache on init
  useEffect(() => {
    if (initialized) refreshMasterCache()
  }, [initialized, refreshMasterCache])

  // Periodic cache refresh (every 5 min) + midnight detection (every min)
  useEffect(() => {
    const dateTimer = setInterval(() => {
      const today = dayjs().format('YYYY-MM-DD')
      if (today !== currentDateRef.current) {
        currentDateRef.current = today
        // Date changed — re-derive smart view from cache
        if (activeSmartViewRef.current !== 'all' && masterCacheRef.current.length > 0) {
          const derived = deriveForSmartView(activeSmartViewRef.current, masterCacheRef.current)
          setTodos(derived)
          setTotal(derived.length)
        }
        fetchSmartCounts()
      }
    }, 60_000)
    const cacheTimer = setInterval(() => {
      refreshMasterCache()
    }, 5 * 60_000)
    return () => { clearInterval(dateTimer); clearInterval(cacheTimer) }
  }, [refreshMasterCache, fetchSmartCounts])

  // ─── Groups ───
  const fetchGroups = useCallback(async () => {
    if (!initialized) return
    try {
      const [groupList, countResult] = await Promise.all([
        api.listGroups(),
        api.getAllCount(),
      ])
      setGroups(groupList)
      setAllCount(countResult.count)
    } catch (err) {
      console.error('Failed to fetch groups:', err)
    }
  }, [initialized])

  // selectedGroupId → query sync (only matters for 'all' view server fetch)
  useEffect(() => {
    if (selectedGroupId) {
      setQueryState(prev => ({ ...prev, group_id: selectedGroupId, archived: '0', page: 1 }))
    } else {
      setQueryState(prev => {
        const { group_id, ...rest } = prev
        return { ...rest, archived: '0', page: 1 }
      })
    }
  }, [selectedGroupId])

  // ─── Fetch todos (server-side, for 'all' view) ───
  const fetchTodos = useCallback(async (mode: FetchMode = 'loading') => {
    if (!initialized) return
    // Skip when on a smart view — data comes from cache
    if (activeSmartViewRef.current !== 'all') return

    const loadingStart = Date.now()
    if (mode === 'loading') {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
      setLoading(true)
    }

    try {
      const [listResult, statsResult] = await Promise.all([
        api.listTodos(query),
        api.getStats(),
      ])

      if (mode === 'silent' && todosSnapshotRef.current.todos.length > 0) {
        const snap = todosSnapshotRef.current
        if (todosEqual(snap.todos, listResult.data, snap.total, listResult.total)) {
          return
        }
      }

      const applyUpdate = () => {
        setTodos(listResult.data)
        setTotal(listResult.total)
        setStats(statsResult)
        if (mode === 'loading') setLoading(false)
      }

      if (mode === 'loading') {
        const elapsed = Date.now() - loadingStart
        const remaining = Math.max(0, SKELETON_MIN_MS - elapsed)
        if (remaining > 0) {
          loadingTimerRef.current = setTimeout(applyUpdate, remaining)
        } else {
          applyUpdate()
        }
      } else {
        applyUpdate()
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err)
      if (mode === 'loading') {
        const elapsed = Date.now() - loadingStart
        const remaining = Math.max(0, SKELETON_MIN_MS - elapsed)
        if (remaining > 0) {
          setTimeout(() => setLoading(false), remaining)
        } else {
          setLoading(false)
        }
      }
    }
  }, [query, initialized])

  useEffect(() => { fetchTodos() }, [fetchTodos])
  useEffect(() => { fetchGroups() }, [fetchGroups])

  // ─── Sidebar data ───
  const fetchSummaryTodos = useCallback(async () => {
    if (!initialized) return
    try {
      const data = await api.getTodoSummaries()
      setSummaryTodos(data)
    } catch (err) {
      console.error('Failed to fetch summary todos:', err)
    }
  }, [initialized])

  const fetchSmartCounts = useCallback(async () => {
    if (!initialized) return
    try {
      const data = await api.getSmartCounts()
      setSmartCounts(data)
    } catch (err) {
      console.error('Failed to fetch smart counts:', err)
    }
  }, [initialized])

  useEffect(() => { fetchSummaryTodos() }, [fetchSummaryTodos])
  useEffect(() => { fetchSmartCounts() }, [fetchSmartCounts])

  // Extract tags from todos
  useEffect(() => {
    const tagSet = new Set<string>()
    todos.forEach(t => {
      try {
        const tags = JSON.parse(t.tags || '[]') as string[]
        tags.forEach(tag => tagSet.add(tag))
      } catch { /* ignore */ }
    })
    setAllTags(Array.from(tagSet).sort())
  }, [todos])

  // ─── Background refresh after mutations ───
  const refreshAfterMutation = useCallback(() => {
    fetchTodos('silent')
    fetchGroups()
    fetchSummaryTodos()
    fetchSmartCounts()
    refreshMasterCache()
  }, [fetchTodos, fetchGroups, fetchSummaryTodos, fetchSmartCounts, refreshMasterCache])

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [])

  const debouncedRefresh = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      refreshAfterMutation()
    }, 100)
  }, [refreshAfterMutation])

  const setQuery = useCallback((newQuery: TodoQuery) => {
    setQueryState((prev) => ({ ...prev, ...newQuery, page: newQuery.page ?? 1 }))
  }, [])

  // ─── Smart view switch: instant from cache ───
  const handleSmartViewChange = useCallback((view: SmartView) => {
    setActiveSmartView(view)
    activeSmartViewRef.current = view // sync ref immediately

    if (view !== 'all') {
      // Smart view: derive from cache instantly
      if (masterCacheRef.current.length > 0) {
        const derived = deriveForSmartView(view, masterCacheRef.current)
        setTodos(derived)
        setTotal(derived.length)
        setLoading(false)
      } else {
        // Cache not ready yet — show skeleton until cache loads
        setLoading(true)
      }
      // Don't change queryState → fetchTodos won't fire
    } else {
      // 'all' view: server fetch with clean query
      setQueryState(prev => {
        const { due_before, due_after, ...rest } = prev
        return { ...rest, page: 1 }
      })
    }
  }, [])

  // ─── CRUD operations (all optimistic) ───
  let tempIdCounter = 0
  const nextTempId = () => `__temp_${++tempIdCounter}_${Date.now()}`

  const createTodo = useCallback(async (input: CreateTodoInput): Promise<Todo> => {
    const tempId = nextTempId()
    const now = new Date().toISOString()
    const tempTodo: Todo = {
      id: tempId,
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      priority: input.priority ?? 'low',
      tags: input.tags ? JSON.stringify(input.tags) : '[]',
      due_date: input.due_date ?? null,
      completed_at: null,
      created_at: now,
      updated_at: now,
      source: input.source ?? '',
      notes: input.notes ?? '',
      subtasks: input.subtasks ? JSON.stringify(input.subtasks) : '[]',
      deadline_label: input.deadline_label ?? '',
      remind_count: 0,
      archived: 0,
      group_id: input.group_id ?? null,
      summary: input.summary ?? '',
    }

    setTodos(prev => [tempTodo, ...prev])
    setTotal(prev => prev + 1)

    try {
      const realTodo = await api.createTodo(input)
      setTodos(prev => prev.map(t => t.id === tempId ? realTodo : t))
      debouncedRefresh()
      return realTodo
    } catch (err) {
      setTodos(prev => prev.filter(t => t.id !== tempId))
      setTotal(prev => Math.max(0, prev - 1))
      throw err
    }
  }, [debouncedRefresh])

  const updateTodo = useCallback(async (id: string, input: UpdateTodoInput): Promise<Todo> => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, updated_at: new Date().toISOString() }
      if (input.title !== undefined) updated.title = input.title
      if (input.description !== undefined) updated.description = input.description
      if (input.status !== undefined) updated.status = input.status
      if (input.priority !== undefined) updated.priority = input.priority
      if (input.tags !== undefined) updated.tags = typeof input.tags === 'string' ? input.tags : JSON.stringify(input.tags)
      if (input.due_date !== undefined) updated.due_date = input.due_date
      if (input.notes !== undefined) updated.notes = input.notes
      if (input.subtasks !== undefined) updated.subtasks = typeof input.subtasks === 'string' ? input.subtasks : JSON.stringify(input.subtasks)
      if (input.group_id !== undefined) updated.group_id = input.group_id
      if (input.summary !== undefined) updated.summary = input.summary
      if (input.source !== undefined) updated.source = input.source
      if (input.archived !== undefined) updated.archived = typeof input.archived === 'string' ? parseInt(input.archived) : input.archived
      if (input.status === 'done') updated.completed_at = new Date().toISOString()
      return updated
    }))

    try {
      const realTodo = await api.updateTodo(id, input)
      setTodos(prev => prev.map(t => t.id === id ? realTodo : t))
      debouncedRefresh()
      return realTodo
    } catch (err) {
      fetchTodos()
      throw err
    }
  }, [debouncedRefresh, fetchTodos])

  const updateTodoStatus = useCallback(async (id: string, status: Todo['status']): Promise<Todo> => {
    const todo = await api.updateTodoStatus(id, status)
    debouncedRefresh()
    return todo
  }, [debouncedRefresh])

  const optimisticUpdateTodoStatus = useCallback((id: string, status: Todo['status']) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t
      return { ...t, status, completed_at: status === 'done' ? new Date().toISOString() : null }
    }))

    api.updateTodoStatus(id, status)
      .then(() => { debouncedRefresh() })
      .catch(() => {
        message.error('状态更新失败')
        fetchTodos()
      })
  }, [debouncedRefresh, fetchTodos])

  const updateSubtasks = useCallback(async (id: string, subtasks: Subtask[]): Promise<Todo> => {
    const subtasksStr = JSON.stringify(subtasks)
    setTodos(prev => prev.map(t => t.id === id ? { ...t, subtasks: subtasksStr, updated_at: new Date().toISOString() } : t))
    try {
      const todo = await api.updateSubtasks(id, subtasks)
      setTodos(prev => prev.map(t => t.id === id ? todo : t))
      debouncedRefresh()
      return todo
    } catch {
      fetchTodos()
      throw new Error('子任务更新失败')
    }
  }, [debouncedRefresh, fetchTodos])

  const toggleSubtask = useCallback(async (id: string, index: number): Promise<Todo> => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t
      try {
        const subs: Subtask[] = JSON.parse(t.subtasks || '[]')
        if (subs[index]) subs[index] = { ...subs[index], done: !subs[index].done }
        return { ...t, subtasks: JSON.stringify(subs), updated_at: new Date().toISOString() }
      } catch { return t }
    }))
    try {
      const todo = await api.toggleSubtask(id, index)
      setTodos(prev => prev.map(t => t.id === id ? todo : t))
      debouncedRefresh()
      return todo
    } catch {
      fetchTodos()
      throw new Error('子任务切换失败')
    }
  }, [debouncedRefresh, fetchTodos])

  const archiveTodos = useCallback(async (): Promise<number> => {
    const result = await api.archiveTodos()
    debouncedRefresh()
    return result.archived
  }, [debouncedRefresh])

  const deleteTodo = useCallback(async (id: string): Promise<void> => {
    const prev = todos
    setTodos(p => p.filter(t => t.id !== id))
    setTotal(p => Math.max(0, p - 1))
    try {
      await api.deleteTodo(id)
      debouncedRefresh()
    } catch {
      setTodos(prev)
      setTotal(p => p + 1)
      throw new Error('删除失败')
    }
  }, [todos, debouncedRefresh])

  const deleteTodos = useCallback(async (ids: string[]): Promise<number> => {
    const idSet = new Set(ids)
    const prev = todos
    setTodos(p => p.filter(t => !idSet.has(t.id)))
    setTotal(p => Math.max(0, p - ids.length))
    try {
      const result = await api.deleteTodos(ids)
      debouncedRefresh()
      return result.deleted
    } catch {
      setTodos(prev)
      setTotal(p => p + ids.length)
      throw new Error('批量删除失败')
    }
  }, [todos, debouncedRefresh])

  const getSources = useCallback(async (): Promise<string[]> => { return api.getSources() }, [])
  const getWeeklyStats = useCallback(async (): Promise<WeeklyStat[]> => { return api.getWeeklyStats() }, [])

  const createGroup = useCallback(async (input: CreateGroupInput): Promise<Group> => {
    const group = await api.createGroup(input)
    fetchGroups()
    return group
  }, [fetchGroups])

  const updateGroup = useCallback(async (id: string, input: UpdateGroupInput): Promise<Group> => {
    const group = await api.updateGroup(id, input)
    fetchGroups()
    return group
  }, [fetchGroups])

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    await api.deleteGroup(id)
    if (selectedGroupId === id) setSelectedGroupId(null)
    fetchGroups()
  }, [fetchGroups, selectedGroupId])

  const reorderGroups = useCallback(async (items: { id: string; sort_order: number }[]): Promise<void> => {
    await api.reorderGroups(items)
    fetchGroups()
  }, [fetchGroups])

  const promoteSubtask = useCallback(async (todoId: string, index: number): Promise<Todo> => {
    let removedSubtask: Subtask | null = null
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t
      try {
        const subs: Subtask[] = JSON.parse(t.subtasks || '[]')
        if (subs[index]) {
          removedSubtask = subs[index]
          const newSubs = [...subs]
          newSubs.splice(index, 1)
          return { ...t, subtasks: JSON.stringify(newSubs), updated_at: new Date().toISOString() }
        }
      } catch { /* ignore */ }
      return t
    }))

    const promotedTempId = nextTempId()
    if (removedSubtask) {
      const now = new Date().toISOString()
      setTodos(prev => {
        const parent = prev.find(t => t.id === todoId)
        const promoted: Todo = {
          id: promotedTempId,
          title: removedSubtask!.text,
          description: '',
          status: 'pending',
          priority: 'low',
          tags: '[]',
          due_date: null,
          completed_at: null,
          created_at: now,
          updated_at: now,
          source: '',
          notes: '',
          subtasks: '[]',
          deadline_label: '',
          remind_count: 0,
          archived: 0,
          group_id: parent?.group_id ?? null,
          summary: '',
        }
        return [promoted, ...prev]
      })
      setTotal(p => p + 1)
    }

    try {
      const todo = await api.promoteSubtask(todoId, index)
      setTodos(prev => prev.map(t => t.id === todoId ? todo : t))
      debouncedRefresh()
      return todo
    } catch {
      fetchTodos()
      throw new Error('子任务提升失败')
    }
  }, [debouncedRefresh, fetchTodos])

  return {
    todos, total, loading, stats, query, setQuery, refresh: fetchTodos,
    createTodo, updateTodo, updateTodoStatus, optimisticUpdateTodoStatus, updateSubtasks, toggleSubtask,
    archiveTodos, deleteTodo, deleteTodos, getSources, getWeeklyStats,
    groups, selectedGroupId, setSelectedGroupId, allCount,
    createGroup, updateGroup, deleteGroup, promoteSubtask, fetchGroups,
    reorderGroups, summaryTodos, fetchSummaryTodos,
    smartCounts, activeSmartView, handleSmartViewChange,
    allTags,
  }
}
