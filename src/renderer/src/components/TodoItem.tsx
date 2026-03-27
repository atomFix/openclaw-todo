import React, { useState } from 'react'
import { Tooltip, Popconfirm, Progress } from 'antd'
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatRelativeDate } from '../utils/relativeDate'
import type { Todo, Subtask } from '../types/todo'

interface Props {
  todo: Todo
  focused?: boolean
  selected?: boolean
  onEdit: (todo: Todo) => void
  onDelete: (todo: Todo) => void
  onStatusChange: (id: string, status: Todo['status']) => void
  onToggleSubtask: (id: string, index: number) => void
  onPromoteSubtask: (todoId: string, index: number) => void
  onViewSummary: (todo: Todo) => void
  onSelectionToggle?: () => void
  onShiftClick?: () => void
}

const priorityColors: Record<Todo['priority'], string> = {
  high: 'var(--semantic-danger)',
  medium: 'var(--semantic-warning)',
  low: 'var(--semantic-success)',
}

const priorityLabels: Record<Todo['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const statusLabels: Record<Todo['status'], string> = {
  pending: '待处理',
  in_progress: '进行中',
  done: '已完成',
}

const TodoItem: React.FC<Props> = ({ todo, focused, selected, onEdit, onDelete, onStatusChange, onToggleSubtask, onPromoteSubtask, onViewSummary, onSelectionToggle, onShiftClick }) => {
  let tags: string[] = []
  try { tags = JSON.parse(todo.tags || '[]') } catch { tags = [] }
  let subtasks: Subtask[] = []
  try { subtasks = JSON.parse(todo.subtasks || '[]') } catch { subtasks = [] }
  const isArchived = todo.archived === 1
  const isDone = todo.status === 'done'
  const [completing, setCompleting] = useState(false)

  const nextStatus = todo.status === 'pending' ? 'in_progress' : todo.status === 'in_progress' ? 'done' : 'pending'

  const isOverdue = todo.due_date && dayjs(todo.due_date).isBefore(dayjs(), 'day') && !isDone

  const subtaskDone = subtasks.filter(s => s.done).length
  const subtaskTotal = subtasks.length
  const subtaskPercent = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0

  const handleStatusToggle = () => {
    if (nextStatus === 'done') {
      setCompleting(true)
      setTimeout(() => setCompleting(false), 300)
    }
    onStatusChange(todo.id, nextStatus)
  }

  return (
    <div
      className={`todo-card${completing ? ' completing' : ''}${focused ? ' todo-card-focused' : ''}${selected ? ' todo-card-selected' : ''}`}
      onClick={(e) => {
        if (e.shiftKey && onShiftClick) {
          e.preventDefault()
          onShiftClick()
          return
        }
        onEdit(todo)
      }}
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        opacity: isArchived ? 0.5 : isDone ? 0.65 : 1,
        background: selected ? 'var(--brand-primary-light)' : isArchived ? 'var(--bg-input)' : 'var(--bg-card)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Selection checkbox */}
      <div
        className="selection-checkbox-wrapper"
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', paddingTop: 2 }}
      >
        <input
          type="checkbox"
          className="todo-checkbox selection-checkbox"
          checked={selected}
          onChange={() => onSelectionToggle?.()}
          style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5 }}
        />
      </div>

      {/* Priority bar */}
      <div
        className={`priority-bar ${todo.priority}`}
        style={{ alignSelf: 'stretch', minHeight: 40 }}
      />

      {/* Checkbox with animation wrapper */}
      <Tooltip title={`切换为: ${statusLabels[nextStatus]}`}>
        <div className={`todo-checkbox-wrapper${isDone ? ' checked' : ''}`}>
          <input
            type="checkbox"
            className="todo-checkbox"
            checked={isDone}
            onClick={e => e.stopPropagation()}
            onChange={handleStatusToggle}
          />
          <div className="todo-checkbox-check">
            <svg viewBox="0 0 20 20" fill="none">
              <path
                d="M5 10.5L8.5 14L15 6"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </Tooltip>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span
            className={`todo-title-text${isDone ? ' done' : ''}`}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isDone ? 'var(--text-quaternary)' : 'var(--text-primary)',
              lineHeight: '22px',
            }}
          >
            {todo.title}
          </span>

          {/* Source tag */}
          {todo.source && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--brand-primary)',
              background: 'var(--brand-primary-light)',
              padding: '1px 8px',
              borderRadius: 6,
              lineHeight: '18px',
            }}>
              {todo.source}
            </span>
          )}

          {/* Archive badge */}
          {isArchived && (
            <span className="archive-badge">已归档</span>
          )}

          {/* Summary badge */}
          {todo.summary && (
            <span
              onClick={e => { e.stopPropagation(); onViewSummary(todo) }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--semantic-purple)',
                background: 'var(--semantic-purple-bg)',
                padding: '1px 8px',
                borderRadius: 6,
                lineHeight: '18px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--semantic-purple-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--semantic-purple-bg)' }}
            >
              <FileTextOutlined style={{ fontSize: 10 }} />
              摘要
            </span>
          )}
        </div>

        {/* Description */}
        {todo.description && (
          <p style={{
            fontSize: 12,
            color: 'var(--text-quaternary)',
            margin: '0 0 4px',
            lineHeight: '18px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 500,
          }}>
            {todo.description}
          </p>
        )}

        {/* Notes - truncated with tooltip */}
        {todo.notes && (
          <Tooltip title={todo.notes.length > 50 ? todo.notes : ''} placement="topLeft">
            <p style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              margin: '0 0 6px',
              lineHeight: '18px',
              padding: '4px 8px',
              background: 'var(--bg-secondary)',
              borderRadius: 6,
              borderLeft: '2px solid var(--border-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 500,
            }}>
              {todo.notes}
            </p>
          </Tooltip>
        )}

        {/* Meta row: tags, deadline, status, priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <span key={tag} onClick={e => e.stopPropagation()} style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '1px 8px',
              borderRadius: 6,
              lineHeight: '18px',
            }}>
              {tag}
            </span>
          ))}

          {todo.due_date && (() => {
            const deadlineText = formatRelativeDate(todo.due_date)
            if (!deadlineText) return null
            return (
              <span onClick={e => e.stopPropagation()} style={{
                fontSize: 11,
                fontWeight: 500,
                color: isOverdue ? 'var(--semantic-danger)' : 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                lineHeight: '18px',
              }}>
                {isOverdue && <ExclamationCircleOutlined style={{ fontSize: 11 }} />}
                {deadlineText}
              </span>
            )
          })()}

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            <div className={`status-dot ${todo.status}`} />
            <span style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 500 }}>
              {statusLabels[todo.status]}
            </span>
            <span style={{
              fontSize: 11,
              color: priorityColors[todo.priority],
              fontWeight: 600,
              marginLeft: 4,
            }}>
              {priorityLabels[todo.priority]}
            </span>
          </div>
        </div>

        {/* Subtasks */}
        {subtaskTotal > 0 && (
          <div
            onClick={e => e.stopPropagation()}
            style={{ marginTop: 10, background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border-secondary)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtaskTotal > 0 ? 6 : 0 }}>
              <Progress
                percent={subtaskPercent}
                size="small"
                style={{ flex: 1, maxWidth: 100 }}
                strokeColor={subtaskPercent === 100 ? 'var(--semantic-success)' : 'var(--brand-primary)'}
                railColor="var(--border-primary)"
                showInfo={false}
              />
              <span style={{
                fontSize: 11,
                color: subtaskPercent === 100 ? 'var(--semantic-success)' : 'var(--text-tertiary)',
                fontWeight: 600,
              }}>
                {subtaskDone}/{subtaskTotal}
              </span>
            </div>
            {subtasks.map((st, idx) => (
              <div
                key={idx}
                className="subtask-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  lineHeight: '20px',
                }}
              >
                <input
                  type="checkbox"
                  className="todo-checkbox"
                  checked={st.done}
                  onChange={() => onToggleSubtask(todo.id, idx)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5 }}
                />
                <span
                  onClick={() => onToggleSubtask(todo.id, idx)}
                  style={{
                    flex: 1,
                    color: st.done ? 'var(--text-quaternary)' : 'var(--text-secondary)',
                    textDecoration: st.done ? 'line-through' : 'none',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {st.text}
                </span>
                {!st.done && (
                  <Tooltip title="提升为独立任务">
                    <button
                      className="subtask-promote-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPromoteSubtask(todo.id, idx)
                      }}
                    >
                      <ArrowUpOutlined style={{ fontSize: 11 }} />
                    </button>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions - only delete since card click opens edit */}
      <div
        className="todo-card-actions"
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          transition: 'opacity 0.15s ease',
        }}
      >
        <Popconfirm
          title="确定删除此任务？"
          onConfirm={() => onDelete(todo)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Tooltip title="删除">
            <button className="action-btn" style={{ width: 32, height: 32 }}>
              <DeleteOutlined style={{ fontSize: 13, color: 'var(--text-quaternary)' }} />
            </button>
          </Tooltip>
        </Popconfirm>
      </div>

      {/* Keyboard hint when focused */}
      {focused && (
        <div className="keyboard-hint">
          <span>E 编辑</span>
          <span>X 完成</span>
          <span>Del 删除</span>
        </div>
      )}
    </div>
  )
}

export default TodoItem
