import React from 'react'
import type { Todo, Subtask } from '../types/todo'
import BoardCard from './BoardCard'

interface Props {
  todos: Todo[]
  onEdit: (todo: Todo) => void
  onStatusChange: (id: string, status: Todo['status']) => void
  onDelete: (todo: Todo) => void
  onToggleSubtask: (id: string, index: number) => void
  onPromoteSubtask: (todoId: string, index: number) => void
  onViewSummary: (todo: Todo) => void
}

const columns: { key: Todo['status']; label: string; color: string; dot: string }[] = [
  { key: 'pending', label: '待处理', color: 'var(--text-tertiary)', dot: 'var(--text-quaternary)' },
  { key: 'in_progress', label: '进行中', color: 'var(--brand-primary)', dot: 'var(--brand-primary)' },
  { key: 'done', label: '已完成', color: 'var(--semantic-success)', dot: 'var(--semantic-success)' },
]

const BoardView: React.FC<Props> = ({
  todos, onEdit, onStatusChange, onDelete, onToggleSubtask, onPromoteSubtask, onViewSummary,
}) => {
  const columnData = columns.map(col => ({
    ...col,
    items: todos.filter(t => t.status === col.key),
  }))

  return (
    <div className="board-container">
      {columnData.map(col => (
        <div key={col.key} className="board-column">
          <div className="board-column-header">
            <span className="board-column-dot" style={{ background: col.dot }} />
            <span className="board-column-label">{col.label}</span>
            <span className="board-column-count">{col.items.length}</span>
          </div>
          <div className="board-column-body">
            {col.items.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '24px 0',
                fontSize: 12, color: 'var(--text-quinary)',
              }}>
                暂无任务
              </div>
            )}
            {col.items.map(todo => (
              <BoardCard
                key={todo.id}
                todo={todo}
                onClick={() => onEdit(todo)}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default BoardView
