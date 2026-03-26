export interface Group {
  id: string
  name: string
  icon: string
  sort_order: number
  created_at: string
  todo_count?: number
}

export interface CreateGroupInput {
  name: string
  icon?: string
  sort_order?: number
}

export interface UpdateGroupInput {
  name?: string
  icon?: string
  sort_order?: number
}

export interface Subtask {
  text: string
  done: boolean
}

export interface Todo {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  tags: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  source: string
  notes: string
  subtasks: string
  deadline_label: string
  remind_count: number
  archived: number
  group_id: string | null
  summary: string
}

export interface TodoStats {
  total: number
  pending: number
  in_progress: number
  done: number
  archived: number
}

export interface TodoListResponse {
  data: Todo[]
  total: number
  page: number
  page_size: number
}

export interface TodoQuery {
  status?: string
  priority?: string
  search?: string
  tag?: string
  due_before?: string
  due_after?: string
  source?: string
  archived?: string
  has_overdue_subtasks?: string
  group_id?: string
  sort_by?: string
  sort_order?: string
  page?: number
  page_size?: number
}

export interface CreateTodoInput {
  title: string
  description?: string
  status?: Todo['status']
  priority?: Todo['priority']
  tags?: string[]
  due_date?: string | null
  source?: string
  notes?: string
  subtasks?: Subtask[]
  deadline_label?: string
  remind_count?: number
  group_id?: string | null
  summary?: string
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  status?: Todo['status']
  priority?: Todo['priority']
  tags?: string[]
  due_date?: string | null
  source?: string
  notes?: string
  subtasks?: Subtask[]
  deadline_label?: string
  remind_count?: number
  archived?: number
  group_id?: string | null
  summary?: string
}

export interface WeeklyStat {
  week: string
  created: number
  completed: number
  archived: number
}

export interface TodoSummaryItem {
  id: string
  title: string
  updated_at: string
}

export type SmartView = 'all' | 'today' | 'upcoming' | 'overdue'

export type TodoStatus = 'pending' | 'in_progress' | 'done'

export interface SmartCounts {
  today: number
  upcoming: number
  overdue: number
}
