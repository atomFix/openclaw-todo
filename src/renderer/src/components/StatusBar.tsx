import React from 'react'
import type { Todo, TodoStatus } from '../types/todo'

interface Props {
  todos: Todo[]
  total: number
  onFilterStatus?: (status: TodoStatus | null) => void
  activeStatusFilter?: TodoStatus | null
}

const StatItem: React.FC<{
  label: string
  value: number
  color: string
  dotColor: string
  clickable?: boolean
  active?: boolean
  onClick?: () => void
}> = ({ label, value, color, dotColor, clickable, active, onClick }) => (
  <div
    onClick={clickable ? onClick : undefined}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: clickable ? '4px 8px' : undefined,
      borderRadius: clickable ? 8 : undefined,
      cursor: clickable ? 'pointer' : 'default',
      background: active ? 'var(--bg-active)' : undefined,
      transition: clickable ? 'background 0.15s ease' : undefined,
    }}
    onMouseEnter={e => {
      if (clickable && !active) e.currentTarget.style.background = 'var(--bg-hover)'
    }}
    onMouseLeave={e => {
      if (clickable && !active) e.currentTarget.style.background = 'transparent'
    }}
  >
    <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
    <span style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
  </div>
)

const StatusBar: React.FC<Props> = ({ todos, total, onFilterStatus, activeStatusFilter }) => {
  const pending = todos.filter(t => t.status === 'pending').length
  const inProgress = todos.filter(t => t.status === 'in_progress').length
  const done = todos.filter(t => t.status === 'done').length
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div style={{
      marginTop: 24,
      padding: '16px 20px',
      background: 'var(--bg-card)',
      borderRadius: 14,
      border: '1px solid var(--border-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      transition: 'background 0.25s ease, border-color 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <StatItem label="总计" value={total} color="var(--text-primary)" dotColor="var(--text-quinary)" />
        <StatItem
          label="待处理"
          value={pending}
          color="var(--text-tertiary)"
          dotColor="var(--text-quaternary)"
          clickable={!!onFilterStatus}
          active={activeStatusFilter === 'pending'}
          onClick={() => onFilterStatus?.(activeStatusFilter === 'pending' ? null : 'pending')}
        />
        <StatItem
          label="进行中"
          value={inProgress}
          color="var(--brand-primary)"
          dotColor="var(--brand-primary)"
          clickable={!!onFilterStatus}
          active={activeStatusFilter === 'in_progress'}
          onClick={() => onFilterStatus?.(activeStatusFilter === 'in_progress' ? null : 'in_progress')}
        />
        <StatItem
          label="已完成"
          value={done}
          color="var(--semantic-success)"
          dotColor="var(--semantic-success)"
          clickable={!!onFilterStatus}
          active={activeStatusFilter === 'done'}
          onClick={() => onFilterStatus?.(activeStatusFilter === 'done' ? null : 'done')}
        />
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 100, height: 4, background: 'var(--bg-tertiary)',
            borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              width: `${completionRate}%`, height: '100%',
              background: completionRate === 100 ? 'var(--semantic-success)' : 'var(--brand-primary)',
              borderRadius: 2, transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
            {completionRate}%
          </span>
        </div>
      )}
    </div>
  )
}

export default StatusBar
