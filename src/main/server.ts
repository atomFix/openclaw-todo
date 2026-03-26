import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import {
  createTodo,
  getById,
  listTodos,
  updateTodo,
  updateTodoStatus,
  updateSubtasks,
  toggleSubtask,
  archiveTodos,
  deleteTodo,
  deleteTodos,
  getStatsSummary,
  getWeeklyStats,
  getOverdueTodos,
  getDistinctSources,
  createGroup,
  listGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  getAllUnarchivedTodoCount,
  promoteSubtask,
  reorderGroups,
  getTodosWithSummary,
  getSmartViewCounts,
  CreateTodoInput,
  UpdateTodoInput,
  Subtask,
  TodoQuery,
  CreateGroupInput,
  UpdateGroupInput,
} from './database'

export function createServer(port: number) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', port, version: '1.0.0' })
  })

  app.get('/api/v1/todos', (req: Request, res: Response) => {
    const query: TodoQuery = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      search: req.query.search as string,
      tag: req.query.tag as string,
      due_before: req.query.due_before as string,
      due_after: req.query.due_after as string,
      source: req.query.source as string,
      archived: req.query.archived as string,
      has_overdue_subtasks: req.query.has_overdue_subtasks as string,
      group_id: req.query.group_id as string,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      page_size: req.query.page_size ? parseInt(req.query.page_size as string) : undefined,
    }
    const result = listTodos(query)
    res.json(result)
  })

  app.get('/api/v1/todos/stats/summary', (_req: Request, res: Response) => {
    res.json(getStatsSummary())
  })

  app.get('/api/v1/todos/stats/weekly', (_req: Request, res: Response) => {
    res.json(getWeeklyStats())
  })

  app.get('/api/v1/todos/stats/overdue', (_req: Request, res: Response) => {
    res.json(getOverdueTodos())
  })

  app.get('/api/v1/todos/sources', (_req: Request, res: Response) => {
    res.json(getDistinctSources())
  })

  app.get('/api/v1/todos/summaries', (req: Request, res: Response) => {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))
    res.json(getTodosWithSummary(limit))
  })

  app.get('/api/v1/todos/smart-counts', (_req: Request, res: Response) => {
    res.json(getSmartViewCounts())
  })

  app.get('/api/v1/todos/:id', (req: Request, res: Response) => {
    const todo = getById(req.params.id)
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }
    res.json(todo)
  })

  app.post('/api/v1/todos', (req: Request, res: Response) => {
    const input: CreateTodoInput = req.body
    if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' })
      return
    }
    if (input.title.length > 500) {
      res.status(400).json({ error: 'Title must be 500 characters or less' })
      return
    }
    if (input.subtasks && !Array.isArray(input.subtasks)) {
      res.status(400).json({ error: 'subtasks must be an array' })
      return
    }
    const todo = createTodo(input)
    res.status(201).json(todo)
  })

  app.put('/api/v1/todos/:id', (req: Request, res: Response) => {
    const existing = getById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }
    const input: UpdateTodoInput = req.body
    if (input.title !== undefined && (typeof input.title !== 'string' || input.title.trim().length === 0)) {
      res.status(400).json({ error: 'Title must be a non-empty string' })
      return
    }
    if (input.subtasks && !Array.isArray(input.subtasks)) {
      res.status(400).json({ error: 'subtasks must be an array' })
      return
    }
    const todo = updateTodo(req.params.id, input)
    res.json(todo)
  })

  app.patch('/api/v1/todos/:id/status', (req: Request, res: Response) => {
    const existing = getById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }
    const { status } = req.body
    const validStatuses = ['pending', 'in_progress', 'done']
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` })
      return
    }
    const todo = updateTodoStatus(req.params.id, status as any)
    res.json(todo)
  })

  app.patch('/api/v1/todos/:id/subtasks', (req: Request, res: Response) => {
    const existing = getById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }
    const subtasks: Subtask[] = req.body.subtasks
    if (!Array.isArray(subtasks)) {
      res.status(400).json({ error: 'subtasks must be an array of { text: string, done: boolean }' })
      return
    }
    const todo = updateSubtasks(req.params.id, subtasks)
    res.json(todo)
  })

  app.patch('/api/v1/todos/:id/subtasks/:index', (req: Request, res: Response) => {
    const existing = getById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }
    const index = parseInt(req.params.index, 10)
    if (isNaN(index)) {
      res.status(400).json({ error: 'index must be a number' })
      return
    }
    const todo = toggleSubtask(req.params.id, index)
    if (!todo) {
      res.status(400).json({ error: 'Invalid subtask index' })
      return
    }
    res.json(todo)
  })

  app.post('/api/v1/todos/archive', (_req: Request, res: Response) => {
    const count = archiveTodos()
    res.json({ archived: count })
  })

  app.delete('/api/v1/todos/:id', (req: Request, res: Response) => {
    const deleted = deleteTodo(req.params.id)
    if (!deleted) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }
    res.json({ success: true })
  })

  app.delete('/api/v1/todos', (req: Request, res: Response) => {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids must be a non-empty array' })
      return
    }
    const count = deleteTodos(ids)
    res.json({ deleted: count })
  })

  // ─── Group routes ───

  app.get('/api/v1/groups', (_req: Request, res: Response) => {
    const groups = listGroups()
    res.json(groups)
  })

  app.post('/api/v1/groups', (req: Request, res: Response) => {
    const input: CreateGroupInput = req.body
    if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
      res.status(400).json({ error: 'Group name is required' })
      return
    }
    if (input.name.length > 100) {
      res.status(400).json({ error: 'Group name must be 100 characters or less' })
      return
    }
    const group = createGroup({ name: input.name.trim(), icon: input.icon, sort_order: input.sort_order })
    res.status(201).json(group)
  })

  app.put('/api/v1/groups/:id', (req: Request, res: Response) => {
    const existing = getGroupById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Group not found' })
      return
    }
    const input: UpdateGroupInput = req.body
    if (input.name !== undefined && (typeof input.name !== 'string' || input.name.trim().length === 0)) {
      res.status(400).json({ error: 'Group name must be a non-empty string' })
      return
    }
    const group = updateGroup(req.params.id, input)
    res.json(group)
  })

  app.delete('/api/v1/groups/:id', (req: Request, res: Response) => {
    const deleted = deleteGroup(req.params.id)
    if (!deleted) {
      res.status(404).json({ error: 'Group not found' })
      return
    }
    res.json({ success: true })
  })

  app.put('/api/v1/groups/reorder', (req: Request, res: Response) => {
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items must be a non-empty array of { id, sort_order }' })
      return
    }
    for (const item of items) {
      if (!item.id || typeof item.sort_order !== 'number') {
        res.status(400).json({ error: 'each item must have id (string) and sort_order (number)' })
        return
      }
    }
    reorderGroups(items)
    res.json({ success: true })
  })

  app.get('/api/v1/groups/stats/all-count', (_req: Request, res: Response) => {
    const count = getAllUnarchivedTodoCount()
    res.json({ count })
  })

  // ─── Promote subtask ───

  app.post('/api/v1/todos/:id/promote-subtask/:index', (req: Request, res: Response) => {
    const existing = getById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Todo not found' })
      return
    }
    const index = parseInt(req.params.index, 10)
    if (isNaN(index)) {
      res.status(400).json({ error: 'index must be a number' })
      return
    }
    const todo = promoteSubtask(req.params.id, index)
    if (!todo) {
      res.status(400).json({ error: 'Invalid subtask index or subtask is already done' })
      return
    }
    res.json(todo)
  })

  app.use((_err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', _err)
    res.status(500).json({ error: 'Internal server error' })
  })

  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`OpenClaw Todo API running at http://127.0.0.1:${port}`)
  })

  return server
}
