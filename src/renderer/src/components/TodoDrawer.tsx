import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Drawer, DatePicker, Select, Tooltip, Popconfirm, message } from 'antd'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import type { Todo, Subtask, UpdateTodoInput, Group } from '../types/todo'
import dayjs from 'dayjs'

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

const SectionLabel: React.FC<{ children: React.ReactNode; optional?: boolean }> = ({ children, optional }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
    {children}
    {optional && <span style={{ fontWeight: 400, marginLeft: 4 }}>(可选)</span>}
  </div>
)

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

const TodoDrawer: React.FC<Props> = ({
  open, todo, onClose, onUpdate, onDelete, onStatusChange,
  onToggleSubtask, onPromoteSubtask, onViewSummary, sources, groups,
}) => {
  // Local state initialized from todo prop
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

  // Sync from todo prop
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
  }, [todo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlur = useCallback(async (field: string, value: any) => {
    if (!todo) return
    // Check if value actually changed
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
        // Revert on failure
        if (field === 'title') setTitle(todo.title)
        if (field === 'description') setDescription(todo.description || '')
        if (field === 'notes') setNotes(todo.notes || '')
      }
    }
  }, [todo, onUpdate])

  const handleAddSubtask = () => {
    const text = newSubtask.trim()
    if (!text) return
    const newSubtasks = [...subtasks, { text, done: false }]
    setSubtasks(newSubtasks)
    setNewSubtask('')
    if (todo) {
      onUpdate(todo.id, { subtasks: newSubtasks }).catch(() => {
        setSubtasks(subtasks)
      })
    }
  }

  if (!todo) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={500}
      title={null}
      closable
      styles={{
        body: { padding: '24px 24px 24px', overflow: 'auto' },
        header: { display: 'none' },
      }}
      className="todo-drawer"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-quinary)', fontFamily: 'monospace' }}>
            TODO-{todo.id.slice(0, 6)}
          </span>
        </div>
        <button onClick={onClose} className="sidebar-collapse-btn">
          ✕
        </button>
      </div>

      {/* Title */}
      <input
        className="todo-drawer-title-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={() => handleBlur('title', title)}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />

      {/* Status & Priority pills */}
      <div className="todo-drawer-section">
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel>状态</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              {statusOptions.map(opt => {
                const active = status === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatus(opt.value)
                      onStatusChange(todo.id, opt.value)
                    }}
                    style={{
                      flex: 1, height: 32,
                      border: `1.5px solid ${active ? opt.color : 'var(--border-primary)'}`,
                      background: active ? opt.bg : 'var(--bg-card)',
                      borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 12, fontWeight: active ? 600 : 500,
                      color: active ? opt.color : 'var(--text-tertiary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt.dot, opacity: active ? 1 : 0.4 }} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel>优先级</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              {priorityOptions.map(opt => {
                const active = priority === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setPriority(opt.value)
                      handleBlur('priority', opt.value)
                    }}
                    style={{
                      flex: 1, height: 32,
                      border: `1.5px solid ${active ? opt.color : 'var(--border-primary)'}`,
                      background: active ? opt.bg : 'var(--bg-card)',
                      borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 12, fontWeight: active ? 600 : 500,
                      color: active ? opt.color : 'var(--text-tertiary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: opt.color, opacity: active ? 1 : 0.3 }} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-quinary)' }}>
          <ClockCircleOutlined style={{ fontSize: 11 }} />
          {dayjs(todo.created_at).format('YYYY-MM-DD HH:mm')}
        </div>
        {todo.updated_at !== todo.created_at && (
          <span style={{ fontSize: 11, color: 'var(--text-quinary)' }}>
            更新 {dayjs(todo.updated_at).format('MM-DD HH:mm')}
          </span>
        )}
        {todo.source && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--brand-primary)',
            background: 'var(--brand-primary-light)', padding: '1px 8px', borderRadius: 6,
          }}>
            {todo.source}
          </span>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border-secondary)', margin: '0 0 16px' }} />

      {/* Description */}
      <div className="todo-drawer-section">
        <SectionLabel optional>描述</SectionLabel>
        <textarea
          className="todo-drawer-inline-field"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => handleBlur('description', description)}
          placeholder="添加任务描述..."
          rows={2}
        />
      </div>

      {/* Notes */}
      <div className="todo-drawer-section" style={{ marginTop: 16 }}>
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
      <div className="todo-drawer-section" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <SectionLabel>
            子任务
            {subtasks.length > 0 && (
              <span style={{ color: 'var(--text-quinary)', fontWeight: 400, marginLeft: 4 }}>
                {subtasks.filter(s => s.done).length}/{subtasks.length}
              </span>
            )}
          </SectionLabel>
        </div>
        {subtasks.map((st, idx) => (
          <div key={idx} className="subtask-item" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, lineHeight: '20px', marginBottom: 2 }}>
            <input
              type="checkbox" className="todo-checkbox"
              checked={st.done}
              onChange={() => onToggleSubtask(todo.id, idx)}
              style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5 }}
            />
            <span style={{ flex: 1, color: st.done ? 'var(--text-quaternary)' : 'var(--text-secondary)', textDecoration: st.done ? 'line-through' : 'none', fontWeight: 500 }}>
              {st.text}
            </span>
            {!st.done && (
              <Tooltip title="提升为独立任务">
                <button
                  className="subtask-promote-btn"
                  onClick={() => onPromoteSubtask(todo.id, idx)}
                >
                  <ArrowUpOutlined style={{ fontSize: 11 }} />
                </button>
              </Tooltip>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            className="todo-drawer-inline-field"
            style={{ flex: 1, fontSize: 12, padding: '4px 8px', borderRadius: 6 }}
            value={newSubtask}
            onChange={e => setNewSubtask(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask() }}
            placeholder="添加子任务..."
          />
          <button
            onClick={handleAddSubtask}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, border: '1px dashed var(--text-quinary)',
              background: 'transparent', borderRadius: 6, cursor: 'pointer',
              color: 'var(--text-quaternary)', flexShrink: 0,
            }}
          >
            <PlusOutlined style={{ fontSize: 11 }} />
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border-secondary)', margin: '16px 0' }} />

      {/* Due date & Tags */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <SectionLabel optional>截止日期</SectionLabel>
          <DatePicker
            style={{ width: '100%' }}
            value={dueDate}
            onChange={date => {
              setDueDate(date)
              handleBlur('due_date', date)
            }}
            placeholder="选择日期"
          />
        </div>
        <div style={{ flex: 1 }}>
          <SectionLabel optional>标签</SectionLabel>
          <Select
            mode="tags"
            value={tags}
            onChange={newTags => {
              setTags(newTags)
              // Save on change for tags
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
      </div>

      {/* Group */}
      {groups.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <SectionLabel optional>分组</SectionLabel>
          <Select
            value={groupId}
            onChange={newGid => {
              setGroupId(newGid)
              handleBlur('group_id', newGid)
            }}
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

      {/* Summary preview */}
      {todo.summary && (
        <div style={{ marginTop: 16 }}>
          <SectionLabel>摘要</SectionLabel>
          <div style={{
            padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8,
            border: '1px solid var(--border-secondary)', fontSize: 12, color: 'var(--text-tertiary)',
            lineHeight: '18px', maxHeight: 80, overflow: 'hidden', position: 'relative',
          }}>
            {todo.summary.slice(0, 200)}
            {todo.summary.length > 200 && '...'}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(transparent, var(--bg-secondary))' }} />
          </div>
          <button
            onClick={() => onViewSummary(todo)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, marginTop: 6,
              padding: '4px 10px', border: 'none', background: 'var(--semantic-purple-bg)',
              borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
              color: 'var(--semantic-purple)', fontFamily: 'inherit',
            }}
          >
            <FileTextOutlined style={{ fontSize: 11 }} />
            查看摘要
          </button>
        </div>
      )}

      {/* Delete button */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border-secondary)' }}>
        <Popconfirm
          title="确定删除此任务？"
          onConfirm={() => onDelete(todo)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', border: '1px solid var(--semantic-danger)',
            background: 'var(--semantic-danger-bg)', borderRadius: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
            color: 'var(--semantic-danger)', fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}>
            <DeleteOutlined style={{ fontSize: 13 }} />
            删除任务
          </button>
        </Popconfirm>
      </div>
    </Drawer>
  )
}

export default TodoDrawer
