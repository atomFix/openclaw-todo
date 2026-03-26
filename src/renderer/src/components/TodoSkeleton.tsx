import React from 'react'

const widths = [65, 50, 75]

const TodoSkeleton: React.FC = () => {
  return (
    <div style={{
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-primary)',
      padding: '4px 0',
    }}>
      {widths.map((w, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          padding: '16px 20px',
        }}>
          <div className="skeleton" style={{ width: 3, minHeight: 40, borderRadius: 3, flexShrink: 0 }} />
          <div className="skeleton" style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ width: `${w}%`, height: 16 }} />
            <div className="skeleton" style={{ width: `${w - 15}%`, height: 12 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <div className="skeleton" style={{ width: 48, height: 18, borderRadius: 6 }} />
              <div className="skeleton" style={{ width: 60, height: 18, borderRadius: 6 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TodoSkeleton
