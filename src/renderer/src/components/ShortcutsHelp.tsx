import React, { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

const shortcutSections = [
  {
    title: '导航',
    items: [
      { key: 'J / ↓', desc: '下一项' },
      { key: 'K / ↑', desc: '上一项' },
      { key: 'E / Enter', desc: '编辑任务' },
      { key: 'X', desc: '切换完成' },
      { key: 'Del', desc: '删除任务' },
      { key: '?', desc: '快捷键帮助' },
    ],
  },
  {
    title: '操作',
    items: [
      { key: 'N', desc: '新建任务' },
      { key: '⌘K', desc: '命令面板' },
      { key: 'Shift+Enter', desc: '打开完整表单' },
      { key: 'Esc', desc: '关闭弹窗/面板' },
    ],
  },
  {
    title: '视图',
    items: [
      { key: 'Tab', desc: '切换视图模式' },
    ],
  },
]

const ShortcutsHelp: React.FC<Props> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="shortcuts-help-overlay" onClick={onClose}>
      <div className="shortcuts-help-panel" onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            快捷键
          </span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', background: 'transparent',
              borderRadius: 6, cursor: 'pointer', color: 'var(--text-quaternary)',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
        <div className="shortcuts-help-grid">
          {shortcutSections.map(section => (
            <div key={section.title}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-quinary)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                padding: '12px 24px 6px',
              }}>
                {section.title}
              </div>
              {section.items.map(item => (
                <div key={item.key} className="shortcuts-help-row">
                  <span className="shortcuts-help-desc">{item.desc}</span>
                  <span className="shortcuts-help-key">{item.key}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ShortcutsHelp
