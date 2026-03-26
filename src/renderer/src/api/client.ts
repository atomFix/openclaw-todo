import type {
  Todo,
  TodoStats,
  TodoListResponse,
  TodoQuery,
  CreateTodoInput,
  UpdateTodoInput,
  Subtask,
  WeeklyStat,
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  TodoSummaryItem,
  SmartCounts,
} from '../types/todo'

let baseUrl = ''

export async function initClient(): Promise<void> {
  const port = await window.api.getServerPort()
  baseUrl = `http://127.0.0.1:${port}/api/v1`
}

function getBaseUrl(): string {
  if (!baseUrl) throw new Error('API client not initialized')
  return baseUrl
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => request<{ status: string; port: number; version: string }>('/health'),

  listTodos: (query?: TodoQuery) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<TodoListResponse>(`/todos${qs ? `?${qs}` : ''}`)
  },

  getTodo: (id: string) => request<Todo>(`/todos/${id}`),

  createTodo: (input: CreateTodoInput) =>
    request<Todo>('/todos', { method: 'POST', body: JSON.stringify(input) }),

  updateTodo: (id: string, input: UpdateTodoInput) =>
    request<Todo>(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  updateTodoStatus: (id: string, status: Todo['status']) =>
    request<Todo>(`/todos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  updateSubtasks: (id: string, subtasks: Subtask[]) =>
    request<Todo>(`/todos/${id}/subtasks`, { method: 'PATCH', body: JSON.stringify({ subtasks }) }),

  toggleSubtask: (id: string, index: number) =>
    request<Todo>(`/todos/${id}/subtasks/${index}`, { method: 'PATCH' }),

  archiveTodos: () =>
    request<{ archived: number }>('/todos/archive', { method: 'POST' }),

  deleteTodo: (id: string) =>
    request<{ success: boolean }>(`/todos/${id}`, { method: 'DELETE' }),

  deleteTodos: (ids: string[]) =>
    request<{ deleted: number }>('/todos', { method: 'DELETE', body: JSON.stringify({ ids }) }),

  getStats: () => request<TodoStats>('/todos/stats/summary'),

  getWeeklyStats: () => request<WeeklyStat[]>('/todos/stats/weekly'),

  getOverdue: () => request<Todo[]>('/todos/stats/overdue'),

  getSources: () => request<string[]>('/todos/sources'),

  listGroups: () => request<Group[]>('/groups'),

  createGroup: (input: CreateGroupInput) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify(input) }),

  updateGroup: (id: string, input: UpdateGroupInput) =>
    request<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  deleteGroup: (id: string) =>
    request<{ success: boolean }>(`/groups/${id}`, { method: 'DELETE' }),

  reorderGroups: (items: { id: string; sort_order: number }[]) =>
    request<{ success: boolean }>('/groups/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),

  getAllCount: () => request<{ count: number }>('/groups/stats/all-count'),

  promoteSubtask: (todoId: string, index: number) =>
    request<Todo>(`/todos/${todoId}/promote-subtask/${index}`, { method: 'POST' }),

  getTodoSummaries: (limit: number = 20) =>
    request<TodoSummaryItem[]>(`/todos/summaries?limit=${limit}`),

  getSmartCounts: () => request<SmartCounts>('/todos/smart-counts'),
}
