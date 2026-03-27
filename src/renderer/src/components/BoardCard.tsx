import React from 'react'
import { Tooltip } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Todo, Subtask } from '../types/todo'
import { formatRelativeDate } from '../utils/relativeDate'

interface Props {
  todo: Todo
  onClick: () => void
  onStatusChange: (id: string, status: Todo['status']) => void
}

const BoardCard: React.FC<Props> = ({ todo, onClick, onStatusChange }) => {
  let tags: string[] = []
  try { tags = JSON.parse(todo.tags || '[]') } catch { tags = [] }

  const isDone = todo.status === 'done'
  const isOverdue = todo.due_date && dayjs(todo.due_date).isBefore(dayjs(), 'day') && !isDone

  const priorityColorMap: Record<Todo['priority'], string> = {
    high: 'var(--semantic-danger)',
    medium: 'var(--semantic-warning)',
    low: 'var(--semantic-success)',
  }

  return (
    <div className="board-card" onClick={onClick}>
      {/* Priority bar */}
      <div
        className={`priority-bar ${todo.priority}`}
        style={{ width: 3, alignSelf: 'stretch', borderRadius: '3px 0 0 3px', flexShrink: 0 }}
      />

      {/* Checkbox */}
      <Tooltip title={isDone ? '标记为待处理' : '标记为已完成'}>
        <input
          type="checkbox"
          className="todo-checkbox"
          checked={isDone}
          onClick={e => e.stopPropagation()}
          onChange={() => {
            onStatusChange(todo.id, isDone ? 'pending' : 'done')
          }}
          style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}
        />
      </Tooltip>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={`board-card-title${isDone ? ' done' : ''}`}>
          {todo.title}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {tags.slice(0, 2).map(tag => (
              <span key={tag} style={{
                fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)',
                padding: '1px 6px', borderRadius: 4, lineHeight: '16px',
              }}>
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Due date */}
        {todo.due_date && (
          <div style={{
            fontSize: 10, marginTop: 6,
            color: isOverdue ? 'var(--semantic-danger)' : 'var(--text-quaternary)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {isOverdue && <ExclamationCircleOutlined style={{ fontSize: 10 }} />}
            {formatRelativeDate(todo.due_date)}
          </div>
        )}
      </div>
    </div>
  )
}

export default BoardCard
