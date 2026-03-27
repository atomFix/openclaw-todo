import React, { useState, useEffect, useCallback } from 'react'
import { Drawer, DatePicker, Select, Tooltip, Popconfirm } from 'antd'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  FileTextOutlined,
  CloseOutlined,
  CalendarOutlined,
  TagOutlined,
  FolderOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Todo, Subtask, UpdateTodoInput, Group } from '../types/todo'
import dayjs from 'dayjs'
import { formatRelativeDate } from '../utils/relativeDate'

const priorityOptions: { value: Todo['priority']; label: string; color: string; bg: string }[] = [
  { value: 'high', label: '高', color: 'var(--semantic-danger)', bg: 'var(--semantic-danger-bg)' },
  { value: 'medium', label: '中', color: 'var(--semantic-warning)', bg: 'var(--semantic-warning-bg)' },
  { value: 'low', label: '低', color: 'var(--semantic-success)', bg: 'var(--semantic-success-bg)' },
]

const statusOptions: { value: Todo['status']; label: string; color: string; bg: string; dot: string }[] = [
  { value: 'pending', label: '待处理', color: 'var(--text-tertiary)', bg: 'var(--bg-secondary)', dot: 'var(--text-quaternary)' },
  { value: 'in_progress', label: '进行中', color: 'var(--brand-primary)', bg: 'var(--brand-primary-light)', dot: 'var(--brand-primary)' },
  { value: 'done', label: '已完成', color: 'var(--semantic-success)', bg: 'var(--semantic-success-bg)', dot: 'var(--semantic-success)' },
]

const priorityColorMap: Record<string, string> = {
  high: 'var(--semantic-danger)',
  medium: 'var(--semantic-warning)',
  low: 'var(--semantic-success)',
}

interface Props {
  open: boolean
  todo: Todo | null
  onClose: () => void
  onUpdate: (id: string, data: UpdateTodoInput) => Promise<void>
  onDelete: (todo: Todo) => void
  onStatusChange: (id: string, status: Todo['status']) => void
  onToggleSubtask: (id: string, index: number) => void
  onPromoteSubtask: (todoId: string, index: number) => void
  onViewSummary: (todo: Todo) => void
  sources: string[]
  groups: Group[]
}

const SectionLabel: React.FC<{ children: React.ReactNode; optional?: boolean }> = ({ children, optional }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
    {children}
    {optional && <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: 4 }}>(可选)</span>}
  </div>
)

const MetaChip: React.FC<{ icon: React.ReactNode; children: React.ReactNode; color?: string }> = ({ icon, children, color }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11,
    color: color || 'var(--text-quinary)', lineHeight: '16px',
  }}>
    {icon}
    {children}
  </div>
)

const TodoDrawer: React.FC<Props> = ({
  open, todo, onClose, onUpdate, onDelete, onStatusChange,
  onToggleSubtask, onPromoteSubtask, onViewSummary, sources, groups,
}) => {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<Todo['status']>('pending')
  const [priority, setPriority] = useState<Todo['priority']>('medium')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [groupId, setGroupId] = useState<string | undefined>(undefined)
  const [newSubtask, setNewSubtask] = useState('')

  useEffect(() => {
    if (todo) {
      setTitle(todo.title)
      setStatus(todo.status)
      setPriority(todo.priority)
      setDescription(todo.description || '')
      setNotes(todo.notes || '')
      try { setSubtasks(JSON.parse(todo.subtasks || '[]')) } catch { setSubtasks([]) }
      setDueDate(todo.due_date ? dayjs(todo.due_date) : null)
      try { setTags(JSON.parse(todo.tags || '[]')) } catch { setTags([]) }
      setGroupId(todo.group_id || undefined)
      setNewSubtask('')
    }
  }, [todo?.id])

  const handleBlur = useCallback(async (field: string, value: any) => {
    if (!todo) return
    let changed = false
    let updateData: UpdateTodoInput = {}
    switch (field) {
      case 'title':
        if (value !== todo.title && value.trim()) { updateData.title = value.trim(); changed = true }
        break
      case 'description':
        if (value !== (todo.description || '')) { updateData.description = value; changed = true }
        break
      case 'notes':
        if (value !== (todo.notes || '')) { updateData.notes = value; changed = true }
        break
      case 'due_date':
        const dateStr = value ? dayjs(value).format('YYYY-MM-DD') : null
        if (dateStr !== (todo.due_date || null)) { updateData.due_date = dateStr; changed = true }
        break
      case 'tags':
        const tagsStr = JSON.stringify(value)
        if (tagsStr !== (todo.tags || '[]')) { updateData.tags = value; changed = true }
        break
      case 'group_id':
        if (value !== (todo.group_id || undefined)) { updateData.group_id = value || null; changed = true }
        break
      case 'priority':
        if (value !== todo.priority) { updateData.priority = value; changed = true }
        break
    }
    if (changed) {
      try {
        await onUpdate(todo.id, updateData)
      } catch {
        if (field === 'title') setTitle(todo.title)
        if (field === 'description') setDescription(todo.description || '')
        if (field === 'notes') setNotes(todo.notes || '')
      }
    }
  }, [todo, onUpdate])

  const handleAddSubtask = () => {
    const text = newSubtask.trim()
    if (!text) return
    const next = [...subtasks, { text, done: false }]
    setSubtasks(next)
    setNewSubtask('')
    if (todo) onUpdate(todo.id, { subtasks: next }).catch(() => setSubtasks(subtasks))
  }

  if (!todo) return null

  const isDone = todo.status === 'done'
  const isOverdue = todo.due_date && dayjs(todo.due_date).isBefore(dayjs(), 'day') && !isDone
  const subtaskDone = subtasks.filter(s => s.done).length

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={520}
      title={null}
      closable={false}
      styles={{
        body: { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        header: { display: 'none' },
        wrapper: { boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' },
      }}
      className="todo-drawer"
    >
      {/* Sticky header */}
      <div className="drawer-header">
        <div className="drawer-header-left">
          <div className="drawer-priority-dot" style={{ background: priorityColorMap[todo.priority] }} />
          <span className="drawer-id">TODO-{todo.id.slice(0, 6)}</span>
          <span className="drawer-status-dot" style={{ background: status === 'in_progress' ? 'var(--brand-primary)' : status === 'done' ? 'var(--semantic-success)' : 'var(--text-quaternary)' }} />
        </div>
        <button className="drawer-close-btn" onClick={onClose}>
          <CloseOutlined style={{ fontSize: 13 }} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="drawer-body">
        {/* Title */}
        <input
          className="todo-drawer-title-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => handleBlur('title', title)}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        />

        {/* Status & Priority row */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel>状态</SectionLabel>
            <div style={{ display: 'flex', gap: 4 }}>
              {statusOptions.map(opt => {
                const active = status === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => { setStatus(opt.value); onStatusChange(todo.id, opt.value) }}
                    className="drawer-pill"
                    data-active={active ? 'true' : undefined}
                    style={{
                      color: active ? opt.color : 'var(--text-quaternary)',
                      background: active ? opt.bg : 'transparent',
                    }}
                  >
                    <span className="drawer-pill-dot" style={{ background: active ? opt.dot : 'transparent' }} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel>优先级</SectionLabel>
            <div style={{ display: 'flex', gap: 4 }}>
              {priorityOptions.map(opt => {
                const active = priority === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => { setPriority(opt.value); handleBlur('priority', opt.value) }}
                    className="drawer-pill"
                    data-active={active ? 'true' : undefined}
                    style={{
                      color: active ? opt.color : 'var(--text-quaternary)',
                      background: active ? opt.bg : 'transparent',
                    }}
                  >
                    <span className="drawer-pill-dot" style={{ background: active ? opt.color : 'transparent' }} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Meta chips */}
        <div className="drawer-meta-row">
          <MetaChip icon={<ClockCircleOutlined style={{ fontSize: 11 }} />}>
            {dayjs(todo.created_at).format('YYYY-MM-DD HH:mm')}
          </MetaChip>
          {todo.updated_at !== todo.created_at && (
            <MetaChip icon={null}>
              更新 {dayjs(todo.updated_at).format('MM-DD HH:mm')}
            </MetaChip>
          )}
          {todo.source && (
            <span className="drawer-source-chip">{todo.source}</span>
          )}
          {todo.due_date && (
            <span className="drawer-due-chip" style={{ color: isOverdue ? 'var(--semantic-danger)' : undefined }}>
              <CalendarOutlined style={{ fontSize: 10 }} />
              {formatRelativeDate(todo.due_date)}
              {isOverdue && <ExclamationCircleOutlined style={{ fontSize: 10, marginLeft: 2 }} />}
            </span>
          )}
          {todo.group_id && (
            <span className="drawer-group-chip">
              <FolderOutlined style={{ fontSize: 10 }} />
              {groups.find(g => g.id === todo.group_id)?.name}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="drawer-divider" />

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel optional>描述</SectionLabel>
          <textarea
            className="todo-drawer-inline-field"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => handleBlur('description', description)}
            placeholder="添加任务描述..."
            rows={3}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel optional>备注</SectionLabel>
          <textarea
            className="todo-drawer-inline-field"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => handleBlur('notes', notes)}
            placeholder="添加备注信息..."
            rows={2}
          />
        </div>

        {/* Subtasks */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <SectionLabel>
              子任务
              {subtasks.length > 0 && (
                <span style={{ color: 'var(--brand-primary)', fontWeight: 700, marginLeft: 6 }}>
                  {subtaskDone}/{subtasks.length}
                </span>
              )}
            </SectionLabel>
          </div>

          {subtasks.length > 0 && (
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 10,
              border: '1px solid var(--border-secondary)', overflow: 'hidden',
              marginBottom: subtasks.length > 0 ? 6 : 0,
            }}>
              {subtasks.map((st, idx) => (
                <div key={idx} className="subtask-item" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12, lineHeight: '20px',
                  borderBottom: idx < subtasks.length - 1 ? '1px solid var(--border-secondary)' : 'none',
                  padding: '5px 10px',
                }}>
                  <input
                    type="checkbox" className="todo-checkbox"
                    checked={st.done}
                    onChange={() => onToggleSubtask(todo.id, idx)}
                    style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5 }}
                  />
                  <span style={{
                    flex: 1, color: st.done ? 'var(--text-quaternary)' : 'var(--text-secondary)',
                    textDecoration: st.done ? 'line-through' : 'none', fontWeight: 500,
                  }}>
                    {st.text}
                  </span>
                  {!st.done && (
                    <Tooltip title="提升为独立任务">
                      <button className="subtask-promote-btn" onClick={() => onPromoteSubtask(todo.id, idx)}>
                        <ArrowUpOutlined style={{ fontSize: 11 }} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="todo-drawer-inline-field"
              style={{ flex: 1, fontSize: 12, padding: '5px 10px', borderRadius: 8 }}
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask() }}
              placeholder="添加子任务..."
            />
            <button className="drawer-add-subtask-btn" onClick={handleAddSubtask}>
              <PlusOutlined style={{ fontSize: 11 }} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="drawer-divider" />

        {/* Tags & Due date */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel optional>
              <TagOutlined style={{ fontSize: 10, marginRight: 4 }} />标签
            </SectionLabel>
            <Select
              mode="tags"
              value={tags}
              onChange={newTags => {
                setTags(newTags)
                const tagsStr = JSON.stringify(newTags)
                if (tagsStr !== (todo.tags || '[]')) {
                  onUpdate(todo.id, { tags: newTags }).catch(() => {
                    try { setTags(JSON.parse(todo.tags || '[]')) } catch { setTags([]) }
                  })
                }
              }}
              placeholder="输入后回车"
              tokenSeparators={[',']}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel optional>
              <CalendarOutlined style={{ fontSize: 10, marginRight: 4 }} />截止日期
            </SectionLabel>
            <DatePicker
              style={{ width: '100%' }}
              value={dueDate}
              onChange={date => { setDueDate(date); handleBlur('due_date', date) }}
              placeholder="选择日期"
            />
          </div>
        </div>

        {/* Group */}
        {groups.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel optional>分组</SectionLabel>
            <Select
              value={groupId}
              onChange={newGid => { setGroupId(newGid); handleBlur('group_id', newGid) }}
              placeholder="选择分组"
              allowClear
              style={{ width: '100%' }}
            >
              {groups.map(g => (
                <Select.Option key={g.id} value={g.id}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{g.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-quinary)' }}>{g.todo_count ?? 0}</span>
                  </span>
                </Select.Option>
              ))}
            </Select>
          </div>
        )}

        {/* Summary */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel optional>摘要</SectionLabel>
          {todo.summary ? (
            <>
              <div className="drawer-summary-preview markdown-preview">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {todo.summary.length > 300 ? todo.summary.slice(0, 300) + '...' : todo.summary}
                </Markdown>
                <div className="drawer-summary-fade" />
              </div>
              <button className="drawer-summary-btn" onClick={() => onViewSummary(todo)}>
                <FileTextOutlined style={{ fontSize: 11 }} />
                编辑摘要
              </button>
            </>
          ) : (
            <button className="drawer-summary-btn" onClick={() => onViewSummary(todo)}>
              <PlusOutlined style={{ fontSize: 11 }} />
              添加摘要
            </button>
          )}
        </div>

        {/* Spacer pushes actions to bottom */}
        <div style={{ flex: 1, minHeight: 24 }} />
      </div>

      {/* Sticky footer */}
      <div className="drawer-footer">
        <Popconfirm
          title="确定删除此任务？此操作不可撤销"
          onConfirm={() => onDelete(todo)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <button className="drawer-delete-btn">
            <DeleteOutlined style={{ fontSize: 12 }} />
            删除任务
          </button>
        </Popconfirm>
      </div>
    </Drawer>
  )
}

export default TodoDrawer
