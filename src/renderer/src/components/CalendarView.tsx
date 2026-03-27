import React, { useMemo } from 'react'
import { Calendar } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { Todo } from '../types/todo'

interface Props {
  todos: Todo[]
  onEdit: (todo: Todo) => void
  onStatusChange: (id: string, status: Todo['status']) => void
}

const priorityColorMap: Record<Todo['priority'], string> = {
  high: 'var(--semantic-danger)',
  medium: 'var(--semantic-warning)',
  low: 'var(--semantic-success)',
}

const CalendarView: React.FC<Props> = ({ todos, onEdit }) => {
  const todosByDate = useMemo(() => {
    const map: Record<string, Todo[]> = {}
    todos.forEach(todo => {
      if (todo.due_date) {
        if (!map[todo.due_date]) map[todo.due_date] = []
        map[todo.due_date].push(todo)
      }
    })
    return map
  }, [todos])

  const cellRender = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD')
    const dayTodos = todosByDate[dateStr]
    if (!dayTodos || dayTodos.length === 0) return null

    return (
      <div className="calendar-cell-content">
        {dayTodos.slice(0, 3).map(todo => (
          <div
            key={todo.id}
            className="calendar-todo-item"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(todo)
            }}
          >
            <span className="calendar-todo-dot" style={{ background: priorityColorMap[todo.priority] }} />
            <span className="calendar-todo-title">{todo.title}</span>
          </div>
        ))}
        {dayTodos.length > 3 && (
          <div className="calendar-todo-more">+{dayTodos.length - 3} 更多</div>
        )}
      </div>
    )
  }

  const headerRender = ({ value, onChange }: { value: Dayjs; onChange: (date: Dayjs) => void }) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {value.format('YYYY年M月')}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="action-btn"
            style={{ width: 32, height: 32 }}
            onClick={() => onChange(value.subtract(1, 'month'))}
          >
            <LeftOutlined style={{ fontSize: 12, color: 'var(--text-tertiary)' }} />
          </button>
          <button
            className="action-btn"
            style={{ width: 44, height: 32 }}
            onClick={() => onChange(dayjs())}
          >
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>今天</span>
          </button>
          <button
            className="action-btn"
            style={{ width: 32, height: 32 }}
            onClick={() => onChange(value.add(1, 'month'))}
          >
            <RightOutlined style={{ fontSize: 12, color: 'var(--text-tertiary)' }} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-primary)',
      boxShadow: '0 1px 3px var(--shadow-card)',
      padding: 16,
      transition: 'background 0.25s ease, border-color 0.25s ease',
    }}>
      <Calendar
        fullscreen={false}
        cellRender={(date, info) => {
          if (info.type === 'date') return cellRender(date)
          return info.originNode
        }}
        headerRender={headerRender}
      />
    </div>
  )
}

export default CalendarView
