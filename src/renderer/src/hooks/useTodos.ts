import { useState, useEffect, useCallback, useRef } from 'react'
import { message } from 'antd'
import { api, initClient } from '../api/client'
import type { Todo, TodoStats, TodoQuery, CreateTodoInput, UpdateTodoInput, Subtask, WeeklyStat, Group, CreateGroupInput, UpdateGroupInput, TodoSummaryItem, SmartView, SmartCounts } from '../types/todo'
import dayjs from 'dayjs'

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

  useEffect(() => {
    initClient().then(() => setInitialized(true))
  }, [])

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

  // When selectedGroupId changes, update query.group_id and default to non-archived
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

  const fetchTodos = useCallback(async () => {
    if (!initialized) return
    setLoading(true)
    try {
      const [listResult, statsResult] = await Promise.all([
        api.listTodos(query),
        api.getStats(),
      ])
      setTodos(listResult.data)
      setTotal(listResult.total)
      setStats(statsResult)
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    } finally {
      setLoading(false)
    }
  }, [query, initialized])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Refresh groups after any todo mutation
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

  useEffect(() => {
    fetchSummaryTodos()
  }, [fetchSummaryTodos])

  useEffect(() => {
    fetchSmartCounts()
  }, [fetchSmartCounts])

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

  const refreshAfterMutation = useCallback(() => {
    fetchTodos()
    fetchGroups()
    fetchSummaryTodos()
    fetchSmartCounts()
  }, [fetchTodos, fetchGroups, fetchSummaryTodos, fetchSmartCounts])

  // Debounced version to prevent request flooding on rapid mutations
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
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

  const handleSmartViewChange = useCallback((view: SmartView) => {
    setActiveSmartView(view)
    const today = dayjs().format('YYYY-MM-DD')
    const weekLater = dayjs().add(7, 'day').format('YYYY-MM-DD')

    if (view === 'all') {
      setQueryState(prev => {
        const { due_before, due_after, ...rest } = prev
        return { ...rest, page: 1 }
      })
    } else if (view === 'today') {
      setQueryState(prev => ({ ...prev, due_after: today, due_before: today, page: 1 }))
    } else if (view === 'upcoming') {
      setQueryState(prev => ({ ...prev, due_after: today, due_before: weekLater, page: 1 }))
    } else if (view === 'overdue') {
      setQueryState(prev => ({ ...prev, due_before: today, page: 1, due_after: undefined }))
    }
  }, [])

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

    // Optimistic: prepend immediately
    setTodos(prev => [tempTodo, ...prev])
    setTotal(prev => prev + 1)

    try {
      const realTodo = await api.createTodo(input)
      // Replace temp todo with real one (preserves position)
      setTodos(prev => prev.map(t => t.id === tempId ? realTodo : t))
      debouncedRefresh()
      return realTodo
    } catch (err) {
      // Rollback
      setTodos(prev => prev.filter(t => t.id !== tempId))
      setTotal(prev => Math.max(0, prev - 1))
      throw err
    }
  }, [debouncedRefresh])

  const updateTodo = useCallback(async (id: string, input: UpdateTodoInput): Promise<Todo> => {
    // Optimistic: apply changes locally
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
      // Reconcile: replace with server version
      setTodos(prev => prev.map(t => t.id === id ? realTodo : t))
      debouncedRefresh()
      return realTodo
    } catch (err) {
      // Rollback by re-fetching
      fetchTodos()
      throw err
    }
  }, [debouncedRefresh, fetchTodos])

  const updateTodoStatus = useCallback(async (id: string, status: Todo['status']): Promise<Todo> => {
    const todo = await api.updateTodoStatus(id, status)
    debouncedRefresh()
    return todo
  }, [debouncedRefresh])

  // Optimistic status update: immediately update UI, then sync with server
  const optimisticUpdateTodoStatus = useCallback((id: string, status: Todo['status']) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t
      return {
        ...t,
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      }
    }))

    // Send API request in background
    api.updateTodoStatus(id, status)
      .then(() => {
        debouncedRefresh()
      })
      .catch(() => {
        message.error('状态更新失败')
        // Rollback by re-fetching
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
    // Optimistic: flip the subtask locally
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

  const getSources = useCallback(async (): Promise<string[]> => {
    return api.getSources()
  }, [])

  const getWeeklyStats = useCallback(async (): Promise<WeeklyStat[]> => {
    return api.getWeeklyStats()
  }, [])

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
    if (selectedGroupId === id) {
      setSelectedGroupId(null)
    }
    fetchGroups()
  }, [fetchGroups, selectedGroupId])

  const reorderGroups = useCallback(async (items: { id: string; sort_order: number }[]): Promise<void> => {
    await api.reorderGroups(items)
    fetchGroups()
  }, [fetchGroups])

  const promoteSubtask = useCallback(async (todoId: string, index: number): Promise<Todo> => {
    // Optimistic: remove the subtask locally, create a temp new todo
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

    // If a subtask was promoted, optimistically add it as a new todo
    const promotedTempId = nextTempId()
    if (removedSubtask) {
      const now = new Date().toISOString()
      setTodos(prev => {
        // Find the parent todo to get group_id
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
