import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import dayjs from 'dayjs'

export interface Subtask {
  text: string
  done: boolean
}

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

export interface PromoteSubtaskInput {
  notes?: string
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

export interface CreateTodoInput {
  title: string
  description?: string
  status?: 'pending' | 'in_progress' | 'done'
  priority?: 'low' | 'medium' | 'high'
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
  status?: 'pending' | 'in_progress' | 'done'
  priority?: 'low' | 'medium' | 'high'
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

let db: Database.Database

function generateTodoId(): string {
  const today = dayjs().format('YYYYMMDD')
  const prefix = `T${today}`
  const row = db
    .prepare("SELECT id FROM todos WHERE id LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`${prefix}%`) as { id: string } | undefined

  let seq = 1
  if (row) {
    const numStr = row.id.slice(prefix.length)
    seq = parseInt(numStr, 10) + 1
  }

  return `${prefix}${String(seq).padStart(3, '0')}`
}

function computeDeadlineLabel(dueDate: string | null): string {
  if (!dueDate) return '无截止日期'
  const today = dayjs().startOf('day')
  const due = dayjs(dueDate).startOf('day')
  const diffDays = due.diff(today, 'day')

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === -1) return '昨天'
  if (diffDays > 1 && diffDays <= 6) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${due.format('M月D日')} ${weekdays[due.day()]}`
  }
  return due.format('M月D日')
}

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'openclaw-todo.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Step 1: Create tables with base schema (IF NOT EXISTS, safe for existing DBs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL CHECK(length(name) <= 100),
      icon TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_groups_sort_order ON groups(sort_order);

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(title) <= 500),
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'done')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      tags TEXT DEFAULT '[]',
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
    CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
  `)

  // Step 2: Migrate - add new columns for existing databases
  const columns = db.prepare("PRAGMA table_info(todos)").all() as { name: string }[]
  const columnNames = columns.map(c => c.name)

  const migrations: Record<string, string> = {
    source: "ALTER TABLE todos ADD COLUMN source TEXT DEFAULT ''",
    notes: "ALTER TABLE todos ADD COLUMN notes TEXT DEFAULT ''",
    subtasks: "ALTER TABLE todos ADD COLUMN subtasks TEXT DEFAULT '[]'",
    deadline_label: "ALTER TABLE todos ADD COLUMN deadline_label TEXT DEFAULT '无截止日期'",
    remind_count: "ALTER TABLE todos ADD COLUMN remind_count INTEGER DEFAULT 0",
    archived: "ALTER TABLE todos ADD COLUMN archived INTEGER DEFAULT 0",
    group_id: "ALTER TABLE todos ADD COLUMN group_id TEXT DEFAULT NULL",
    summary: "ALTER TABLE todos ADD COLUMN summary TEXT DEFAULT ''",
  }

  for (const [col, sql] of Object.entries(migrations)) {
    if (!columnNames.includes(col)) {
      db.exec(sql)
    }
  }

  // Step 3: Create indexes for new columns (after migration ensures they exist)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_todos_source ON todos(source);
    CREATE INDEX IF NOT EXISTS idx_todos_archived ON todos(archived);
    CREATE INDEX IF NOT EXISTS idx_todos_group_id ON todos(group_id);
  `)

  return db
}

export function getDatabase(): Database.Database {
  return db
}

export function createTodo(input: CreateTodoInput): Todo {
  const id = generateTodoId()
  const now = new Date().toISOString()
  const tags = JSON.stringify(input.tags ?? [])
  const status = input.status ?? 'pending'
  const priority = input.priority ?? 'medium'
  const source = input.source ?? ''
  const notes = input.notes ?? ''
  const subtasks = JSON.stringify(input.subtasks ?? [])
  const deadlineLabel = input.deadline_label ?? computeDeadlineLabel(input.due_date ?? null)
  const remindCount = input.remind_count ?? 0

  const groupId = input.group_id ?? null
  const summary = input.summary ?? ''

  db.prepare(`
    INSERT INTO todos (id, title, description, status, priority, tags, due_date, created_at, updated_at, source, notes, subtasks, deadline_label, remind_count, archived, group_id, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, input.title, input.description ?? '', status, priority, tags, input.due_date ?? null, now, now, source, notes, subtasks, deadlineLabel, remindCount, groupId, summary)

  return getById(id)!
}

export function getById(id: string): Todo | undefined {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined
  if (todo) {
    todo.deadline_label = computeDeadlineLabel(todo.due_date)
  }
  return todo
}

export function listTodos(query: TodoQuery): { data: Todo[]; total: number; page: number; page_size: number } {
  const conditions: string[] = []
  const params: any[] = []

  if (query.status) {
    conditions.push('status = ?')
    params.push(query.status)
  }
  if (query.priority) {
    conditions.push('priority = ?')
    params.push(query.priority)
  }
  if (query.tag) {
    const escapedTag = query.tag.replace(/"/g, '\\"')
    conditions.push('tags LIKE ?')
    params.push(`%"${escapedTag}"%`)
  }
  if (query.due_before) {
    conditions.push('due_date <= ?')
    params.push(query.due_before)
  }
  if (query.due_after) {
    conditions.push('due_date >= ?')
    params.push(query.due_after)
  }
  if (query.search) {
    conditions.push('(title LIKE ? OR description LIKE ? OR notes LIKE ?)')
    params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`)
  }
  if (query.source) {
    conditions.push('source = ?')
    params.push(query.source)
  }
  if (query.group_id !== undefined && query.group_id !== '') {
    conditions.push('group_id = ?')
    params.push(query.group_id)
  }
  if (query.archived !== undefined && query.archived !== '') {
    conditions.push('archived = ?')
    params.push(Number(query.archived))
  }
  if (query.has_overdue_subtasks === '1') {
    const today = dayjs().format('YYYY-MM-DD')
    conditions.push(`(due_date < ? AND status != 'done' AND subtasks != '[]' AND subtasks NOT NULL)`)
    params.push(today)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const allowedSortColumns = ['created_at', 'updated_at', 'due_date', 'priority', 'status', 'title']
  const sortBy = allowedSortColumns.includes(query.sort_by ?? '') ? query.sort_by! : 'created_at'
  const sortOrder = (query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC')

  // Priority needs custom sort order: high(3) > medium(2) > low(1)
  const orderBy = sortBy === 'priority'
    ? `CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 END ${sortOrder}`
    : `${sortBy} ${sortOrder}`

  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.page_size ?? 20))

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM todos ${where}`).get(...params) as { count: number }
  const total = countRow.count

  const offset = (page - 1) * pageSize
  const data = db.prepare(`SELECT * FROM todos ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset) as Todo[]

  // Recompute deadline labels dynamically based on current date
  data.forEach(todo => {
    todo.deadline_label = computeDeadlineLabel(todo.due_date)
  })

  return { data, total, page, page_size: pageSize }
}

export function updateTodo(id: string, input: UpdateTodoInput): Todo | undefined {
  const existing = getById(id)
  if (!existing) return undefined

  const fields: string[] = []
  const params: any[] = []

  if (input.title !== undefined) {
    fields.push('title = ?')
    params.push(input.title)
  }
  if (input.description !== undefined) {
    fields.push('description = ?')
    params.push(input.description)
  }
  if (input.status !== undefined) {
    fields.push('status = ?')
    params.push(input.status)
    if (input.status === 'done') {
      fields.push('completed_at = ?')
      params.push(new Date().toISOString())
    } else {
      fields.push('completed_at = ?')
      params.push(null)
    }
  }
  if (input.priority !== undefined) {
    fields.push('priority = ?')
    params.push(input.priority)
  }
  if (input.tags !== undefined) {
    fields.push('tags = ?')
    params.push(JSON.stringify(input.tags))
  }
  if (input.due_date !== undefined) {
    fields.push('due_date = ?')
    params.push(input.due_date)
  }
  if (input.source !== undefined) {
    fields.push('source = ?')
    params.push(input.source)
  }
  if (input.notes !== undefined) {
    fields.push('notes = ?')
    params.push(input.notes)
  }
  if (input.subtasks !== undefined) {
    fields.push('subtasks = ?')
    params.push(JSON.stringify(input.subtasks))
  }
  if (input.deadline_label !== undefined) {
    fields.push('deadline_label = ?')
    params.push(input.deadline_label)
  }
  if (input.remind_count !== undefined) {
    fields.push('remind_count = ?')
    params.push(input.remind_count)
  }
  if (input.archived !== undefined) {
    fields.push('archived = ?')
    params.push(input.archived)
  }
  if (input.group_id !== undefined) {
    fields.push('group_id = ?')
    params.push(input.group_id)
  }
  if (input.summary !== undefined) {
    fields.push('summary = ?')
    params.push(input.summary)
  }

  if (fields.length === 0) return existing

  fields.push("updated_at = datetime('now')")
  params.push(id)

  db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...params)

  return getById(id)
}

export function updateTodoStatus(id: string, status: 'pending' | 'in_progress' | 'done'): Todo | undefined {
  return updateTodo(id, { status })
}

export function updateSubtasks(id: string, subtasks: Subtask[]): Todo | undefined {
  return updateTodo(id, { subtasks })
}

export function toggleSubtask(id: string, index: number): Todo | undefined {
  const existing = getById(id)
  if (!existing) return undefined

  const subtasks: Subtask[] = JSON.parse(existing.subtasks || '[]')
  if (index < 0 || index >= subtasks.length) return undefined

  subtasks[index].done = !subtasks[index].done
  return updateTodo(id, { subtasks })
}

export function archiveTodos(): number {
  const result = db.prepare("UPDATE todos SET archived = 1, updated_at = datetime('now') WHERE status = 'done' AND archived = 0").run()
  return result.changes
}

export function deleteTodo(id: string): boolean {
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id)
  return result.changes > 0
}

export function deleteTodos(ids: string[]): number {
  const placeholders = ids.map(() => '?').join(', ')
  const result = db.prepare(`DELETE FROM todos WHERE id IN (${placeholders})`).run(...ids)
  return result.changes
}

export function getStatsSummary(): TodoStats {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived
    FROM todos
  `).get() as any

  return {
    total: row.total ?? 0,
    pending: row.pending ?? 0,
    in_progress: row.in_progress ?? 0,
    done: row.done ?? 0,
    archived: row.archived ?? 0,
  }
}

export function getWeeklyStats(): { week: string; created: number; completed: number; archived: number }[] {
  const rows = db.prepare(`
    WITH weekly AS (
      SELECT
        strftime('%Y-W%W', created_at) as week,
        COUNT(*) as created,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived
      FROM todos
      GROUP BY week
      ORDER BY week DESC
      LIMIT 12
    )
    SELECT * FROM weekly ORDER BY week ASC
  `).all() as { week: string; created: number; completed: number; archived: number }[]

  return rows
}

export function getOverdueTodos(): Todo[] {
  const today = new Date().toISOString().split('T')[0]
  return db.prepare(`
    SELECT * FROM todos
    WHERE due_date < ? AND status != 'done'
    ORDER BY due_date ASC
  `).all(today) as Todo[]
}

export function getDistinctSources(): string[] {
  const rows = db.prepare("SELECT DISTINCT source FROM todos WHERE source != '' ORDER BY source").all() as { source: string }[]
  return rows.map(r => r.source)
}

// ─── Group CRUD ───

function generateGroupId(): string {
  const today = dayjs().format('YYYYMMDD')
  const prefix = `G${today}`
  const row = db
    .prepare("SELECT id FROM groups WHERE id LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`${prefix}%`) as { id: string } | undefined

  let seq = 1
  if (row) {
    const numStr = row.id.slice(prefix.length)
    seq = parseInt(numStr, 10) + 1
  }

  return `${prefix}${String(seq).padStart(3, '0')}`
}

export function createGroup(input: CreateGroupInput): Group {
  const id = generateGroupId()
  db.prepare(`
    INSERT INTO groups (id, name, icon, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(id, input.name, input.icon ?? '', input.sort_order ?? 0)
  return getGroupById(id)!
}

export function getGroupById(id: string): Group | undefined {
  return db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as Group | undefined
}

export function listGroups(): Group[] {
  return db.prepare(`
    SELECT g.*, COUNT(t.id) as todo_count
    FROM groups g
    LEFT JOIN todos t ON t.group_id = g.id AND t.archived = 0
    GROUP BY g.id
    ORDER BY g.sort_order ASC, g.created_at ASC
  `).all() as Group[]
}

export function updateGroup(id: string, input: UpdateGroupInput): Group | undefined {
  const existing = getGroupById(id)
  if (!existing) return undefined

  const fields: string[] = []
  const params: any[] = []

  if (input.name !== undefined) {
    fields.push('name = ?')
    params.push(input.name)
  }
  if (input.icon !== undefined) {
    fields.push('icon = ?')
    params.push(input.icon)
  }
  if (input.sort_order !== undefined) {
    fields.push('sort_order = ?')
    params.push(input.sort_order)
  }

  if (fields.length === 0) return existing

  params.push(id)
  db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`).run(...params)

  return getGroupById(id)
}

export function deleteGroup(id: string): boolean {
  const existing = getGroupById(id)
  if (!existing) return false

  // Set group_id to NULL for all todos in this group
  db.prepare('UPDATE todos SET group_id = NULL WHERE group_id = ?').run(id)

  const result = db.prepare('DELETE FROM groups WHERE id = ?').run(id)
  return result.changes > 0
}

export function reorderGroups(items: { id: string; sort_order: number }[]): void {
  const update = db.prepare('UPDATE groups SET sort_order = ? WHERE id = ?')
  const transaction = db.transaction((entries: { id: string; sort_order: number }[]) => {
    for (const entry of entries) {
      update.run(entry.sort_order, entry.id)
    }
  })
  transaction(items)
}

export function getGroupTodoCount(id: string): number {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM todos WHERE group_id = ? AND archived = 0'
  ).get(id) as { count: number }
  return row.count
}

export function getAllUnarchivedTodoCount(): number {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM todos WHERE archived = 0'
  ).get() as { count: number }
  return row.count
}

// ─── Promote Subtask ───

export function promoteSubtask(todoId: string, index: number): Todo | undefined {
  const existing = getById(todoId)
  if (!existing) return undefined

  const subtasks: Subtask[] = JSON.parse(existing.subtasks || '[]')
  if (index < 0 || index >= subtasks.length) return undefined

  const subtask = subtasks[index]
  if (subtask.done) return undefined

  // Remove the subtask from parent
  subtasks.splice(index, 1)
  updateTodo(todoId, { subtasks })

  // Create new todo from subtask, inheriting parent's attributes
  const newTodo = createTodo({
    title: subtask.text,
    status: 'pending',
    priority: existing.priority,
    source: existing.source,
    tags: JSON.parse(existing.tags || '[]'),
    notes: `从 ${existing.id} 的子任务转化`,
    group_id: existing.group_id,
    subtasks: [],
  })

  return newTodo
}

export function getTodosWithSummary(limit: number = 20): { id: string; title: string; updated_at: string }[] {
  return db.prepare(`
    SELECT id, title, updated_at
    FROM todos
    WHERE summary != '' AND summary IS NOT NULL AND archived = 0
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(limit) as { id: string; title: string; updated_at: string }[]
}

export function getSmartViewCounts(): { today: number; upcoming: number; overdue: number } {
  const today = dayjs().format('YYYY-MM-DD')
  const weekLater = dayjs().add(7, 'day').format('YYYY-MM-DD')

  const todayRow = db.prepare(`
    SELECT COUNT(*) as count FROM todos
    WHERE due_date = ? AND status != 'done' AND archived = 0
  `).get(today) as { count: number }

  const upcomingRow = db.prepare(`
    SELECT COUNT(*) as count FROM todos
    WHERE due_date > ? AND due_date <= ? AND status != 'done' AND archived = 0
  `).get(today, weekLater) as { count: number }

  const overdueRow = db.prepare(`
    SELECT COUNT(*) as count FROM todos
    WHERE due_date < ? AND status != 'done' AND archived = 0
  `).get(today) as { count: number }

  return {
    today: todayRow.count,
    upcoming: upcomingRow.count,
    overdue: overdueRow.count,
  }
}
